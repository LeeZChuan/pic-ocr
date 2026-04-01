from typing import Any, Dict, Optional, List
from uuid import uuid4


_OCR_JOBS: Dict[str, Dict[str, Any]] = {}
_EXPORT_JOBS: Dict[str, Dict[str, Any]] = {}


class OcrJobRepository:
    def create(self, user_id: Optional[str], image_count: int) -> Dict[str, Any]:
        job_id = uuid4().hex
        data = {
            "id": job_id,
            "user_id": user_id,
            "image_count": image_count,
            "status": "pending",
            "results": [],
        }
        _OCR_JOBS[job_id] = data
        return data

    def get(self, job_id: str) -> Optional[Dict[str, Any]]:
        return _OCR_JOBS.get(job_id)

    def update_status(self, job_id: str, status: str, results: Optional[List] = None) -> Dict[str, Any]:
        job = _OCR_JOBS.get(job_id)
        if not job:
            job = {"id": job_id, "image_count": 0, "results": []}
            _OCR_JOBS[job_id] = job
        job["status"] = status
        if results is not None:
            job["results"] = results
        return job


class ExportJobRepository:
    def create(self, user_id: Optional[str], ocr_job_id: str, fmt: str) -> Dict[str, Any]:
        job_id = uuid4().hex
        data = {
            "id": job_id,
            "user_id": user_id,
            "ocr_job_id": ocr_job_id,
            "format": fmt,
            "status": "pending",
            "download_url": None,
            "error_msg": None,
        }
        _EXPORT_JOBS[job_id] = data
        return data

    def get(self, job_id: str) -> Optional[Dict[str, Any]]:
        return _EXPORT_JOBS.get(job_id)

    def update(self, job_id: str, status: str, download_url: Optional[str] = None, error_msg: Optional[str] = None) -> Dict[str, Any]:
        job = _EXPORT_JOBS.get(job_id)
        if not job:
            job = {"id": job_id, "format": "", "ocr_job_id": "", "status": "pending"}
            _EXPORT_JOBS[job_id] = job
        job["status"] = status
        if download_url is not None:
            job["download_url"] = download_url
        if error_msg is not None:
            job["error_msg"] = error_msg
        return job
