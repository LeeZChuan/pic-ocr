import pytest
from server.services.ocr.mock_engine import MockOcrEngine


@pytest.mark.asyncio
async def test_mock_engine_returns_text():
    engine = MockOcrEngine()
    result = await engine.recognize(b"fake_image_data", "image/jpeg")
    assert isinstance(result, dict)
    assert isinstance(result.get("text"), str)
    assert len(result.get("text", "")) > 0
    assert isinstance(result.get("lines"), list)


@pytest.mark.asyncio
async def test_mock_engine_cycles_texts():
    engine = MockOcrEngine()
    r1 = await engine.recognize(b"img1", "image/jpeg")
    r2 = await engine.recognize(b"img2", "image/jpeg")
    assert isinstance(r1, dict)
    assert isinstance(r2, dict)
    assert r1.get("text") != ""
    assert r2.get("text") != ""
