import os
import logging
from fastapi import HTTPException
import google.generativeai as genai
from google.api_core.exceptions import InvalidArgument, ResourceExhausted

from app.utils.prompts import build_prompt
from app.services.database import get_chat_history, save_chat_history

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
async def generate_code_explanation(
    code: str,
    language: str,
    mode: str,
    session_id: str,
    user_message: str = None,
    custom_prompt: str = None
) -> str:
    if not GEMINI_API_KEY or model is None:
        error_message = "Server misconfiguration: GEMINI_API_KEY is missing or not loaded from .env"
        logger.error("%s", error_message)
        raise HTTPException(status_code=500, detail=error_message)

    # 1. Fetch past conversation from Appwrite
    raw_history = get_chat_history(session_id)
    logger.info(
        "Session [%s] — history length: %d, is_followup: %s",
        session_id, len(raw_history), bool(user_message)
    )

    # 2. Map history into Gemini SDK format
    formatted_history = []
    for msg in raw_history:
        try:
            role = msg.get("role")
            parts = msg.get("parts", [])

            # Normalise parts — could be a list of strings or a bare string
            if isinstance(parts, list):
                text = parts[0] if parts else ""
            else:
                text = str(parts)

            # ✅ Gemini requires parts as dicts: {"text": "..."}, NOT bare strings
            if role and text:
                formatted_history.append({
                    "role": role,
                    "parts": [{"text": text}]
                })
        except Exception as parse_err:
            logger.warning("Skipping malformed history entry: %s — %s", msg, parse_err)
            continue

    # 3. Decide what message to send
    if user_message and user_message.strip():
        message_to_send = user_message.strip()
        logger.info("Follow-up message for session [%s]", session_id)
    else:
        if mode == "custom" and custom_prompt and custom_prompt.strip():
            fence = chr(96) * 3
            message_to_send = (
                f"Language: {language}\n\n"
                f"Code Provided:\n{fence}\n{code}\n{fence}\n\n"
                f"User custom instruction: {custom_prompt}"
            )
        else:
            message_to_send = build_prompt(code=code, language=language, mode=mode)
        logger.info("Fresh explanation — mode: [%s] session: [%s]", mode, session_id)

    # 4. Loop through available models with fallback
    try:
        response = None
        used_model = None
        exhausted_errors = []

        for model_name in available_generate_models:
            try:
                logger.info("Attempting Gemini request with model: %s", model_name)

                active_model = (
                    model if model_name == available_generate_models[0]
                    else genai.GenerativeModel(model_name)
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
                logger.warning(
                    "Quota exhausted for model %s (%s): %s",
                    model_name, type(e).__name__, str(e)
                )

        if response is None and exhausted_errors:
            attempted = ", ".join(name for name, _ in exhausted_errors)
            last_error = exhausted_errors[-1][1]
            raise HTTPException(
                status_code=429,
                detail=f"Quota exhausted across models ({attempted}). Last error: {str(last_error)}"
            )

        if response is None:
            raise HTTPException(status_code=502, detail="Gemini request failed before receiving a response.")

        logger.info("Gemini succeeded with model: %s", used_model)

        # 5. Serialise updated history — store parts as plain strings in Appwrite
        updated_history = []
        for chat_msg in chat.history:
            try:
                updated_history.append({
                    "role": chat_msg.role,
                    "parts": [chat_msg.parts[0].text]  # plain string for storage
                })
            except Exception as serial_err:
                logger.warning("Skipping unserializable chat message: %s", serial_err)
                continue

        # 6. Persist to Appwrite
        save_chat_history(session_id, code, updated_history)

        return response.text.strip()

    except HTTPException:
        raise

    except InvalidArgument as e:
        error_message = f"Gemini invalid argument ({type(e).__name__}): {str(e)}"
        logger.exception(error_message)
        raise HTTPException(status_code=400, detail=error_message)

    except Exception as e:
        error_message = f"Gemini API error ({type(e).__name__}): {str(e)}"
        logger.exception(error_message)
        raise HTTPException(status_code=502, detail=error_message)