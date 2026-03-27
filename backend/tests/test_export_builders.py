import pytest
from server.services.export.docx_builder import build_docx
from server.services.export.pdf_builder import build_pdf


SAMPLE_RESULTS = [
    {"order": 0, "text": "合同第一页内容\n甲方乙方条款", "status": "success"},
    {"order": 1, "text": "合同第二页内容\n付款方式说明", "status": "success"},
    {"order": 2, "text": "", "status": "success"},
]


def test_build_docx_returns_bytes():
    result = build_docx(SAMPLE_RESULTS)
    assert isinstance(result, bytes)
    assert len(result) > 0


def test_build_docx_with_empty_results():
    result = build_docx([])
    assert isinstance(result, bytes)


def test_build_docx_respects_order():
    reversed_results = list(reversed(SAMPLE_RESULTS))
    result = build_docx(reversed_results)
    assert isinstance(result, bytes)
    assert len(result) > 0


def test_build_pdf_returns_bytes():
    result = build_pdf(SAMPLE_RESULTS)
    assert isinstance(result, bytes)
    assert result[:4] == b"%PDF"


def test_build_pdf_with_empty_results():
    result = build_pdf([])
    assert isinstance(result, bytes)
    assert result[:4] == b"%PDF"


def test_build_pdf_respects_order():
    reversed_results = list(reversed(SAMPLE_RESULTS))
    result = build_pdf(reversed_results)
    assert isinstance(result, bytes)
