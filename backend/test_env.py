import os
from app.config import settings

print("OS Env:", os.environ.get("GEMINI_API_KEY"))
print("Settings:", settings.GEMINI_API_KEY)
