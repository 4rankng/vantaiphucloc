import base64
import uuid
from datetime import datetime, timezone
from pathlib import Path

from app.config import settings


def save_base64_photo(data_url: str) -> str:
    """Decode a base64 data-URL, save to disk, return the URL path.

    Accepts strings like ``data:image/jpeg;base64,/9j/4AAQ...``.
    Returns a path like ``/photos/2024/05/01/<uuid>.jpg``.
    """
    # Strip the data-URL prefix: "data:image/...;base64,"
    header, _, encoded = data_url.partition(",")
    if not encoded:
        raise ValueError("Invalid data URL: no base64 payload")

    image_bytes = base64.b64decode(encoded)

    now = datetime.now(tz=timezone.utc)
    date_dir = f"{now.year:04d}/{now.month:02d}/{now.day:02d}"
    filename = f"{uuid.uuid4()}.jpg"

    storage_root = Path(settings.PHOTO_STORAGE_ROOT)
    dir_path = storage_root / date_dir
    dir_path.mkdir(parents=True, exist_ok=True)

    file_path = dir_path / filename
    file_path.write_bytes(image_bytes)

    return f"/photos/{date_dir}/{filename}"
