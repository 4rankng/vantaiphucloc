#!/usr/bin/env python3
"""
compare_ocr.py — benchmark container OCR across vision LLMs via OpenRouter.

Run:
    python backend/scripts/compare_ocr.py docs/ocr
    python backend/scripts/compare_ocr.py docs/ocr/00.jpeg --env backend/.env
    make ocr IMG=docs/ocr

Uses a copy of the production OCR prompt (MULTI_CONTAINER_PROMPT in
app/contexts/operations/infrastructure/ocr.py) — keep it in sync when
production changes. Standalone — zero backend app imports. Request payloads
mirror production OpenRouter calls closely enough to compare real OCR
behavior.
"""

from __future__ import annotations

import argparse
import base64
import importlib
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

_MISSING: dict[str, str] = {}


def _try_import(name: str, pip: str) -> Any:
    try:
        return importlib.import_module(name)
    except ImportError:
        _MISSING[name.split(".")[0]] = pip
        return None


Image = _try_import("PIL.Image", "pip install Pillow")
ImageOps = _try_import("PIL.ImageOps", "pip install Pillow") if Image else None
httpx = _try_import("httpx", "pip install httpx")

_CONTAINER_RE = re.compile(r"[A-Z]{4}\d{7}")

SUPPORTED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".heic", ".heif"}
DEFAULT_OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1"
OPENROUTER_OCR_TEMPERATURE = 0.2
QWEN_MODELS = [
    ("Qwen3-VL-32B", "qwen/qwen3-vl-32b-instruct"),
    ("Qwen3-VL-235B", "qwen/qwen3-vl-235b-a22b-instruct"),
]

MULTI_CONTAINER_PROMPT = textwrap.dedent(
    """\
You are reading shipping container identifiers from a photo.

Return a JSON array of container identifiers.

Most container numbers are ISO numbers with 11 characters:
- first 4 characters are uppercase letters A-Z
- last 7 characters are digits 0-9
- spaces, dashes, vertical layout, or line breaks between characters should be removed

Some special containers have a short painted code instead:
- first 4 characters are uppercase letters A-Z
- last 4 characters are digits 0-9
- example: HCWT 0006 should be returned as HCWT0006

Critical instruction:
If you can see any plausible container identifier, return your best reading.
Do NOT return an empty array just because some characters are blurry, partially hidden, low contrast, or the ISO check digit may be invalid.
A visually reasonable best guess is better than [].

Only return [] when there is truly no visible container identifier-like text anywhere in the image.

How to read:
1. Scan the whole visible container: door panels, top/bottom edges, vertical markings, and nearby repeated markings.
2. First look for ISO numbers: 4 letters followed by 7 digits, even if split across lines.
3. If an ISO number is visible, return only the ISO number(s).
4. If no ISO number is visible, look for a special code: 4 letters followed by exactly 4 digits.
5. Normalize spaces, dashes, vertical layout, or line breaks into 4 letters + digits.
6. The first 4 positions must be letters. If a character in the first 4 positions looks like a digit, convert it to the most visually similar letter when reasonable:
   0→O, 1→I, 2→Z, 5→S, 6→G, 8→B.
7. The digit positions must be digits. If a character in the digit positions looks like a letter, convert it to the most visually similar digit when reasonable:
   O/Q→0, I/L/T→1, Z→2, S→5, G→6, B→8.
8. Ignore ISO size/type codes such as 22G1, 42G1, 45G1, company names, KG, and LB.
9. If several readings are possible, return the single most visually likely container identifier first. If two different container identifiers are visible, return both.

Output rules:
- Return ONLY a JSON array.
- Do not explain.
- Do not include confidence.
- Do not include markdown.
- Example output: ["MSKU1234567"]
- Example special-code output: ["HCWT0006"]"""
)

