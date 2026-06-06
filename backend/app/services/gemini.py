import os
import logging
from fastapi import HTTPException
import google.generativeai as genai
from google.api_core.exceptions import InvalidArgument, ResourceExhausted

from app.utils.prompts import build_prompt
from app.services.database import get_chat_history, save_chat_history

logger = logging.getLogger("code-explainer-backend")

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
GEMINI_MODEL   = os.getenv("GEMINI_MODEL", "").strip()

model                   = None
available_generate_models: list[str] = []

# ─────────────────────────────────────────────
#  Initialization & Model Discovery
# ─────────────────────────────────────────────
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)

    def _normalize(name: str) -> str:
        return name if name.startswith("models/") else f"models/{name}"

    discovered: list[str] = []
    try:
        for m in genai.list_models():
            methods = getattr(m, "supported_generation_methods", []) or []
            if "generateContent" in methods and "tts" not in m.name.lower():
                discovered.append(m.name)
    except Exception as e:
        logger.warning("Could not list Gemini models at startup (%s): %s", type(e).__name__, e)

    preferred = []
    if GEMINI_MODEL:
        preferred.append(_normalize(GEMINI_MODEL))
    preferred += [
        "models/gemini-2.0-flash",
        "models/gemini-1.5-flash",
        "models/gemini-1.5-pro",
    ]

    if discovered:
        for c in preferred:
            if c in discovered and c not in available_generate_models:
                available_generate_models.append(c)
        for d in discovered:
            if d not in available_generate_models:
                available_generate_models.append(d)
    else:
        available_generate_models = preferred[:]

    chosen = available_generate_models[0] if available_generate_models else None
    try:
        if chosen:
            model = genai.GenerativeModel(chosen)
            logger.info("Gemini primary model  : %s", chosen)
            logger.info("Gemini fallback order : %s", ", ".join(available_generate_models))
    except Exception as e:
        logger.exception("Failed to initialise Gemini model %s: %s", chosen, e)


# ─────────────────────────────────────────────
#  System Instruction
# ─────────────────────────────────────────────
SYSTEM_INSTRUCTION = """You are an expert code assistant embedded in a code-explanation tool.

RULES — follow them on every single reply:

1. NEVER show your reasoning, planning, or intermediate steps.
   Go straight to the answer. Do not write things like
   "* Input code:", "* Task:", "* Constraint:", "Let me think…", etc.

2. Match response length to the question.
   - Yes/no question → one-line answer with a brief reason.
   - Short question  → short answer (a sentence or two).
   - "Explain this"  → structured explanation.
   Never pad with repetition or unnecessary caveats.

3. The code the user pasted at the start of the session is ALWAYS available
   in the conversation history. Never claim you can't see it.

4. Be direct and developer-friendly. Write like a knowledgeable colleague,
   not a textbook. No bullet-point summaries unless they genuinely help."""


# ─────────────────────────────────────────────
#  Helpers
# ─────────────────────────────────────────────
def _build_initial_message(code: str, language: str, mode: str, custom_prompt: str | None) -> str:
    """
    First message that introduces the code to Gemini.
    We embed the code ONCE here so all follow-ups can refer to it without
    re-sending it (the session history keeps it in context).
    """
    fence = "```"
    if mode == "custom" and custom_prompt and custom_prompt.strip():
        return (
            f"Here is a {language} code snippet I'd like you to help me with:\n\n"
            f"{fence}{language}\n{code}\n{fence}\n\n"
            f"{custom_prompt.strip()}"
        )
    return build_prompt(code=code, language=language, mode=mode)


def _build_followup_message(code: str, language: str, user_message: str) -> str:
    """
    Follow-up question.  We still include the code in a collapsible note so
    Gemini has it if history was trimmed, but we do NOT add any metadata that
    Gemini might echo back.
    """
    fence = "```"
    return (
        f"[The {language} code from earlier is reproduced below for reference — "
        f"please do NOT re-state or summarise it, just answer my question.]\n"
        f"{fence}{language}\n{code}\n{fence}\n\n"
        f"{user_message.strip()}"
    )


