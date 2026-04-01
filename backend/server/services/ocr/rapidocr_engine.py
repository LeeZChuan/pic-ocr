import io
from typing import List
from PIL import Image
import numpy as np
from rapidocr_onnxruntime import RapidOCR
from server.services.ocr.engine_interface import OcrEngine, OcrResult, OcrLine


def _sort_lines(lines: List[OcrLine]) -> List[OcrLine]:
    def key(line: OcrLine) -> tuple[float, float]:
        box = line.get("box") or []
        if len(box) != 4:
            return (0.0, 0.0)
        ys = [pt[1] for pt in box]
        xs = [pt[0] for pt in box]
        return (sum(ys) / 4.0, sum(xs) / 4.0)

    return sorted(lines, key=key)


class RapidOcrEngine(OcrEngine):
    def __init__(self) -> None:
        self.ocr = RapidOCR()

    async def recognize(self, image_data: bytes, mime_type: str) -> OcrResult:
        image = Image.open(io.BytesIO(image_data)).convert("RGB")
        result, _ = self.ocr(np.array(image))

        lines: List[OcrLine] = []
        for item in result or []:
            box, text, conf = item[0], item[1], item[2]
            if not text:
                continue
            lines.append(
                {
                    "text": str(text),
                    "conf": float(conf) if conf is not None else None,
                    "box": [[float(p[0]), float(p[1])] for p in box] if box else None,
                }
            )

        sorted_lines = _sort_lines(lines)
        text = "\n".join([line["text"] for line in sorted_lines])
        conf_values = [line["conf"] for line in sorted_lines if line["conf"] is not None]
        avg_conf = sum(conf_values) / len(conf_values) if conf_values else None

        return {"text": text, "lines": sorted_lines, "avg_conf": avg_conf}