LETTER_MAP: dict[str, int] = {
    "A": 10,
    "B": 12,
    "C": 13,
    "D": 14,
    "E": 15,
    "F": 16,
    "G": 17,
    "H": 18,
    "I": 19,
    "J": 20,
    "K": 21,
    "L": 23,
    "M": 24,
    "N": 25,
    "O": 26,
    "P": 27,
    "Q": 28,
    "R": 29,
    "S": 30,
    "T": 31,
    "U": 32,
    "V": 34,
    "W": 35,
    "X": 36,
    "Y": 37,
    "Z": 38,
}
POWERS_2 = [1, 2, 4, 8, 16, 32, 64, 128, 256, 512]


@dataclass
class OCRResult:
    engine: str
    image: str
    expected_numbers: list[str] = field(default_factory=list)
    model: str | None = None
    raw_response: str | None = None
    container_numbers: list[str] = field(default_factory=list)
    check_digit_valid: dict[str, bool] = field(default_factory=dict)
    latency_s: float = 0.0
    error: str | None = None

    @property
    def success(self) -> bool:
        return self.error is None

    @property
    def exact_match(self) -> bool:
        return bool(self.expected_numbers) and set(self.container_numbers) == set(
            self.expected_numbers
        )


def load_dotenv(path: str) -> dict[str, str]:
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


def find_env_file(explicit: str | None) -> str | None:
    if explicit:
        return explicit
    for candidate in ["backend/.env", "../backend/.env", ".env"]:
        if Path(candidate).is_file():
            return candidate
    return None


def preprocess_image(image_bytes: bytes) -> tuple[bytes, str]:
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


def strip_think(text: str) -> str:
    cleaned = re.sub(r"💭.*?💭", "", text, flags=re.DOTALL | re.IGNORECASE)
    cleaned = re.sub(r"💭.*", "", cleaned, flags=re.DOTALL | re.IGNORECASE)
    return cleaned.strip()


def strip_json_fences(text: str) -> str:
    return re.sub(r"```(?:json)?\s*", "", text).rstrip("`").strip()


def parse_numbers(text: str) -> list[str]:
    try:
        data = json.loads(text)
        if isinstance(data, dict) and "container_numbers" in data:
            nums = data["container_numbers"]
            if isinstance(nums, list):
                return [
                    str(n).upper().strip()
                    for n in nums
                    if isinstance(n, (str, int))
                    and _CONTAINER_RE.fullmatch(str(n).upper().strip())
                ]
    except (json.JSONDecodeError, TypeError):
        pass
    cleaned = re.sub(r"[`\"'\n\r]", "", text).strip().upper()
    if cleaned == "NONE":
        return []
    return list(dict.fromkeys(_CONTAINER_RE.findall(cleaned)))


def calculate_check_digit(body: str) -> int:
    body = body.upper().replace("-", "").replace(" ", "")
    if len(body) != 10:
        raise ValueError(f"Need 10 chars, got {len(body)}")
    total = 0
    for i, ch in enumerate(body):
        val = LETTER_MAP[ch] if i < 4 else int(ch)
        total += val * POWERS_2[i]
    cd = total % 11
    return 0 if cd == 10 else cd


def validate_check_digit(number: str) -> bool:
    n = number.upper().replace("-", "").replace(" ", "")
    if len(n) != 11:
        return False
    try:
        return int(n[10]) == calculate_check_digit(n[:10])
    except (ValueError, KeyError):
        return False


def finalize_result(res: OCRResult, text: str) -> OCRResult:
    text = strip_json_fences(strip_think(text))
    res.raw_response = text
    res.container_numbers = parse_numbers(text)
    res.check_digit_valid = {
        num: validate_check_digit(num) for num in res.container_numbers
    }
    return res


