from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    ocr_space_api_key: str = ""
    ocr_engine: str = "auto"
    storage_root: str = "storage"
    max_free_images: int = 10
    low_confidence_threshold: float = 0.6

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
