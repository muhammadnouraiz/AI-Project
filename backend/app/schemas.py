from pydantic import BaseModel, validator
from app.utils.prompts import VALID_MODES

class ExplainRequest(BaseModel):
    """
    The expected incoming payload from the frontend.
    """
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
    """
    The structured response sent back to the frontend.
    """
    explanation: str
    mode: str
    language: str