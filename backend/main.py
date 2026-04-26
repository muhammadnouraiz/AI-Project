import os
import logging
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, validator
from dotenv import load_dotenv
import google.generativeai as genai
from google.api_core.exceptions import InvalidArgument, ResourceExhausted

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
)
logger = logging.getLogger("code-explainer-backend")

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "").strip()
model = None
available_generate_models = []
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)

    def _normalize_model_name(name: str) -> str:
        return name if name.startswith("models/") else f"models/{name}"

    discovered_models = []
    try:
        for m in genai.list_models():
            methods = getattr(m, "supported_generation_methods", []) or []
            # NEW: Make sure it supports generation AND is not a text-to-speech model
            if "generateContent" in methods and "tts" not in m.name.lower():
                discovered_models.append(m.name)
    except Exception as e:
        logger.warning("Could not list Gemini models at startup (%s): %s", type(e).__name__, str(e))

    preferred_candidates = []
    if GEMINI_MODEL:
        preferred_candidates.append(_normalize_model_name(GEMINI_MODEL))
    preferred_candidates.extend(
        [
            "models/gemini-2.0-flash",
            "models/gemini-1.5-flash",
            "models/gemini-1.5-pro",
        ]
    )

    if discovered_models:
        # Keep a deterministic preference order and include remaining discovered models as fallbacks.
        for candidate in preferred_candidates:
            if candidate in discovered_models and candidate not in available_generate_models:
                available_generate_models.append(candidate)

        for discovered in discovered_models:
            if discovered not in available_generate_models:
                available_generate_models.append(discovered)
    else:
        available_generate_models = preferred_candidates[:]

    chosen_model_name = available_generate_models[0] if available_generate_models else None

    try:
        if chosen_model_name:
            model = genai.GenerativeModel(chosen_model_name)
            logger.info("Using Gemini model: %s", chosen_model_name)
            logger.info("Gemini fallback order: %s", ", ".join(available_generate_models))
    except Exception as e:
        logger.exception("Failed to initialize Gemini model %s: %s", chosen_model_name, str(e))
        model = None

