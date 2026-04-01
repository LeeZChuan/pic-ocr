from uuid import uuid4
from fastapi import APIRouter, UploadFile, File, HTTPException
from pydantic import BaseModel
from server.config import settings
from server.infra.storage import StorageService

router = APIRouter(prefix="/api/upload", tags=["upload"])

ALLOWED_TYPES = {"image/jpeg", "image/jpg", "image/png", "image/webp"}
MAX_SIZE_BYTES = 15 * 1024 * 1024


class UploadImagesResponse(BaseModel):
    batch_id: str
    image_count: int
    file_ids: list[str]


@router.post("/images", response_model=UploadImagesResponse)
async def upload_images(
    images: list[UploadFile] = File(...),
) -> UploadImagesResponse:
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
        chunk = await img.read(MAX_SIZE_BYTES + 1)
        size = len(chunk)
        await img.seek(0)
        if size > MAX_SIZE_BYTES:
            raise HTTPException(status_code=400, detail=f"{img.filename}：超过 15MB 限制")

    storage = StorageService()
    batch_id = uuid4().hex
    file_ids: list[str] = []

    for i, img in enumerate(images):
        data = await img.read()
        content_type = img.content_type or "image/jpeg"
        path = storage.upload_image(batch_id, i, data, content_type)
        file_ids.append(path)

    return UploadImagesResponse(batch_id=batch_id, image_count=len(images), file_ids=file_ids)
