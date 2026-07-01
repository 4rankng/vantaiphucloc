#!/usr/bin/env python3
"""
compare_ocr.py — Side-by-side OCR comparison: PaddleOCR PP-OCRv5 vs Qwen-VL models.

Run:
    python backend/scripts/compare_ocr.py <path-to-image>
    python backend/scripts/compare_ocr.py photo.jpg --env backend/.env
    python backend/scripts/compare_ocr.py photo.jpg --paddle-only
    python backend/scripts/compare_ocr.py photo.jpg --qwen-only
    python backend/scripts/compare_ocr.py photo.jpg --no-235b

Shows detected text lines, extracted container numbers, and ISO 6346
check-digit validity for each engine. Saves a JSON dump next to the image.

Engines: PaddleOCR PP-OCRv5, Qwen-VL-32B, Qwen-VL-235B-A22B (default on).

Standalone — zero backend app imports. Reads OPENROUTER_API_KEY from the
project .env file so the Qwen-VL call matches prod exactly.

Dependencies:
    pip install paddlepaddle paddleocr opencv-python-headless httpx Pillow
    # Optional for HEIC images:
    pip install pillow-heif
"""

from __future__ import annotations

import argparse
import base64
import io
import json
import os
import re
import sys
import textwrap
import time
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

# ---------------------------------------------------------------------------
# Graceful imports — print install hints but never hard-crash
# ---------------------------------------------------------------------------

_MISSING: dict[str, str] = {}


def _try_import(name: str, pip: str) -> Any:
    """Attempt to import *name*; on failure record a hint and return None."""
    try:
        return __import__(name)
    except ImportError:
        _MISSING[name.split(".")[0]] = pip
        return None


np = _try_import("numpy", "pip install numpy")
Image = _try_import("PIL.Image", "pip install Pillow")
ImageOps = _try_import("PIL.ImageOps", "pip install Pillow") if Image else None
httpx = _try_import("httpx", "pip install httpx")

# ---------------------------------------------------------------------------
# Constants — replicated from prod (standalone, zero app imports)
# ---------------------------------------------------------------------------

# Container-number regex — strict ISO 6346 (ocr.py:89)
_CONTAINER_RE = re.compile(r"[A-Z]{4}\d{7}")

# Loose regex that catches LLM hallucinated extra digits (e.g. 14-char "OOCU9217154561")
_CONTAINER_LOOSE_RE = re.compile(r"[A-Z]{4}\d{7,}")

# Multi-container extraction prompt (ocr.py:73-85)
MULTI_CONTAINER_PROMPT = textwrap.dedent(
    """\
Role: You are an expert logistics OCR assistant specializing in shipping \
containers. Examine the provided image and extract all standard ISO \
shipping container numbers.

Extraction Rules:
Format: A valid container number ALWAYS consists of exactly 4 uppercase \
letters followed by exactly 7 digits (e.g., MSKU1234567 or ALLU5216535).
Layout: The letters and digits may be separated by spaces, dashes, or \
printed across multiple lines. Concatenate them into a single, continuous \
11-character alphanumeric string without spaces.
Exclusions: Strictly ignore ISO size/type codes (e.g., 22G1, 45G1, 42G1), \
company names, and weight/capacity specifications (e.g., MAX GW, TARE, NET, \
CU CAP, KG, LB).
Common Errors: Pay close attention to characters that look similar (e.g., \
distinguish the letter O from the number 0, the letter Q from O, and the \
letter S from the number 5). Remember: the first 4 characters are always \
letters, and the last 7 are always numbers.

Output: Return ONLY a clean JSON array containing the recognized container \
numbers. Do not include any conversational text. Example: \
{"container_numbers": ["ALLU5216535", "LSQU1077376"]}"""
)

# ISO 6346 letter → value mapping (iso6346.py:24-76)
LETTER_MAP: dict[str, int] = {
    "A": 10, "B": 12, "C": 13, "D": 14, "E": 15, "F": 16,
    "G": 17, "H": 18, "I": 19, "J": 20, "K": 21, "L": 23,
    "M": 24, "N": 25, "O": 26, "P": 27, "Q": 28, "R": 29,
    "S": 30, "T": 31, "U": 32, "V": 34, "W": 35, "X": 36,
    "Y": 37, "Z": 38,
}
POWERS_2 = [1, 2, 4, 8, 16, 32, 64, 128, 256, 512]

