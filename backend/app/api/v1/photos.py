from pathlib import Path
from urllib.parse import unquote

from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import FileResponse

from app.config import settings

router = APIRouter(prefix="/photos", tags=["photos"])


@router.get("/download")
async def download_photo(path: str = Query(..., min_length=1)) -> FileResponse:
    photo_path = _resolve_photo_path(path)
    if not photo_path.is_file():
        raise HTTPException(status_code=404, detail="Photo not found")

    return FileResponse(
        photo_path,
        media_type="application/octet-stream",
        filename=photo_path.name,
    )


def _resolve_photo_path(raw_path: str) -> Path:
    decoded = unquote(raw_path)
    if decoded.startswith("http://") or decoded.startswith("https://"):
        raise HTTPException(status_code=400, detail="Only local photo paths are supported")

    if decoded.startswith("/photos/"):
        relative = decoded.removeprefix("/photos/")
    elif decoded.startswith("photos/"):
        relative = decoded.removeprefix("photos/")
    else:
        raise HTTPException(status_code=400, detail="Invalid photo path")

    root = Path(settings.PHOTO_STORAGE_ROOT).resolve()
    candidate = (root / relative).resolve()

    try:
        candidate.relative_to(root)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail="Invalid photo path") from exc

    return candidate
