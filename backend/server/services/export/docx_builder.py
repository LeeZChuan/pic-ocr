import io
from datetime import datetime
from docx import Document
from docx.shared import Pt


def build_docx(results: list[dict]) -> bytes:
    doc = Document()
    title = datetime.now().strftime("合同识别结果_%Y%m%d_%H%M")
    doc.add_heading(title, level=1)

    sorted_results = sorted(results, key=lambda r: r.get("order", 0))

    for item in sorted_results:
        order = item.get("order", 0)
        text = item.get("text", "")
        doc.add_heading(f"第{order + 1}页", level=2)
        para = doc.add_paragraph()
        run = para.add_run(text)
        run.font.size = Pt(12)
        doc.add_paragraph()

    buffer = io.BytesIO()
    doc.save(buffer)
    return buffer.getvalue()
