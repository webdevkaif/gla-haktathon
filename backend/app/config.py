import os
from pathlib import Path
from dotenv import load_dotenv
from pydantic import BaseModel

# Load .env from backend directory or workspace root
env_path = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(dotenv_path=env_path)

class Settings(BaseModel):
    APP_NAME: str = "ExpensePilot AI"
    VERSION: str = "1.0.0"
    
    # MongoDB Atlas settings
    MONGODB_URL: str = os.getenv(
        "MONGODB_URL", 
        "mongodb+srv://mohammadkaif999753_db_user:<db_password>@cluster0.cllnh1c.mongodb.net/?retryWrites=true&w=majority"
    )
    MONGODB_DB_NAME: str = os.getenv("MONGODB_DB_NAME", "expensepilot")
    
    # Optional LLM API Keys
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
    
    DEFAULT_CURRENCY: str = "₹"
    DEFAULT_USER_ID: str = "user_default"

    @property
    def has_valid_mongo_credentials(self) -> bool:
        return bool(self.MONGODB_URL and "<db_password>" not in self.MONGODB_URL)

settings = Settings()