def run_openrouter(
    image_name: str,
    expected_numbers: list[str],
    image_bytes: bytes,
    mime_type: str,
    api_key: str,
    base_url: str,
    label: str,
    model: str,
    prompt: str,
) -> OCRResult:
    res = OCRResult(
        engine=label,
        image=image_name,
        expected_numbers=expected_numbers,
        model=model,
    )
    if httpx is None:
        res.error = "httpx not installed — pip install httpx"
        return res
    if not api_key:
        res.error = "OPENROUTER_API_KEY not set in .env"
        return res

    encoded = base64.b64encode(image_bytes).decode("utf-8")
    payload = {
        "model": model,
        "temperature": OPENROUTER_OCR_TEMPERATURE,
        "max_tokens": 2048,
        "messages": [
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": prompt},
                    {
                        "type": "image_url",
                        "image_url": {"url": f"data:{mime_type};base64,{encoded}"},
                    },
                ],
            }
        ],
    }
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }
    url = f"{base_url.rstrip('/')}/chat/completions"

    t0 = time.time()
    try:
        with httpx.Client(timeout=60.0) as client:
            response = client.post(url, json=payload, headers=headers)
            response.raise_for_status()
            data = response.json()
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
    choices = data.get("choices", [])
    if not choices:
        res.error = "No choices in response"
        return res
    content = choices[0].get("message", {}).get("content", "")
    if isinstance(content, list):
        content = "\n".join(
            block.get("text", "")
            for block in content
            if isinstance(block, dict) and block.get("type") == "text"
        )
    return finalize_result(res, str(content))


def collect_images(path: Path) -> list[Path]:
    if path.is_file():
        return [path]
    if not path.is_dir():
        raise FileNotFoundError(path)
    return [
        p
        for p in sorted(path.iterdir())
        if p.is_file() and p.suffix.lower() in SUPPORTED_EXTENSIONS
    ]


def expected_numbers_from_filename(path: Path) -> list[str]:
    return list(dict.fromkeys(_CONTAINER_RE.findall(path.stem.upper())))


def print_result(res: OCRResult):
    print(f"  {res.engine:<27} {res.latency_s:>6.2f}s", end="")
    if res.error:
        print(f"  ERROR: {res.error}")
        return
    nums = ", ".join(res.container_numbers) if res.container_numbers else "(none)"
    validity = (
        "valid"
        if res.check_digit_valid and all(res.check_digit_valid.values())
        else "invalid"
        if res.check_digit_valid
        else "-"
    )
    correctness = "correct" if res.exact_match else "wrong"
    print(f"  {nums}  [{validity}, {correctness}]")


def print_summary(results: list[OCRResult]):
    print("\n" + "=" * 80)
    print("Benchmark summary")
    print("=" * 80)
    engines = list(dict.fromkeys(r.engine for r in results))
    for engine in engines:
        subset = [r for r in results if r.engine == engine]
        ok = [r for r in subset if r.success]
        with_numbers = [r for r in ok if r.container_numbers]
        all_valid = [
            r
            for r in with_numbers
            if r.check_digit_valid and all(r.check_digit_valid.values())
        ]
        exact = [r for r in ok if r.exact_match]
        avg_latency = sum(r.latency_s for r in ok) / len(ok) if ok else 0
        print(
            f"{engine:<27} "
            f"success {len(ok):>2}/{len(subset):<2}  "
            f"numbers {len(with_numbers):>2}/{len(subset):<2}  "
            f"valid {len(all_valid):>2}/{len(subset):<2}  "
            f"exact {len(exact):>2}/{len(subset):<2}  "
            f"avg {avg_latency:>6.2f}s"
        )

    by_image: dict[str, list[OCRResult]] = {}
    for result in results:
        by_image.setdefault(result.image, []).append(result)

    print("\nPer-image agreement")
    for image, image_results in by_image.items():
        successful = [r for r in image_results if r.success]
        sets = [set(r.container_numbers) for r in successful]
        if len(sets) < 2:
            status = "not enough successful engines"
        elif all(s == sets[0] for s in sets[1:]):
            status = f"agree on {', '.join(sorted(sets[0])) if sets[0] else '(none)'}"
        else:
            status = "disagree"
        print(f"  {image}: {status}")


def result_dump(results: list[OCRResult]) -> dict[str, Any]:
    dump: dict[str, Any] = {}
    for result in results:
        dump.setdefault(result.image, {})[result.engine] = {
            "model": result.model,
            "success": result.success,
            "exact_match": result.exact_match,
            "expected_numbers": result.expected_numbers,
            "latency_s": round(result.latency_s, 4),
            "error": result.error,
            "container_numbers": result.container_numbers,
            "check_digit_valid": result.check_digit_valid,
            "raw_response": result.raw_response,
        }
    return dump


