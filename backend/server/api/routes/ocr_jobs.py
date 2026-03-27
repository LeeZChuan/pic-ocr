import asyncio
from fastapi import APIRouter, UploadFile, File, HTTPException, BackgroundTasks
from pydantic import BaseModel
from server.infra.repository import get_supabase, OcrJobRepository
from server.services.ocr.mock_engine import MockOcrEngine
from server.services.ocr.ocr_space_engine import OcrSpaceEngine
from server.config import settings

router = APIRouter(prefix="/api/ocr", tags=["ocr"])

ALLOWED_TYPES = {"image/jpeg", "image/jpg", "image/png", "image/webp"}
MAX_SIZE_BYTES = 15 * 1024 * 1024


def _get_engine():
    if settings.ocr_space_api_key:
        return OcrSpaceEngine()
    return MockOcrEngine()


class OcrJobResponse(BaseModel):
    id: str
    status: str
    image_count: int
    results: list[dict]


@router.post("/jobs", response_model=OcrJobResponse)
async def create_ocr_job(
    background_tasks: BackgroundTasks,
    images: list[UploadFile] = File(...),
) -> OcrJobResponse:
    if not images:
        raise HTTPException(status_code=400, detail="请上传至少一张图片")
    if len(images) > settings.max_free_images:
        raise HTTPException(
            status_code=400,
            detail=f"超过 {settings.max_free_images} 张限制",
        )

    for img in images:
        if img.content_type not in ALLOWED_TYPES:
            raise HTTPException(status_code=400, detail=f"{img.filename}：格式不支持")
        size = 0
        chunk = await img.read(MAX_SIZE_BYTES + 1)
        size = len(chunk)
        await img.seek(0)
        if size > MAX_SIZE_BYTES:
            raise HTTPException(status_code=400, detail=f"{img.filename}：超过 15MB 限制")

    db = get_supabase()
    repo = OcrJobRepository(db)
    job = repo.create(user_id=None, image_count=len(images))
    job_id = job["id"]

    image_data = []
    for i, img in enumerate(images):
        data = await img.read()
        image_data.append((i, data, img.content_type or "image/jpeg"))

    background_tasks.add_task(_process_ocr_job, job_id, image_data)

    return OcrJobResponse(
        id=job_id,
        status="pending",
        image_count=len(images),
        results=[],
    )


@router.get("/jobs/{job_id}", response_model=OcrJobResponse)
async def get_ocr_job(job_id: str) -> OcrJobResponse:
    db = get_supabase()
    repo = OcrJobRepository(db)
    job = repo.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="任务不存在")
    return OcrJobResponse(
        id=job["id"],
        status=job["status"],
        image_count=job["image_count"],
        results=job["results"] or [],
    )


async def _process_ocr_job(job_id: str, image_data: list[tuple[int, bytes, str]]) -> None:
    db = get_supabase()
    repo = OcrJobRepository(db)
    engine = _get_engine()
    repo.update_status(job_id, "processing")

    results = []
    CONCURRENCY = 2

    async def process_one(order: int, data: bytes, mime: str) -> dict:
        try:
            text = await engine.recognize(data, mime)
            return {"order": order, "text": text, "status": "success"}
        except Exception as e:
            return {"order": order, "text": "", "status": "error", "error_msg": str(e)}

    for i in range(0, len(image_data), CONCURRENCY):
        batch = image_data[i : i + CONCURRENCY]
        batch_results = await asyncio.gather(*[process_one(*item) for item in batch])
        results.extend(batch_results)

    has_error = all(r["status"] == "error" for r in results)
    final_status = "error" if has_error else "success"
    repo.update_status(job_id, final_status, results)
