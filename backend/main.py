import sys
import os

# 1. Get the absolute path of the 'backend' directory where this file lives
current_dir = os.path.dirname(os.path.abspath(__file__))

# 2. Add this directory to Python's path so it can successfully find the 'app' folder
if current_dir not in sys.path:
    sys.path.append(current_dir)

# 3. Now import the app safely
from app.main import app