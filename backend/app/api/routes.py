from fastapi import APIRouter
from app.schemas import ExplainRequest, ExplainResponse
from app.services.gemini import generate_code_explanation

# Create a router instance instead of a full FastAPI app
router = APIRouter()

@router.get("/")
def root():
    """Health check endpoint to verify the API is running."""
    return {"status": "ok", "message": "Code Explanation Assistant API is running."}

@router.post("/api/explain", response_model=ExplainResponse)
async def explain_code(payload: ExplainRequest):
    """
    Receives code snippets, follow-up messages, or custom prompts, 
    and handles conversational history via Appwrite.
    """
    # Delegate all heavy lifting (prompting, chat memory retrieval, and AI calls) 
    # to the service layer.
    explanation = await generate_code_explanation(
        code=payload.code,
        language=payload.language,
        mode=payload.mode,
        session_id=payload.session_id,
        user_message=payload.user_message,
        custom_prompt=payload.custom_prompt
    )

    # Return the data formatted strictly to our updated Pydantic schema
    return ExplainResponse(
        explanation=explanation,
        mode=payload.mode,
        language=payload.language,
        session_id=payload.session_id
    )