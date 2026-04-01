import io
import re
from typing import Optional, List
from docx import Document
from docx.shared import Pt
from docx.oxml.ns import qn
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
    all_lines: list[str] = []
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
    return all_lines


def build_docx(results: list[dict]) -> bytes:
    doc = Document()
    style = doc.styles["Normal"]
    style.font.name = "宋体"
    style._element.rPr.rFonts.set(qn("w:eastAsia"), "宋体")
    style.font.size = Pt(12)

    lines = _extract_lines(results)

    for line in lines:
        if not line.strip():
            doc.add_paragraph("")
            continue
        para = doc.add_paragraph(line)
        para.paragraph_format.first_line_indent = Pt(24)
        text = line.strip()
        if SECTION_RE.match(text) or ARTICLE_RE.match(text):
            para.paragraph_format.first_line_indent = Pt(0)
            if para.runs:
                para.runs[0].bold = True

    section = doc.sections[0]
    section.top_margin = Pt(72)
    section.bottom_margin = Pt(72)
    section.left_margin = Pt(90)
    section.right_margin = Pt(90)

    buffer = io.BytesIO()
    doc.save(buffer)
    return buffer.getvalue()