def _format_history(raw_history: list) -> list[dict]:
    """Convert Appwrite-stored history into Gemini SDK format."""
    formatted = []
    for msg in raw_history:
        try:
            role  = msg.get("role")
            parts = msg.get("parts", [])
            text  = parts[0] if isinstance(parts, list) and parts else str(parts)
            if role and text:
                formatted.append({"role": role, "parts": [{"text": text}]})
        except Exception as err:
            logger.warning("Skipping malformed history entry: %s — %s", msg, err)
    return formatted


# ─────────────────────────────────────────────
#  Core Service Function
# ─────────────────────────────────────────────
async def generate_code_explanation(
    code: str,
    language: str,
    mode: str,
    session_id: str,
    user_message: str | None  = None,
    custom_prompt: str | None = None,
) -> str:
    if not GEMINI_API_KEY or model is None:
        msg = "Server misconfiguration: GEMINI_API_KEY missing or model failed to load."
        logger.error(msg)
        raise HTTPException(status_code=500, detail=msg)

    # 1. Load conversation history
    raw_history      = get_chat_history(session_id)
    formatted_history = _format_history(raw_history)
    logger.info(
        "Session [%s] — history msgs: %d, is_followup: %s",
        session_id, len(formatted_history), bool(user_message and user_message.strip()),
    )

    # 2. Build the message to send
    if user_message and user_message.strip():
        message_to_send = _build_followup_message(code, language, user_message)
        logger.info("Follow-up for session [%s]: %.80s…", session_id, user_message)
    else:
        message_to_send = _build_initial_message(code, language, mode, custom_prompt)
        logger.info("Initial explanation — mode: [%s] session: [%s]", mode, session_id)

    # 3. Send to Gemini with automatic model fallback
    try:
        response        = None
        used_model      = None
        exhausted_errors: list[tuple[str, Exception]] = []

        for model_name in available_generate_models:
            try:
                logger.info("Trying model: %s", model_name)

                active_model = genai.GenerativeModel(
                    model_name,
                    system_instruction=SYSTEM_INSTRUCTION,
                )
                chat = active_model.start_chat(history=formatted_history)
                response = chat.send_message(
                    message_to_send,
                    generation_config=genai.types.GenerationConfig(
                        temperature=0.2,
                        max_output_tokens=2048,
                    ),
                )
                used_model = model_name
                break

            except ResourceExhausted as e:
                exhausted_errors.append((model_name, e))
                logger.warning("Quota exhausted for %s: %s", model_name, e)

        # Propagate quota errors if all models failed
        if response is None and exhausted_errors:
            attempted = ", ".join(n for n, _ in exhausted_errors)
            raise HTTPException(
                status_code=429,
                detail=f"Quota exhausted across all models ({attempted}).",
            )

        if response is None:
            raise HTTPException(status_code=502, detail="Gemini returned no response.")

        logger.info("Gemini succeeded with model: %s", used_model)

        # 4. Persist updated history to Appwrite
        updated_history = []
        for chat_msg in chat.history:
            try:
                updated_history.append({
                    "role":  chat_msg.role,
                    "parts": [chat_msg.parts[0].text],
                })
            except Exception as err:
                logger.warning("Skipping unserializable history entry: %s", err)

        save_chat_history(session_id, code, updated_history)

        return response.text.strip()

    except HTTPException:
        raise

    except InvalidArgument as e:
        msg = f"Gemini invalid argument: {e}"
        logger.exception(msg)
        raise HTTPException(status_code=400, detail=msg)

    except Exception as e:
        msg = f"Gemini API error ({type(e).__name__}): {e}"
        logger.exception(msg)
        raise HTTPException(status_code=502, detail=msg)