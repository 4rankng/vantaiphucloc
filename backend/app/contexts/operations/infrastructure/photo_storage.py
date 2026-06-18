import base64
import hashlib
import uuid
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path

from app.config import settings


@dataclass(frozen=True)
class StoredPhoto:
    """Result of persisting an uploaded photo: the served URL and a
    content hash (sha256 of the decoded bytes) used for duplicate detection."""

    url: str
    content_hash: str


def hash_image_bytes(image_bytes: bytes) -> str:
    """Return the sha256 hex digest of raw image bytes.

    Two trips that share the exact same submitted photo (e.g. a driver
    re-submitting, or an app double-send) produce identical decoded bytes and
    therefore an identical hash — the strongest duplicate signal.
    """
    return hashlib.sha256(image_bytes).hexdigest()


def save_base64_photo(data_url: str) -> StoredPhoto:
    """Decode a base64 data-URL, save to disk, return ``StoredPhoto``.

    Accepts strings like ``data:image/jpeg;base64,/9j/4AAQ...``.
    The URL is a path like ``/photos/2024/05/01/<uuid>.jpg`` and the content
    hash is the sha256 of the decoded image bytes.
    """
    # Strip the data-URL prefix: "data:image/...;base64,"
    header, _, encoded = data_url.partition(",")
    if not encoded:
        raise ValueError("Invalid data URL: no base64 payload")

    image_bytes = base64.b64decode(encoded)
    content_hash = hash_image_bytes(image_bytes)

    now = datetime.now(tz=timezone.utc)
    date_dir = f"{now.year:04d}/{now.month:02d}/{now.day:02d}"
    filename = f"{uuid.uuid4()}.jpg"

    storage_root = Path(settings.PHOTO_STORAGE_ROOT)
    dir_path = storage_root / date_dir
    dir_path.mkdir(parents=True, exist_ok=True)

    file_path = dir_path / filename
    file_path.write_bytes(image_bytes)

    return StoredPhoto(
        url=f"/photos/{date_dir}/{filename}",
        content_hash=content_hash,
    )
