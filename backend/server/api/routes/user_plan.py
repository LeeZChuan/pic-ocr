from fastapi import APIRouter
from pydantic import BaseModel
from server.config import settings

router = APIRouter(prefix="/api/user", tags=["user"])


class UserPlanResponse(BaseModel):
    is_pro: bool
    max_images: int
    used_images: int = 0


@router.get("/plan", response_model=UserPlanResponse)
async def get_user_plan() -> UserPlanResponse:
    return UserPlanResponse(
        is_pro=False,
        max_images=settings.max_free_images,
        used_images=0,
    )
