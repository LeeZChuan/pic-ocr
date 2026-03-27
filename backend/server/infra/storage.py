import io
from supabase import Client
from server.config import settings


class StorageService:
    def __init__(self, client: Client):
        self.client = client
        self.bucket = settings.storage_bucket

    def upload_image(self, job_id: str, order: int, data: bytes, content_type: str) -> str:
        path = f"{job_id}/{order}.{content_type.split('/')[-1]}"
        self.client.storage.from_(self.bucket).upload(
            path, data, {"content-type": content_type, "upsert": "true"}
        )
        return path

    def upload_export(self, job_id: str, fmt: str, data: bytes) -> str:
        path = f"exports/{job_id}.{fmt}"
        mime = "application/vnd.openxmlformats-officedocument.wordprocessingml.document" if fmt == "docx" else "application/pdf"
        self.client.storage.from_(self.bucket).upload(
            path, data, {"content-type": mime, "upsert": "true"}
        )
        url = self.client.storage.from_(self.bucket).get_public_url(path)
        return url

    def get_signed_url(self, path: str, expires_in: int = 3600) -> str:
        res = self.client.storage.from_(self.bucket).create_signed_url(path, expires_in)
        return res["signedURL"]