# OpenRouter defaults (config.py:122-126)
DEFAULT_OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1"
DEFAULT_OPENROUTER_MODEL = "qwen/qwen3-vl-32b-instruct"
OPENROUTER_MODEL_235B = "qwen/qwen3-vl-235b-a22b-instruct"

# ---------------------------------------------------------------------------
# Utilities
# ---------------------------------------------------------------------------


def load_dotenv(path: str) -> dict[str, str]:
    """Minimal .env parser (no third-party deps)."""
    env: dict[str, str] = {}
    p = Path(path)
    if not p.is_file():
        return env
    for line in p.read_text("utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        key, sep, value = line.partition("=")
        if sep:
            env[key.strip()] = value.strip().strip("\"'")
    return env


def preprocess_image(image_bytes: bytes) -> tuple[bytes, str]:
    """Same as prod preprocess_image (ai.py:34-60). Returns (jpeg_bytes, 'image/jpeg')."""
    if Image is None:
        return image_bytes, "image/jpeg"
    try:
        img = Image.open(io.BytesIO(image_bytes))
        if img.mode not in ("RGB", "L"):
            img = img.convert("RGB")
        try:
            if ImageOps:
                img = ImageOps.autocontrast(img, cutoff=1)
        except Exception:
            pass
        max_dim = 2048
        if max(img.size) > max_dim:
            img.thumbnail((max_dim, max_dim), Image.Resampling.LANCZOS)
        buf = io.BytesIO()
        img.save(buf, format="JPEG", quality=95)
        return buf.getvalue(), "image/jpeg"
    except Exception:
        return image_bytes, "image/jpeg"


def bytes_to_numpy(image_bytes: bytes):
    """Decode image bytes to numpy array (tries cv2, then PIL fallback)."""
    if np is not None:
        try:
            import cv2

            arr = np.frombuffer(image_bytes, np.uint8)
            img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
            if img is not None:
                return img
        except ImportError:
            pass
    if Image is not None:
        return np.array(Image.open(io.BytesIO(image_bytes)).convert("RGB"))
    raise RuntimeError("Need numpy + opencv or numpy + Pillow to decode images")


def parse_numbers(text: str) -> list[str]:
    """Extract container numbers from text — JSON first, then regex (ocr.py:92-113)."""
    try:
        data = json.loads(text)
        if isinstance(data, dict) and "container_numbers" in data:
            nums = data["container_numbers"]
            if isinstance(nums, list):
                return [
                    str(n).upper().strip()
                    for n in nums
                    if isinstance(n, (str, int))
                    and _CONTAINER_RE.fullmatch(str(n).upper())
                ]
    except (json.JSONDecodeError, TypeError):
        pass
    cleaned = re.sub(r"[`\"'\n\r]", "", text).strip().upper()
    if cleaned == "NONE":
        return []
    return list(dict.fromkeys(_CONTAINER_RE.findall(cleaned)))


def calculate_check_digit(body: str) -> int:
    """ISO 6346 check-digit for the 10-char body (iso6346.py:77-117)."""
    body = body.upper().replace("-", "").replace(" ", "")
    if len(body) != 10:
        raise ValueError(f"Need 10 chars, got {len(body)}")
    total = 0
    for i, ch in enumerate(body):
        if i < 4:
            if ch not in LETTER_MAP:
                raise ValueError(f"Invalid letter: {ch}")
            val = LETTER_MAP[ch]
        else:
            if not ch.isdigit():
                raise ValueError(f"Invalid digit: {ch}")
            val = int(ch)
        total += val * POWERS_2[i]
    cd = total % 11
    return 0 if cd == 10 else cd


def validate_check_digit(number: str) -> bool:
    """Validate ISO 6346 check-digit (iso6346.py:120-143)."""
    n = number.upper().replace("-", "").replace(" ", "")
    if len(n) != 11:
        return False
    try:
        expected = calculate_check_digit(n[:10])
    except (ValueError, KeyError):
        return False
    return int(n[10]) == expected


def strip_think(text: str) -> str:
    """Remove 💭 reasoning blocks from Qwen3-VL responses (openrouter.py:40-45)."""
    cleaned = re.sub(r"💭.*?💭", "", text, flags=re.DOTALL | re.IGNORECASE)
    cleaned = re.sub(r"💭.*", "", cleaned, flags=re.DOTALL | re.IGNORECASE)
    return cleaned.strip()


def strip_json_fences(text: str) -> str:
    """Remove ```json ... ``` fences that some models wrap around JSON."""
    return re.sub(r"```(?:json)?\s*", "", text).rstrip("`").strip()


# ---------------------------------------------------------------------------
# Result data class
# ---------------------------------------------------------------------------


@dataclass
class OCRResult:
    engine: str
    model: str | None = None
    text_lines: list[str] = field(default_factory=list)
    scores: list[float] = field(default_factory=list)
    raw_response: str | None = None
    container_numbers: list[str] = field(default_factory=list)
    check_digit_valid: dict[str, bool] = field(default_factory=dict)
    latency_s: float = 0.0
    error: str | None = None

    @property
    def success(self) -> bool:
        return self.error is None


# ---------------------------------------------------------------------------
# PaddleOCR PP-OCRv5 engine
# ---------------------------------------------------------------------------

_paddle_engine = None


def run_paddle(image_bytes: bytes) -> OCRResult:
    """Run PaddleOCR PP-OCRv5 on preprocessed image bytes."""
    res = OCRResult(engine="PaddleOCR PP-OCRv5")
    try:
        import paddleocr as _mod
    except ImportError:
        res.error = "paddleocr not installed — pip install paddlepaddle paddleocr"
        return res

    img = bytes_to_numpy(image_bytes)
    t0 = time.time()

    global _paddle_engine
    if _paddle_engine is None:
        try:
            # PP-OCRv5 via 3.x API (paddleocr >= 3.0)
            _paddle_engine = _mod.PaddleOCR(
                ocr_version="PP-OCRv5",
                lang="en",
                use_doc_orientation_classify=False,
                use_doc_unwarping=False,
                use_textline_orientation=False,
            )
            res.model = "PP-OCRv5 (3.x)"
        except TypeError:
            # Fallback: 2.x API (use_angle_cls param)
            _paddle_engine = _mod.PaddleOCR(use_angle_cls=True, lang="en", show_log=False)
            res.model = "PP-OCRv4 (2.x fallback)"

    try:
        # Try 3.x predict()
        predictions = _paddle_engine.predict(img)
        for pred in predictions:
            if hasattr(pred, "rec_texts"):
                res.text_lines.extend(pred.rec_texts)
                res.scores.extend(pred.rec_scores)
            elif isinstance(pred, list):
                # Might be 2.x-style nested list
                for line in pred:
                    if isinstance(line, (list, tuple)) and len(line) >= 2:
                        inner = line[1]
                        if isinstance(inner, (list, tuple)) and len(inner) >= 2:
                            res.text_lines.append(str(inner[0]))
                            res.scores.append(float(inner[1]))
    except (AttributeError, TypeError):
        # 2.x ocr() fallback
        try:
            predictions = _paddle_engine.ocr(img, cls=True)
            for line in predictions[0] if predictions else []:
                if isinstance(line, (list, tuple)) and len(line) >= 2:
                    inner = line[1]
                    if isinstance(inner, (list, tuple)) and len(inner) >= 2:
                        res.text_lines.append(str(inner[0]))
                        res.scores.append(float(inner[1]))
        except Exception as e:
            res.error = f"PaddleOCR inference failed: {e}"
            res.latency_s = time.time() - t0
            return res

    res.latency_s = time.time() - t0

    # Extract container numbers from all detected text
    all_text = "\n".join(res.text_lines)
    res.raw_response = all_text
    res.container_numbers = parse_numbers(all_text)
    for num in res.container_numbers:
        res.check_digit_valid[num] = validate_check_digit(num)

    return res


# ---------------------------------------------------------------------------
# Qwen-VL via OpenRouter engine (mirrors openrouter.py exactly)
# ---------------------------------------------------------------------------


def run_qwen(
    image_bytes: bytes,
    mime_type: str,
    api_key: str,
    base_url: str,
    model: str = DEFAULT_OPENROUTER_MODEL,
) -> OCRResult:
    """Call Qwen-VL via OpenRouter — identical request shape to prod."""
    label = "Qwen-VL-32B" if model == DEFAULT_OPENROUTER_MODEL else "Qwen-VL-235B"
    res = OCRResult(engine=f"{label} (OpenRouter)", model=model)

    if httpx is None:
        res.error = "httpx not installed — pip install httpx"
        return res
    if not api_key:
        res.error = "OPENROUTER_API_KEY not set in .env"
        return res

    encoded = base64.b64encode(image_bytes).decode("utf-8")
    payload = {
        "model": model,
        "temperature": 0,
        "max_tokens": 2048,
        "messages": [
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": MULTI_CONTAINER_PROMPT},
                    {
                        "type": "image_url",
                        "image_url": {"url": f"data:{mime_type};base64,{encoded}"},
                    },
                ],
            }
        ],
    }
    url = f"{base_url.rstrip('/')}/chat/completions"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }

    t0 = time.time()
    try:
        with httpx.Client(timeout=60.0) as client:
            resp = client.post(url, json=payload, headers=headers)
            resp.raise_for_status()
            data = resp.json()
    except httpx.HTTPStatusError as e:
        status = e.response.status_code if e.response else "?"
        detail = ""
        if e.response is not None:
            try:
                body = e.response.json()
                err = body.get("error", "")
                detail = err.get("message", "") if isinstance(err, dict) else str(err)
            except Exception:
                detail = str(e.response.text[:200]) if e.response else ""
        res.error = f"HTTP {status}: {detail}"
        res.latency_s = time.time() - t0
        return res
    except Exception as e:
        res.error = f"{type(e).__name__}: {e}"
        res.latency_s = time.time() - t0
        return res

    res.latency_s = time.time() - t0

    # Extract text from response (openrouter.py:48-68)
    choices = data.get("choices", [])
    if not choices:
        res.error = "No choices in response"
        return res
    content = choices[0].get("message", {}).get("content", "")
    if isinstance(content, list):
        content = "\n".join(
            b.get("text", "")
            for b in content
            if isinstance(b, dict) and b.get("type") == "text"
        )
    text = strip_think(content)
    text = strip_json_fences(text)
    res.raw_response = text
    res.container_numbers = parse_numbers(text)
    for num in res.container_numbers:
        res.check_digit_valid[num] = validate_check_digit(num)

    return res


