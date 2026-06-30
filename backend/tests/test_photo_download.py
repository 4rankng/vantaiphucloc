from app.config import settings


async def test_photo_download_returns_attachment(async_client, tmp_path, monkeypatch):
    monkeypatch.setattr(settings, "PHOTO_STORAGE_ROOT", str(tmp_path))
    photo_dir = tmp_path / "2026" / "06" / "30"
    photo_dir.mkdir(parents=True)
    photo = photo_dir / "container.jpg"
    photo.write_bytes(b"fake image bytes")

    response = await async_client.get(
        "/api/v1/photos/download",
        params={"path": "/photos/2026/06/30/container.jpg"},
    )

    assert response.status_code == 200
    assert response.content == b"fake image bytes"
    assert "attachment" in response.headers["content-disposition"]
    assert "container.jpg" in response.headers["content-disposition"]


async def test_photo_download_rejects_path_traversal(async_client, tmp_path, monkeypatch):
    monkeypatch.setattr(settings, "PHOTO_STORAGE_ROOT", str(tmp_path / "photos"))
    secret = tmp_path / "secret.jpg"
    secret.write_bytes(b"secret")

    response = await async_client.get(
        "/api/v1/photos/download",
        params={"path": "/photos/../secret.jpg"},
    )

    assert response.status_code == 400
