import os
import json
import logging
from appwrite.client import Client
from appwrite.services.databases import Databases
from appwrite.exception import AppwriteException

logger = logging.getLogger("code-explainer-backend")

ENDPOINT = os.getenv("APPWRITE_ENDPOINT", "https://cloud.appwrite.io/v1")
PROJECT_ID = os.getenv("APPWRITE_PROJECT_ID")
API_KEY = os.getenv("APPWRITE_API_KEY")
DATABASE_ID = os.getenv("APPWRITE_DATABASE_ID")
COLLECTION_ID = os.getenv("APPWRITE_COLLECTION_ID")

MAX_HISTORY_CHARS = 12_000

client = Client()
if PROJECT_ID and API_KEY:
    client.set_endpoint(ENDPOINT)
    client.set_project(PROJECT_ID)
    client.set_key(API_KEY)

databases = Databases(client)


def _extract_field(document, field: str, default=""):
    """Safely extract a field from an Appwrite Document object or dict."""
    # New SDK returns a Pydantic model — use attribute access
    if hasattr(document, field):
        return getattr(document, field) or default
    # Fallback for dict-like responses
    if hasattr(document, "get"):
        return document.get(field, default) or default
    return default


def get_chat_history(session_id: str) -> list:
    """Fetches the chat history for a given session from Appwrite."""
    if not PROJECT_ID:
        return []

    try:
        document = databases.get_document(
            database_id=DATABASE_ID,
            collection_id=COLLECTION_ID,
            document_id=session_id
        )

        # ✅ Use attribute access, not .get()
        raw = _extract_field(document, "chat_history", "[]")

        if not raw or raw.strip() == "":
            return []

        return json.loads(raw)

    except AppwriteException as e:
        if e.code == 404:
            return []  # New session, totally normal
        logger.error("Appwrite read error (session: %s): %s", session_id, e.message)
        return []

    except json.JSONDecodeError as e:
        logger.error("Failed to parse chat_history JSON (session: %s): %s", session_id, str(e))
        return []

    except Exception as e:
        logger.error("Unexpected error in get_chat_history (session: %s): %s", session_id, str(e))
        return []


def save_chat_history(session_id: str, code_snippet: str, history: list):
    """Saves or updates the chat history in Appwrite."""
    if not PROJECT_ID:
        return

    history_str = json.dumps(history)

    # Trim oldest pairs if history is too large for Appwrite Text field
    while len(history_str) > MAX_HISTORY_CHARS and len(history) > 2:
        history = history[2:]  # Drop oldest user+model pair
        history_str = json.dumps(history)
        logger.warning("Trimmed chat history for session: %s", session_id)

    try:
        try:
            databases.update_document(
                database_id=DATABASE_ID,
                collection_id=COLLECTION_ID,
                document_id=session_id,
                data={"chat_history": history_str}
            )
            logger.info("Updated chat history for session: %s", session_id)

        except AppwriteException as e:
            if e.code == 404:
                databases.create_document(
                    database_id=DATABASE_ID,
                    collection_id=COLLECTION_ID,
                    document_id=session_id,
                    data={
                        "session_id": session_id,
                        "code_snippet": code_snippet,
                        "chat_history": history_str
                    }
                )
                logger.info("Created chat document for session: %s", session_id)
            else:
                raise

    except Exception as e:
        # Don't crash the request — explanation already succeeded
        logger.error("Appwrite write error (session: %s): %s", session_id, str(e))