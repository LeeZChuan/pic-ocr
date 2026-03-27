from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from server.api.routes import user_plan, ocr_jobs, export_jobs

app = FastAPI(title="合同 OCR 后台服务", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(user_plan.router)
app.include_router(ocr_jobs.router)
app.include_router(export_jobs.router)


@app.get("/health")
async def health() -> dict:
    return {"status": "ok"}
