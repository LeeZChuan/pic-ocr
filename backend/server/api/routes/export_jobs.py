from fastapi import APIRouter, HTTPException, BackgroundTasks
from typing import Optional
from fastapi.responses import Response, FileResponse
from pydantic import BaseModel
from server.infra.repository import OcrJobRepository, ExportJobRepository
from server.infra.storage import StorageService
from server.services.export.docx_builder import build_docx
from server.services.export.pdf_builder import build_pdf

router = APIRouter(prefix="/api/export", tags=["export"])


class CreateExportRequest(BaseModel):
    ocr_job_id: str
    format: str


class ExportJobResponse(BaseModel):
    id: str
    status: str
    format: str
    download_url: Optional[str] = None
    error_msg: Optional[str] = None


@router.post("/jobs", response_model=ExportJobResponse)
async def create_export_job(
    body: CreateExportRequest,
    background_tasks: BackgroundTasks,
) -> ExportJobResponse:
    if body.format not in ("docx", "pdf"):
        raise HTTPException(status_code=400, detail="format 只支持 docx 或 pdf")

    ocr_repo = OcrJobRepository()
    ocr_job = ocr_repo.get(body.ocr_job_id)
    if not ocr_job:
        raise HTTPException(status_code=404, detail="OCR 任务不存在")
    if ocr_job["status"] not in ("success",):
        raise HTTPException(status_code=400, detail="OCR 任务尚未完成")

    export_repo = ExportJobRepository()
    job = export_repo.create(user_id=None, ocr_job_id=body.ocr_job_id, fmt=body.format)
    job_id = job["id"]

    background_tasks.add_task(
        _process_export_job,
        job_id,
        ocr_job["results"],
        body.format,
    )

    return ExportJobResponse(id=job_id, status="pending", format=body.format)


@router.get("/jobs/{job_id}", response_model=ExportJobResponse)
async def get_export_job(job_id: str) -> ExportJobResponse:
    repo = ExportJobRepository()
    job = repo.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="导出任务不存在")
    return ExportJobResponse(
        id=job["id"],
        status=job["status"],
        format=job["format"],
        download_url=job.get("download_url"),
        error_msg=job.get("error_msg"),
    )


@router.get("/jobs/{job_id}/download")
async def download_export(job_id: str) -> Response:
    export_repo = ExportJobRepository()
    job = export_repo.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="导出任务不存在")
    if job["status"] != "success":
        raise HTTPException(status_code=400, detail="导出尚未完成")

    ocr_repo = OcrJobRepository()
    ocr_job = ocr_repo.get(job["ocr_job_id"])
    if not ocr_job:
        raise HTTPException(status_code=404, detail="关联 OCR 任务不存在")

    fmt = job["format"]
    results = ocr_job["results"] or []
    storage = StorageService()
    stored_path = f"exports/{job_id}.{fmt}"

    if fmt == "docx":
        media_type = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        filename = f"合同识别结果_{job_id[:8]}.docx"
    else:
        media_type = "application/pdf"
        filename = f"合同识别结果_{job_id[:8]}.pdf"

    if storage.exists(stored_path):
        return FileResponse(
            path=str(storage.resolve_path(stored_path)),
            media_type=media_type,
            filename=filename,
        )

    content = build_docx(results) if fmt == "docx" else build_pdf(results)
    return Response(
        content=content,
        media_type=media_type,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


async def _process_export_job(job_id: str, results: list[dict], fmt: str) -> None:
    repo = ExportJobRepository()
    repo.update(job_id, "processing")
    storage = StorageService()

    try:
        if fmt == "docx":
            content = build_docx(results)
        else:
            content = build_pdf(results)
        url = storage.upload_export(job_id, fmt, content)
        repo.update(job_id, "success", download_url=url)
    except Exception as e:
        repo.update(job_id, "error", error_msg=str(e))
