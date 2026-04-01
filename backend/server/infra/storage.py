from pathlib import Path
from server.config import settings


class StorageService:
    def __init__(self) -> None:
        self.root = Path(settings.storage_root).resolve()
        self.root.mkdir(parents=True, exist_ok=True)

    def _ensure_parent(self, path: Path) -> None:
        path.parent.mkdir(parents=True, exist_ok=True)

    def upload_image(self, job_id: str, order: int, data: bytes, content_type: str) -> str:
        ext = content_type.split("/")[-1]
        rel = Path(job_id) / f"{order}.{ext}"
        full = self.root / rel
        self._ensure_parent(full)
        full.write_bytes(data)
        return rel.as_posix()

    def upload_export(self, job_id: str, fmt: str, data: bytes) -> str:
        rel = Path("exports") / f"{job_id}.{fmt}"
        full = self.root / rel
        self._ensure_parent(full)
        full.write_bytes(data)
        return f"/api/export/jobs/{job_id}/download"

    def resolve_path(self, path: str) -> Path:
        return (self.root / path).resolve()

    def read_bytes(self, path: str) -> bytes:
        full = self.resolve_path(path)
        return full.read_bytes()

    def exists(self, path: str) -> bool:
        return self.resolve_path(path).exists()
