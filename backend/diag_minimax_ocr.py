"""Standalone MiniMax OCR diagnostic (NOT a pytest test).

Generates a synthetic container image and calls the MiniMax vision client
directly to confirm the OpenAI-compatible endpoint accepts image_url + base64
vision for MiniMax-M3. Prints the raw HTTP status/body on failure.

Run:  .venv/bin/python diag_minimax_ocr.py
"""

from __future__ import annotations

import io

import httpx
from PIL import Image, ImageDraw, ImageFont

from app.config import settings
from app.contexts.operations.infrastructure.minimax import call_minimax_vision
from app.contexts.operations.infrastructure.ocr import (
    MULTI_CONTAINER_PROMPT,
    _auto_correct_numbers,
    _parse_numbers_from_response,
    extract_container_numbers,
)

CONTAINER_NUMBER = "MSKU1234565"


def _make_image(number: str) -> bytes:
    """Paint a large container number on a light card so a VLM can read it."""
    img = Image.new("RGB", (900, 300), (245, 245, 240))
    draw = ImageDraw.Draw(img)
    # Try common macOS fonts, fall back to PIL default.
    for path in (
        "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
        "/System/Library/Fonts/Helvetica.ttc",
    ):
        try:
            font = ImageFont.truetype(path, 110)
            break
        except OSError:
            continue
    else:
        font = ImageFont.load_default()
    # Dark text, container-style (4 letters + 7 digits).
    text = f"{number[:4]}  {number[4:]}"
    bbox = draw.textbbox((0, 0), text, font=font)
    w, h = bbox[2] - bbox[0], bbox[3] - bbox[1]
    draw.text(
        ((900 - w) / 2 - bbox[0], (300 - h) / 2 - bbox[1]),
        text,
        fill=(20, 20, 20),
        font=font,
    )
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=95)
    return buf.getvalue()


def main() -> None:
    print("=== MiniMax OCR config ===")
    print(f"  MINIMAX_ENABLE : {settings.MINIMAX_ENABLE}")
    print(
        f"  MINIMAX_API_KEY: {'set (len=' + str(len(settings.MINIMAX_API_KEY)) + ')' if settings.MINIMAX_API_KEY else 'EMPTY'}"
    )
    print(f"  MINIMAX_BASE_URL: {settings.MINIMAX_BASE_URL}")
    print(f"  MINIMAX_MODEL  : {settings.MINIMAX_MODEL}")
    print(
        f"  GEMINI_ENABLE  : {settings.GEMINI_ENABLE} (expected False while testing MiniMax only)"
    )

    if not (settings.MINIMAX_ENABLE and settings.MINIMAX_API_KEY):
        print("\nMiniMax not enabled / no key — aborting.")
        return

    import asyncio

    asyncio.run(_run())


async def _run() -> None:
    """Run both checks on a single event loop (the httpx singleton is loop-bound)."""
    image = _make_image(CONTAINER_NUMBER)
    print(f"\nGenerated synthetic image with number: {CONTAINER_NUMBER}")

    print("\n=== 1) Direct call_minimax_vision() ===")
    res = await call_minimax_vision(MULTI_CONTAINER_PROMPT, image, "image/jpeg")
    print(f"  success : {res['success']}")
    print(f"  provider: {res.get('provider')}")
    print(f"  model   : {res.get('model')}")
    print(f"  error   : {res.get('error')}")
    print(f"  text    : {(res.get('text') or '')[:300]}")

    if res["success"]:
        parsed = _parse_numbers_from_response(res["text"])
        corrected = _auto_correct_numbers([n for n in parsed])
        print(f"  parsed   : {parsed}")
        print(f"  corrected: {corrected}")
    else:
        # Surface the exact MiniMax error body for diagnosis.
        print("\n=== raw request (for diagnosis) ===")
        import base64

        b64 = base64.b64encode(image).decode()
        url = f"{settings.MINIMAX_BASE_URL.rstrip('/')}/chat/completions"
        payload = {
            "model": settings.MINIMAX_MODEL,
            "temperature": 0,
            "max_tokens": 2048,
            "messages": [
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": "What text is in this image? Reply with the text only.",
                        },
                        {
                            "type": "image_url",
                            "image_url": {"url": f"data:image/jpeg;base64,{b64}"},
                        },
                    ],
                }
            ],
        }
        try:
            r = httpx.post(
                url,
                json=payload,
                headers={
                    "Authorization": f"Bearer {settings.MINIMAX_API_KEY}",
                    "Content-Type": "application/json",
                },
                timeout=60.0,
            )
            print(f"  HTTP {r.status_code}")
            print(f"  body: {r.text[:800]}")
        except Exception as e:
            print(f"  raw request error: {type(e).__name__}: {e}")

    print("\n=== 2) Full extract_container_numbers() (shows provider used) ===")
    out = await extract_container_numbers(image, "image/jpeg")
    print(f"  success : {out['success']}")
    print(f"  provider: {out.get('provider')}")
    print(f"  numbers : {out.get('container_numbers')}")
    print(f"  error   : {out.get('error')}")


if __name__ == "__main__":
    main()
