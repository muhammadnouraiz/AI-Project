import os
import logging
from fastapi import HTTPException
import google.generativeai as genai
from google.api_core.exceptions import InvalidArgument, ResourceExhausted

# We will create this utility function in the next step!
from app.utils.prompts import build_prompt

logger = logging.getLogger("code-explainer-backend")

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "").strip()

model = None
available_generate_models = []

# --- Initialization & Model Discovery ---
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)

    def _normalize_model_name(name: str) -> str:
        return name if name.startswith("models/") else f"models/{name}"

    discovered_models = []
    try:
        for m in genai.list_models():
            methods = getattr(m, "supported_generation_methods", []) or []
            if "generateContent" in methods and "tts" not in m.name.lower():
                discovered_models.append(m.name)
    except Exception as e:
        logger.warning("Could not list Gemini models at startup (%s): %s", type(e).__name__, str(e))

    preferred_candidates = []
    if GEMINI_MODEL:
        preferred_candidates.append(_normalize_model_name(GEMINI_MODEL))
    preferred_candidates.extend([
        "models/gemini-2.0-flash",
        "models/gemini-1.5-flash",
        "models/gemini-1.5-pro",
    ])

    if discovered_models:
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


# --- Core Service Function ---
async def generate_code_explanation(code: str, language: str, mode: str) -> str:
    """
    Handles the prompt building, Gemini API request, and fallback logic.
    """
    if not GEMINI_API_KEY or model is None:
        error_message = "Server misconfiguration: GEMINI_API_KEY is missing or not loaded from .env"
        logger.error("%s", error_message)
        raise HTTPException(status_code=500, detail=error_message)

    prompt = build_prompt(code=code, language=language, mode=mode)

    try:
        response = None
        used_model = None
        exhausted_errors = []

        # Try preferred model first, fall back on quota exhaustion
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
                    model_name, type(e).__name__, str(e)
                )

        if response is None and exhausted_errors:
            attempted = ", ".join(name for name, _ in exhausted_errors)
            last_error = exhausted_errors[-1][1]
            error_message = f"Gemini quota exhausted across available models ({attempted}). Last error: {str(last_error)}"
            logger.exception(error_message)
            raise HTTPException(status_code=429, detail=error_message)

        if response is None:
            raise HTTPException(status_code=502, detail="Gemini request failed before receiving a response.")

        logger.info("Gemini request succeeded with model: %s", used_model)
        return response.text.strip()

    except InvalidArgument as e:
        error_message = f"Gemini invalid request/auth argument ({type(e).__name__}): {str(e)}"
        logger.exception(error_message)
        raise HTTPException(status_code=400, detail=error_message)
        
    except Exception as e:
        error_message = f"Gemini API error ({type(e).__name__}): {str(e)}"
        logger.exception(error_message)
        raise HTTPException(status_code=502, detail=error_message)