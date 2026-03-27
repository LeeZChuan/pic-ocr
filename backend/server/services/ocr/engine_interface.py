from abc import ABC, abstractmethod


class OcrEngine(ABC):
    @abstractmethod
    async def recognize(self, image_data: bytes, mime_type: str) -> str:
        ...
