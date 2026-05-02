from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Importing config runs the load_dotenv() and logging setup automatically
import app.config 

# Import our router that contains all the endpoints
from app.api import api_router

app = FastAPI(
    title="Code Explanation Assistant API",
    description="FastAPI backend that uses Google Gemini to explain code snippets.",
    version="2.0.0", # Bumped to 2.0 for your new architecture!
)

# Set up CORS for your frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Attach the routes we built in app/api/routes.py
app.include_router(api_router)