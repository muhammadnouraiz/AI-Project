import logging
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Configure global logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
)