# ---------------------------------------------------------------------------
# Output formatting
# ---------------------------------------------------------------------------


def print_separator(char: str = "-", width: int = 60):
    print(char * width)


def print_result(res: OCRResult):
    print(f"\n--- {res.engine} ({res.latency_s:.2f}s) ---")
    if res.error:
        print(f"  ERROR: {res.error}")
        return

    # Show detected text lines with confidence scores (PaddleOCR)
    if res.text_lines and res.scores:
        print(f"\n  Detected text ({len(res.text_lines)} lines):")
        for text, score in zip(res.text_lines, res.scores):
            tag = f"  [{score:.2f}] " if score else "  "
            print(f"{tag}{text}")
    # Show raw response (Qwen-VL)
    elif res.raw_response:
        print(f"\n  Raw response:")
        print(textwrap.indent(res.raw_response, "    "))

    print()
    if res.container_numbers:
        print("  Container numbers found:")
        for num in res.container_numbers:
            cd = "✓ (check-digit valid)" if res.check_digit_valid.get(num) else "✗ (check-digit INVALID)"
            print(f"    {num}  {cd}")
    else:
        print("  Container numbers found: (none)")


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------


def main():
    parser = argparse.ArgumentParser(
        description="Side-by-side OCR: PaddleOCR PP-OCRv5 vs Qwen-VL-32B (OpenRouter)",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument("image", help="Path to a container photo")
    parser.add_argument("--env", default=None, help="Path to .env file")
    parser.add_argument("--paddle-only", action="store_true", help="Run PaddleOCR only")
    parser.add_argument("--qwen-only", action="store_true", help="Run Qwen-VL only (no paddle, no 235B)")
    parser.add_argument("--no-235b", action="store_true", help="Skip Qwen-VL-235B-A22B (default: on)")
    args = parser.parse_args()

    if _MISSING:
        print("Missing dependencies (some engines disabled):")
        for pkg, pip in _MISSING.items():
            print(f"  {pkg}: {pip}")
        print()

    # Load image
    img_path = Path(args.image)
    if not img_path.is_file():
        print(f"Error: image not found: {img_path}", file=sys.stderr)
        sys.exit(1)

    # Register HEIF opener for HEIC images (pillow-heif)
    try:
        import pillow_heif

        pillow_heif.register_heif_opener()
    except ImportError:
        pass

    raw_bytes = img_path.read_bytes()
    print(f"Image: {img_path.name} ({len(raw_bytes) // 1024} KB)")

    # Preprocess (same as prod)
    processed, mime = preprocess_image(raw_bytes)
    print(f"Preprocessed: {mime}, {len(processed) // 1024} KB")

    # Load .env for OpenRouter key
    env_path = args.env
    if env_path is None:
        for candidate in ["backend/.env", "../backend/.env", ".env"]:
            if Path(candidate).is_file():
                env_path = candidate
                break
    env = load_dotenv(env_path) if env_path else {}
    api_key = env.get("OPENROUTER_API_KEY", "")
    base_url = env.get("OPENROUTER_BASE_URL", DEFAULT_OPENROUTER_BASE_URL)

    print(f"OpenRouter: {'key set ✓' if api_key else 'NO KEY (Qwen engine disabled)'}")
    if env_path:
        print(f"Env file: {env_path}")

    print_separator("=")
    print("  OCR Comparison")
    print_separator("=")

    results: list[OCRResult] = []

    # Run PaddleOCR
    if not args.qwen_only:
        paddle_res = run_paddle(processed)
        print_result(paddle_res)
        results.append(paddle_res)

    # Run Qwen-VL-32B
    if not args.paddle_only:
        qwen_res = run_qwen(processed, mime, api_key, base_url)
        print_result(qwen_res)
        results.append(qwen_res)

    # Run Qwen-VL-235B
    if not args.paddle_only and not args.qwen_only and not getattr(args, "no_235b", False):
        print_separator("-")
        res_235b = run_qwen(processed, mime, api_key, base_url, model=OPENROUTER_MODEL_235B)
        print_result(res_235b)
        results.append(res_235b)

    # Summary
    print_separator("=")
    print("  Summary")
    print_separator("=")

    for r in results:
        if r.success:
            nums_str = ", ".join(r.container_numbers) if r.container_numbers else "(none)"
            valid_str = (
                "✓" if all(r.check_digit_valid.values()) else "✗" if r.check_digit_valid else "-"
            )
            print(f"  {r.engine}: {nums_str}  {valid_str}  ({r.latency_s:.2f}s)")
        else:
            print(f"  {r.engine}: ERROR — {r.error}")

    # Agreement check — works for 2 or 3 engines
    successful = [r for r in results if r.success]
    if len(successful) >= 2:
        all_num_sets = [set(r.container_numbers) for r in successful]
        agreed = set.intersection(*all_num_sets) if all_num_sets else set()
        union = set.union(*all_num_sets) if all_num_sets else set()
        if agreed and agreed == union:
            print(f"\n  ✓ All {len(successful)} engines agree: {', '.join(agreed)}")
        elif agreed:
            print(f"\n  ~ Partial agreement — common: {', '.join(agreed)}")
            for r in successful:
                extra = set(r.container_numbers) - agreed
                if extra:
                    print(f"    Only {r.engine}: {', '.join(extra)}")
        else:
            print("\n  ✗ No agreement")
            for r in successful:
                nums = set(r.container_numbers)
                print(f"    {r.engine}: {', '.join(nums) if nums else '(none)'}")

    # Save JSON dump next to the image
    dump: dict[str, Any] = {}
    for r in results:
        dump[r.engine] = {
            "model": r.model,
            "success": r.success,
            "latency_s": round(r.latency_s, 4),
            "error": r.error,
            "container_numbers": r.container_numbers,
            "check_digit_valid": r.check_digit_valid,
            "text_lines": r.text_lines,
            "raw_response": r.raw_response,
        }
    dump_path = img_path.with_suffix(".ocr_compare.json")
    dump_path.write_text(json.dumps(dump, ensure_ascii=False, indent=2), "utf-8")
    print(f"\nJSON dump saved: {dump_path}")


if __name__ == "__main__":
    main()
