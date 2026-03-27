import base64
import httpx
from server.services.ocr.engine_interface import OcrEngine
from server.config import settings


class OcrSpaceEngine(OcrEngine):
    API_URL = "https://api.ocr.space/parse/image"

    async def recognize(self, image_data: bytes, mime_type: str) -> str:
        b64 = base64.b64encode(image_data).decode()
        data_url = f"data:{mime_type};base64,{b64}"

        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.post(
                self.API_URL,
                headers={"apikey": settings.ocr_space_api_key},
                data={
                    "base64Image": data_url,
                    "language": "chs",
                    "isOverlayRequired": "false",
                    "OCREngine": "2",
                },
            )
            response.raise_for_status()
            result = response.json()

        if result.get("IsErroredOnProcessing"):
            errors = result.get("ErrorMessage", ["OCR 处理失败"])
            raise RuntimeError(", ".join(errors))

        parsed = result.get("ParsedResults", [{}])[0]
        if parsed.get("FileParseExitCode") != 1:
            raise RuntimeError(parsed.get("ErrorMessage", "OCR 解析失败"))

        return parsed.get("ParsedText", "")