def parse_model_arg(value: str) -> tuple[str, str]:
    """Parse --model into a (label, model_id) pair.

    Accepts either 'Label:provider/id' or a bare 'provider/id'. A bare id
    derives its label from the final path segment so OpenRouter ids keep
    their ':free' style suffixes intact (those contain a colon, not a slash).
    """
    if ":" in value and "/" not in value.split(":", 1)[0]:
        label, model = value.split(":", 1)
        return label.strip(), model.strip()
    return value.split("/")[-1], value.strip()


def main():
    parser = argparse.ArgumentParser(
        description="Benchmark container OCR across vision models via OpenRouter",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument("path", help="Path to a container photo or directory of photos")
    parser.add_argument("--env", default=None, help="Path to .env file")
    parser.add_argument(
        "-m",
        "--model",
        action="append",
        default=[],
        metavar="LABEL:MODEL_ID",
        help="Extra candidate model to benchmark (repeatable). Format "
        "'Label:provider/id', or a bare 'provider/id' to auto-derive the "
        "label. Appended to the built-in Qwen models.",
    )
    parser.add_argument(
        "--only-model",
        action="append",
        default=[],
        metavar="SUBSTRING",
        help="Restrict the run to models whose id or label contains this "
        "substring (repeatable, case-insensitive). Default: run all.",
    )
    args = parser.parse_args()

    if _MISSING:
        print("Missing dependencies:")
        for pkg, pip in _MISSING.items():
            print(f"  {pkg}: {pip}")
        print()

    try:
        import pillow_heif

        pillow_heif.register_heif_opener()
    except ImportError:
        pass

    env_path = find_env_file(args.env)
    env = load_dotenv(env_path) if env_path else {}
    openrouter_key = env.get("OPENROUTER_API_KEY", os.getenv("OPENROUTER_API_KEY", ""))
    openrouter_base_url = env.get(
        "OPENROUTER_BASE_URL",
        os.getenv("OPENROUTER_BASE_URL", DEFAULT_OPENROUTER_BASE_URL),
    )

    images = collect_images(Path(args.path))
    if not images:
        print(f"No images found under {args.path}", file=sys.stderr)
        sys.exit(1)

    models: list[tuple[str, str]] = list(QWEN_MODELS)
    for raw_model in args.model:
        models.append(parse_model_arg(raw_model))
    if args.only_model:
        wanted = [w.lower() for w in args.only_model]
        models = [
            (label, model)
            for label, model in models
            if any(w in model.lower() or w in label.lower() for w in wanted)
        ]
        if not models:
            sys.exit("--only-model matched no models in the roster")

    print(f"Images: {len(images)}")
    print(f"Env file: {env_path or '(environment only)'}")
    print(f"OpenRouter: {'key set' if openrouter_key else 'NO KEY'}")
    print(f"Models: {', '.join(label for label, _ in models)}")
    print("=" * 80)

    results: list[OCRResult] = []
    for image_path in images:
        raw_bytes = image_path.read_bytes()
        processed, mime_type = preprocess_image(raw_bytes)
        expected_numbers = expected_numbers_from_filename(image_path)
        print(
            f"\n{image_path.name} "
            f"({len(raw_bytes) // 1024} KB -> {len(processed) // 1024} KB, {mime_type})"
        )
        print(
            f"  Expected: {', '.join(expected_numbers) if expected_numbers else '(none)'}"
        )
        for label, model in models:
            result = run_openrouter(
                image_path.name,
                expected_numbers,
                processed,
                mime_type,
                openrouter_key,
                openrouter_base_url,
                label,
                model,
                MULTI_CONTAINER_PROMPT,
            )
            print_result(result)
            results.append(result)

    print_summary(results)

    root = Path(args.path)
    dump_path = (
        root / "ocr_benchmark.json"
        if root.is_dir()
        else root.with_suffix(".ocr_compare.json")
    )
    dump_path.write_text(
        json.dumps(result_dump(results), ensure_ascii=False, indent=2), "utf-8"
    )
    print(f"\nJSON dump saved: {dump_path}")


if __name__ == "__main__":
    main()