app = FastAPI(
    title="Code Explanation Assistant API",
    description="FastAPI backend that uses Google Gemini to explain code snippets.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

VALID_MODES = {"line_by_line", "step_by_step", "summary"}


class ExplainRequest(BaseModel):
    code: str
    language: str = "Auto-Detect"
    mode: str = "line_by_line"

    @validator("code")
    def code_must_not_be_empty(cls, v):
        if not v.strip():
            raise ValueError("code must not be empty.")
        if len(v) > 15000:
            raise ValueError("code exceeds the maximum allowed length of 15,000 characters.")
        return v.strip()

    @validator("mode")
    def mode_must_be_valid(cls, v):
        if v not in VALID_MODES:
            raise ValueError(f"mode must be one of: {', '.join(VALID_MODES)}")
        return v

    @validator("language")
    def language_must_not_be_empty(cls, v):
        if not v.strip():
            return "Auto-Detect"
        return v.strip()


class ExplainResponse(BaseModel):
    explanation: str
    mode: str
    language: str


def build_prompt(code: str, language: str, mode: str) -> str:
    lang_label = "the" if language == "Auto-Detect" else f"the {language}"
    lang_hint = "" if language == "Auto-Detect" else f" written in {language}"

    if mode == "line_by_line":
        return f"""You are an expert software engineering tutor helping students and junior developers understand code.

Your task is to produce a LINE-BY-LINE explanation of {lang_label} code below{lang_hint}.

Rules:
- Work through the code sequentially from top to bottom.
- Number each explanation item to match the corresponding line or logical block.
- For each item, state in plain English what the line does and why it exists.
- If a line uses a notable programming concept (recursion, list comprehension, inheritance, etc.), name and briefly define that concept.
- If you detect a bug or error, you MUST show both the incorrect code and the corrected code inline, immediately next to each other.
- Use this exact format for each bug you mention: <span style='color: red; text-decoration: line-through;'>WRONG_SNIPPET</span> <span style='color: green; font-weight: bold;'>[FIX: CORRECT_SNIPPET]</span>
- Highlight only the minimal buggy snippet (not entire paragraphs).
- If no bug is detected, do not output any [FIX: ...] block.
- Keep each explanation concise: one to three sentences per item.
- Do not add any introductory or closing remarks. Output only the numbered explanation list.
- Write for a reader who understands basic programming but may not know this language well.

Code:
```
{code}
```"""

    if mode == "step_by_step":
        return f"""You are an expert software engineering tutor helping students and junior developers understand code.

Your task is to produce a STEP-BY-STEP LOGIC explanation of {lang_label} code below{lang_hint}.

Rules:
- Do not reference individual line numbers. Focus on logical phases instead.
- Structure your response as clearly labelled steps (e.g., Step 1: Input Validation, Step 2: Initialization, etc.).
- For each step, explain the purpose of that phase, what inputs it uses, what it produces, and why it is necessary.
- After the steps, add a short "Key Concepts Used" section listing any important programming techniques present in the code (e.g., recursion, memoisation, object-oriented design).
- If you detect a bug or error, you MUST show both the incorrect code and the corrected code inline, immediately next to each other.
- Use this exact format for each bug you mention: <span style='color: red; text-decoration: line-through;'>WRONG_SNIPPET</span> <span style='color: green; font-weight: bold;'>[FIX: CORRECT_SNIPPET]</span>
- Highlight only the minimal buggy snippet (not entire paragraphs).
- If no bug is detected, do not output any [FIX: ...] block.
- Write in plain, direct English. Avoid jargon unless you define it immediately.
- Do not add any introductory or closing remarks beyond the steps themselves.

Code:
```
{code}
```"""

    if mode == "summary":
        return f"""You are an expert software engineering tutor helping students and junior developers understand code.

Your task is to produce a HIGH-LEVEL SUMMARY of {lang_label} code below{lang_hint}.

Rules:
- Write a single, well-structured summary of three to five paragraphs.
- Paragraph 1: State clearly what the code does in one or two sentences, as if explaining to someone who has never seen it.
- Paragraph 2: Describe the overall approach or algorithm used, without referencing individual lines.
- Paragraph 3: Mention any notable design decisions, trade-offs, or assumptions baked into the code.
- Optional Paragraph 4: Note any obvious limitations, edge cases the code does not handle, or potential improvements.
- If you detect a bug or error, you MUST show both the incorrect code and the corrected code inline, immediately next to each other.
- Use this exact format for each bug you mention: <span style='color: red; text-decoration: line-through;'>WRONG_SNIPPET</span> <span style='color: green; font-weight: bold;'>[FIX: CORRECT_SNIPPET]</span>
- Highlight only the minimal buggy snippet (not entire paragraphs).
- If no bug is detected, do not output any [FIX: ...] block.
- Do not use bullet points. Write in clean, readable prose.
- Do not add any introductory phrase like "Sure!" or "Here is a summary". Go directly into the content.

Code:
```
{code}
```"""


@app.get("/")
def root():
    return {"status": "ok", "message": "Code Explanation Assistant API is running."}


@app.post("/api/explain", response_model=ExplainResponse)
async def explain_code(payload: ExplainRequest):
    if not GEMINI_API_KEY or model is None:
        error_message = "Server misconfiguration: GEMINI_API_KEY is missing or not loaded from .env"
        logger.error("%s", error_message)
        raise HTTPException(status_code=500, detail=error_message)

    prompt = build_prompt(
        code=payload.code,
        language=payload.language,
        mode=payload.mode,
    )

    try:
        response = None
        used_model = None
        exhausted_errors = []

        # Try the preferred model first, then fall back to other generateContent-capable models on quota exhaustion.
        for model_name in available_generate_models:
            try:
                logger.info("Attempting Gemini request with model: %s", model_name)
                candidate_model = model if model_name == available_generate_models[0] else genai.GenerativeModel(model_name)
                response = candidate_model.generate_content(
                    prompt,
                    generation_config=genai.types.GenerationConfig(
                        temperature=0.2,
                        max_output_tokens=2048,
                    ),
                )
                used_model = model_name
                break
            except ResourceExhausted as e:
                exhausted_errors.append((model_name, e))
                logger.warning(
                    "Quota exhausted for model %s (%s): %s",
                    model_name,
                    type(e).__name__,
                    str(e),
                )

        if response is None and exhausted_errors:
            attempted = ", ".join(name for name, _ in exhausted_errors)
            last_error = exhausted_errors[-1][1]
            error_message = (
                f"Gemini quota exhausted across available models ({attempted}). "
                f"Last error: {str(last_error)}"
            )
            logger.exception(error_message)
            raise HTTPException(status_code=429, detail=error_message)

        if response is None:
            raise HTTPException(status_code=502, detail="Gemini request failed before receiving a response.")

        logger.info("Gemini request succeeded with model: %s", used_model)
        explanation = response.text.strip()
    except InvalidArgument as e:
        error_message = f"Gemini invalid request/auth argument ({type(e).__name__}): {str(e)}"
        logger.exception(error_message)
        raise HTTPException(status_code=400, detail=error_message)
    except Exception as e:
        error_message = f"Gemini API error ({type(e).__name__}): {str(e)}"
        logger.exception(error_message)
        raise HTTPException(
            status_code=502,
            detail=error_message,
        )

    return ExplainResponse(
        explanation=explanation,
        mode=payload.mode,
        language=payload.language,
    )
