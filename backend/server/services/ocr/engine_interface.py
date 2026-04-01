from abc import ABC, abstractmethod
from typing import TypedDict, Optional, List


class OcrLine(TypedDict):
    text: str
    conf: Optional[float]
    box: Optional[List[List[float]]]


class OcrResult(TypedDict):
    text: str
    lines: List[OcrLine]
    avg_conf: Optional[float]


class OcrEngine(ABC):
    @abstractmethod
    async def recognize(self, image_data: bytes, mime_type: str) -> OcrResult:
        ...
