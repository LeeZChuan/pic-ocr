import io
from datetime import datetime
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.styles import ParagraphStyle
import os


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

    title_style = ParagraphStyle(
        "title",
        fontName=font_name,
        fontSize=16,
        spaceAfter=12,
        alignment=TA_LEFT,
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

    title = datetime.now().strftime("合同识别结果_%Y%m%d_%H%M")
    story = [Paragraph(title, title_style), Spacer(1, 6 * mm)]

    sorted_results = sorted(results, key=lambda r: r.get("order", 0))
    for item in sorted_results:
        order = item.get("order", 0)
        text = item.get("text", "(空)")
        story.append(Paragraph(f"第{order + 1}页", heading_style))
        for line in text.splitlines():
            story.append(Paragraph(line or " ", body_style))
        story.append(Spacer(1, 4 * mm))

    doc.build(story)
    return buffer.getvalue()
