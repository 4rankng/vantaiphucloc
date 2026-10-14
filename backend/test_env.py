import os
from app.config import settings

print("OS Env:", os.environ.get("OPENROUTER_API_KEY"))
print("Settings:", settings.OPENROUTER_API_KEY)
print("Model:", settings.OPENROUTER_MODEL)
