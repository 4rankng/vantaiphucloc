import base64
import hashlib
import io
import uuid
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path

from PIL import Image
import pillow_heif

from app.config import settings

# Let Pillow open HEIC/HEIF captures. iOS shoots still photos in HEIC by
# default, and a client may send those bytes even under a `data:image/jpeg`
# prefix — without this opener we cannot transcode them (see below).
pillow_heif.register_heif_opener()


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


# HEIF "ftyp" major brands we treat as HEIC. iOS photos report `heic`; other
# HEIF containers use `mif1`/`hevc`/etc. Any of these means the bytes are NOT
# JPEG and must be transcoded before we store them under a .jpg name.
_HEIF_BRANDS = {
    b"heic",
    b"heix",
    b"hevc",
    b"hevx",
    b"heim",
    b"hevm",
    b"mif1",
    b"msf1",
}


def is_heic(image_bytes: bytes) -> bool:
    """True if *image_bytes* is a HEIF/HEIC container.

    Detects the ISO base-media-file-format ``ftyp`` box: bytes 4-8 are
    ``b"ftyp"`` and bytes 8-12 carry the major brand. Real JPEG
    (``\\xff\\xd8\\xff...``) and other formats never carry this box, so there
    are no false positives for genuine JPEG.
    """
    return (
        len(image_bytes) >= 12
        and image_bytes[4:8] == b"ftyp"
        and image_bytes[8:12].lower() in _HEIF_BRANDS
    )


def transcode_heic_to_jpeg(image_bytes: bytes) -> bytes:
    """Return guaranteed-browser-decodable JPEG bytes.

    HEIC/HEIF input is re-encoded to JPEG (quality 92); everything else
    (already-JPEG, PNG, …) is returned unchanged. iOS gallery photos can arrive
    as HEIC; without this normalization they'd be written to disk under a
    ``.jpg`` name and render as broken images in Chrome/Firefox/Android, which
    cannot decode HEIC.
    """
    if not is_heic(image_bytes):
        return image_bytes
    with Image.open(io.BytesIO(image_bytes)) as im:
        out = io.BytesIO()
        im.convert("RGB").save(out, format="JPEG", quality=92)
        return out.getvalue()


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
    # iOS uploads can be HEIC even when the data-URL prefix claims jpeg.
    # Normalize to real JPEG so every browser can render the stored photo.
    image_bytes = transcode_heic_to_jpeg(image_bytes)
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
