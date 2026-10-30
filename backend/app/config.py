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
    
    # AI LLM Provider Settings (Groq / Gemini / OpenAI)
    GROQ_API_KEY: str = os.getenv("GROQ_API_KEY", "")
    GROQ_MODEL: str = os.getenv("GROQ_MODEL", "qwen/qwen3.8-27b")
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
    AI_RISK_API_KEY: str = os.getenv("AI_RISK_API_KEY", "")
    AI_RISK_BASE_URL: str = os.getenv("AI_RISK_BASE_URL", "")
    
    # Birla AI Labs (OAB Forecasting - Yug Engine)
    BIRLA_AI_API_KEY: str = os.getenv("BIRLA_AI_API_KEY", "")
    BIRLA_AI_BASE_URL: str = os.getenv("BIRLA_AI_BASE_URL", "https://api.oab-forecasting.com")
    BIRLA_AI_MODEL: str = os.getenv("BIRLA_AI_MODEL", "yug")
    
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
