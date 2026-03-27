from typing import Any
from supabase import create_client, Client
from server.config import settings


def get_supabase() -> Client:
    return create_client(settings.supabase_url, settings.supabase_service_role_key)


class OcrJobRepository:
    def __init__(self, client: Client):
        self.client = client

    def create(self, user_id: str | None, image_count: int) -> dict[str, Any]:
        data = {
            "user_id": user_id,
            "image_count": image_count,
            "status": "pending",
            "results": [],
        }
        res = self.client.table("ocr_jobs").insert(data).execute()
        return res.data[0]

    def get(self, job_id: str) -> dict[str, Any] | None:
        res = self.client.table("ocr_jobs").select("*").eq("id", job_id).maybeSingle().execute()
        return res.data

    def update_status(self, job_id: str, status: str, results: list | None = None) -> dict[str, Any]:
        payload: dict[str, Any] = {"status": status}
        if results is not None:
            payload["results"] = results
        res = (
            self.client.table("ocr_jobs")
            .update(payload)
            .eq("id", job_id)
            .execute()
        )
        return res.data[0]


class ExportJobRepository:
    def __init__(self, client: Client):
        self.client = client

    def create(self, user_id: str | None, ocr_job_id: str, fmt: str) -> dict[str, Any]:
        data = {
            "user_id": user_id,
            "ocr_job_id": ocr_job_id,
            "format": fmt,
            "status": "pending",
        }
        res = self.client.table("export_jobs").insert(data).execute()
        return res.data[0]

    def get(self, job_id: str) -> dict[str, Any] | None:
        res = (
            self.client.table("export_jobs")
            .select("*")
            .eq("id", job_id)
            .maybeSingle()
            .execute()
        )
        return res.data

    def update(self, job_id: str, status: str, download_url: str | None = None, error_msg: str | None = None) -> dict[str, Any]:
        payload: dict[str, Any] = {"status": status}
        if download_url is not None:
            payload["download_url"] = download_url
        if error_msg is not None:
            payload["error_msg"] = error_msg
        res = (
            self.client.table("export_jobs")
            .update(payload)
            .eq("id", job_id)
            .execute()
        )
        return res.data[0]
