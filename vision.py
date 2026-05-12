#!/usr/bin/env python3
"""Image OCR & query via Gemini API directly."""

import sys
import base64
import json
import httpx
from pathlib import Path

GEMINI_API_KEY = ""
# Load key from ~/.hermes/.env
env_path = Path.home() / ".hermes" / ".env"
for line in env_path.read_text().splitlines():
    if line.startswith("GEMINI_API_KEY=") and not line.startswith("#"):
        GEMINI_API_KEY = line.split("=", 1)[1].strip()

if not GEMINI_API_KEY:
    print("ERROR: No GEMINI_API_KEY found in ~/.hermes/.env")
    sys.exit(1)

MODEL = "gemini-2.5-flash"
BASE_URL = "https://generativelanguage.googleapis.com/v1beta"


def load_image(source: str) -> tuple[str, str]:
    """Load image from URL or file path. Returns (base64_data, mime_type)."""
    if source.startswith(("http://", "https://")):
        resp = httpx.get(source, timeout=30, follow_redirects=True)
        resp.raise_for_status()
        data = resp.content
        ct = resp.headers.get("content-type", "image/png")
        mime = ct.split(";")[0].strip()
    else:
        p = Path(source).expanduser()
        if not p.is_file():
            raise FileNotFoundError(f"Not found: {p}")
        data = p.read_bytes()
        ext = p.suffix.lower()
        mime = {".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
                ".gif": "image/gif", ".webp": "image/webp"}.get(ext, "image/png")
    return base64.b64encode(data).decode(), mime


def analyze(image_source: str, question: str, model: str = MODEL) -> str:
    b64, mime = load_image(image_source)
    url = f"{BASE_URL}/models/{model}:generateContent?key={GEMINI_API_KEY}"
    payload = {
        "contents": [{"role": "user", "parts": [
            {"text": question},
            {"inlineData": {"mimeType": mime, "data": b64}},
        ]}],
        "generationConfig": {"maxOutputTokens": 4096},
    }
    resp = httpx.post(url, json=payload, headers={"Content-Type": "application/json"}, timeout=60)
    if resp.status_code != 200:
        return f"ERROR {resp.status_code}: {resp.text[:500]}"
    data = resp.json()
    parts = (data.get("candidates") or [{}])[0].get("content", {}).get("parts", [])
    texts = [p["text"] for p in parts if "text" in p and not p.get("thought")]
    return "\n".join(texts) or "(no text in response)"


if __name__ == "__main__":
    if len(sys.argv) < 3:
        print(f"Usage: {sys.argv[0]} <image_url_or_path> <question>")
        print(f"   or: {sys.argv[0]} <image_url_or_path> ocr")
        sys.exit(1)

    img = sys.argv[1]
    q = sys.argv[2] if sys.argv[2] != "ocr" else "Extract ALL text from this image. Output the text exactly as it appears, preserving layout and structure."
    print(analyze(img, q))
