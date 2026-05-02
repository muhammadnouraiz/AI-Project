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
    Receives code snippets and returns an AI-generated explanation.
    """
    # Delegate all the heavy lifting (prompting, AI calls, fallback logic) 
    # to the dedicated service layer.
    explanation = await generate_code_explanation(
        code=payload.code,
        language=payload.language,
        mode=payload.mode
    )

    # Return the data formatted strictly to our Pydantic schema
    return ExplainResponse(
        explanation=explanation,
        mode=payload.mode,
        language=payload.language,
    )