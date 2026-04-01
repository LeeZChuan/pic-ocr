import io
import re
from typing import Optional, List
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.styles import ParagraphStyle
import os
from server.config import settings


SECTION_RE = re.compile(r"^(一|二|三|四|五|六|七|八|九|十|[0-9]+)[、.]")
ARTICLE_RE = re.compile(r"^第[一二三四五六七八九十0-9]+条")


def _mark_uncertain(line: str, conf: Optional[float]) -> str:
    if conf is None or conf >= settings.low_confidence_threshold:
        return line
    if "：" in line:
        label = line.split("：", 1)[0]
        return f"{label}：【待确认】"
    if ":" in line:
        label = line.split(":", 1)[0]
        return f"{label}:【待确认】"
    return "【待确认】"


def _extract_lines(results: List[dict]) -> List[str]:
    sorted_results = sorted(results, key=lambda r: r.get("order", 0))
    all_lines: List[str] = []
    for item in sorted_results:
        lines = item.get("lines") or []
        if lines:
            for line in lines:
                text = str(line.get("text", "")).strip()
                if not text:
                    continue
                conf = line.get("conf")
                all_lines.append(_mark_uncertain(text, conf))
        else:
            text = str(item.get("text", "")).strip()
            if text:
                for raw in text.splitlines():
                    if raw.strip():
                        all_lines.append(raw.strip())
        all_lines.append("")
    return all_lines


def _register_font() -> str:
    font_paths = [
        "/usr/share/fonts/truetype/wqy/wqy-microhei.ttc",
        "/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc",
        "/System/Library/Fonts/PingFang.ttc",
    ]
    for path in font_paths:
        if os.path.exists(path):
            try:
                pdfmetrics.registerFont(TTFont("CJK", path))
                return "CJK"
            except Exception:
                continue
    return "Helvetica"


def build_pdf(results: list[dict]) -> bytes:
    font_name = _register_font()
    buffer = io.BytesIO()

    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=20 * mm,
        rightMargin=20 * mm,
        topMargin=20 * mm,
        bottomMargin=20 * mm,
    )

    heading_style = ParagraphStyle(
        "heading",
        fontName=font_name,
        fontSize=13,
        spaceAfter=6,
        spaceBefore=12,
        alignment=TA_LEFT,
    )
    body_style = ParagraphStyle(
        "body",
        fontName=font_name,
        fontSize=11,
        spaceAfter=4,
        leading=16,
        alignment=TA_LEFT,
    )

    story = []

    lines = _extract_lines(results)
    for line in lines:
        clean = line.strip()
        if not clean:
            story.append(Spacer(1, 4 * mm))
            continue
        if SECTION_RE.match(clean) or ARTICLE_RE.match(clean):
            story.append(Paragraph(clean, heading_style))
            continue
        story.append(Paragraph(clean, body_style))

    doc.build(story)
    return buffer.getvalue()
