import os
from pathlib import Path
from dotenv import load_dotenv
from pydantic import BaseModel

# Load .env from backend directory or workspace root
env_path = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(dotenv_path=env_path)

class Settings(BaseModel):
    APP_NAME: str = "Expense Pilot"
    VERSION: str = "2.0.0"
    
    # MongoDB Atlas settings
    MONGODB_URL: str = os.getenv("MONGODB_URL", "")
    MONGODB_DB_NAME: str = os.getenv("MONGODB_DB_NAME", "expensepilot")
    
    # Optional LLM API Keys
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
    GROQ_API_KEY: str = os.getenv("GROQ_API_KEY", "")
    GROQ_MODEL: str = os.getenv("GROQ_MODEL", "qwen/qwen3.8-27b")
    GROK_API_KEY: str = os.getenv("GROK_API_KEY", os.getenv("XAI_API_KEY", ""))
    
    # Mindee Invoice OCR API Key and optional V2 Model ID
    MINDEE_API_KEY: str = os.getenv("MINDEE_API_KEY", "")
    MINDEE_MODEL_ID: str = os.getenv("MINDEE_MODEL_ID", "")
    
    DEFAULT_CURRENCY: str = "₹"
    DEFAULT_USER_ID: str = "user_default"

    # Phone / SMS / WhatsApp Notification Settings
    TWILIO_ACCOUNT_SID: str = os.getenv("TWILIO_ACCOUNT_SID", "")
    TWILIO_AUTH_TOKEN: str = os.getenv("TWILIO_AUTH_TOKEN", "")
    TWILIO_PHONE_NUMBER: str = os.getenv("TWILIO_PHONE_NUMBER", "")
    WHATSAPP_API_TOKEN: str = os.getenv("WHATSAPP_API_TOKEN", "")
    DEFAULT_NOTIFICATION_PHONE: str = os.getenv("DEFAULT_NOTIFICATION_PHONE", "+91 98765 43210")

    @property
    def has_valid_mongo_credentials(self) -> bool:
        return bool(self.MONGODB_URL and "<db_password>" not in self.MONGODB_URL)

settings = Settings()
