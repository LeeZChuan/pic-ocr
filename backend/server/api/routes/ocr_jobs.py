import asyncio
from typing import Optional, List
from fastapi import APIRouter, UploadFile, File, HTTPException, BackgroundTasks, Request
from pydantic import BaseModel
import httpx
from server.infra.repository import get_supabase, OcrJobRepository
from server.infra.storage import StorageService
from server.services.ocr.mock_engine import MockOcrEngine
from server.services.ocr.ocr_space_engine import OcrSpaceEngine
try:
    from server.services.ocr.rapidocr_engine import RapidOcrEngine
    _HAS_RAPIDOCR = True
except Exception:
    RapidOcrEngine = None
    _HAS_RAPIDOCR = False
from server.config import settings

router = APIRouter(prefix="/api/ocr", tags=["ocr"])

ALLOWED_TYPES = {"image/jpeg", "image/jpg", "image/png", "image/webp"}
MAX_SIZE_BYTES = 15 * 1024 * 1024


def _get_engine():
    engine = settings.ocr_engine.lower()
    if engine == "rapidocr":
        if not _HAS_RAPIDOCR or RapidOcrEngine is None:
            raise RuntimeError("RapidOCR 不可用，请检查依赖是否已安装")
        return RapidOcrEngine()
    if engine == "ocr_space":
        if not settings.ocr_space_api_key:
            raise RuntimeError("ocr_space_api_key 未配置")
        return OcrSpaceEngine()
    if engine == "mock":
        return MockOcrEngine()
    if _HAS_RAPIDOCR and RapidOcrEngine is not None:
        return RapidOcrEngine()
    if settings.ocr_space_api_key:
        return OcrSpaceEngine()
    return MockOcrEngine()

def _guess_mime(path: str) -> str:
    ext = path.rsplit(".", 1)[-1].lower()
    if ext in ("jpg", "jpeg"):
        return "image/jpeg"
    if ext == "png":
        return "image/png"
    if ext == "webp":
        return "image/webp"
    return "image/jpeg"


class OcrJobResponse(BaseModel):
    id: str
    status: str
    image_count: int
    results: list[dict]


@router.post("/jobs", response_model=OcrJobResponse)
async def create_ocr_job(
    background_tasks: BackgroundTasks,
    request: Request,
    images: Optional[List[UploadFile]] = File(default=None),
) -> OcrJobResponse:
    file_ids: Optional[List[str]] = None
    if not images:
        try:
            payload = await request.json()
            if isinstance(payload, dict):
                file_ids = payload.get("file_ids")
        except Exception:
            file_ids = None

    if not images and not file_ids:
        raise HTTPException(status_code=400, detail="请上传至少一张图片")

    if images:
        if len(images) > settings.max_free_images:
            raise HTTPException(
                status_code=400,
                detail=f"超过 {settings.max_free_images} 张限制",
            )

        for img in images:
            if img.content_type not in ALLOWED_TYPES:
                raise HTTPException(status_code=400, detail=f"{img.filename}：格式不支持")
            chunk = await img.read(MAX_SIZE_BYTES + 1)
            size = len(chunk)
            await img.seek(0)
            if size > MAX_SIZE_BYTES:
                raise HTTPException(status_code=400, detail=f"{img.filename}：超过 15MB 限制")
    else:
        if not isinstance(file_ids, list) or len(file_ids) == 0:
            raise HTTPException(status_code=400, detail="file_ids 不能为空")
        if len(file_ids) > settings.max_free_images:
            raise HTTPException(
                status_code=400,
                detail=f"超过 {settings.max_free_images} 张限制",
            )

    db = get_supabase()
    repo = OcrJobRepository(db)
    image_count = len(images) if images else len(file_ids or [])
    job = repo.create(user_id=None, image_count=image_count)
    job_id = job["id"]

    image_data = []
    if images:
        for i, img in enumerate(images):
            data = await img.read()
            image_data.append((i, data, img.content_type or "image/jpeg"))
    else:
        storage = StorageService(db)
        async with httpx.AsyncClient(timeout=30) as client:
            for i, file_id in enumerate(file_ids or []):
                if isinstance(file_id, str) and file_id.startswith("http"):
                    url = file_id
                else:
                    url = storage.get_signed_url(str(file_id))
                response = await client.get(url)
                response.raise_for_status()
                mime = _guess_mime(str(file_id))
                image_data.append((i, response.content, mime))

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
            result = await engine.recognize(data, mime)
            return {
                "order": order,
                "text": result.get("text", ""),
                "lines": result.get("lines", []),
                "avg_conf": result.get("avg_conf"),
                "status": "success",
            }
        except Exception as e:
            return {
                "order": order,
                "text": "",
                "lines": [],
                "avg_conf": None,
                "status": "error",
                "error_msg": str(e),
            }

    for i in range(0, len(image_data), CONCURRENCY):
        batch = image_data[i : i + CONCURRENCY]
        batch_results = await asyncio.gather(*[process_one(*item) for item in batch])
        results.extend(batch_results)

    has_error = all(r["status"] == "error" for r in results)
    final_status = "error" if has_error else "success"
    repo.update_status(job_id, final_status, results)
