import asyncio
from server.services.ocr.engine_interface import OcrEngine, OcrResult

MOCK_TEXTS = [
    "合同编号：HT-2024-001\n\n甲方：某某科技有限公司\n乙方：合作方名称\n\n第一条 服务内容\n本协议就甲方委托乙方提供相关技术服务事宜达成如下协议。\n\n第二条 服务期限\n本协议自签订之日起生效，有效期为一年。",
    "采购合同\n\n购买方：某某企业\n供应方：供应商名称\n\n商品名称：办公设备\n数量：10台\n单价：2,500元\n总价：25,000元\n\n交货时间：签订合同后15个工作日内",
]

_counter = 0


class MockOcrEngine(OcrEngine):
    async def recognize(self, image_data: bytes, mime_type: str) -> OcrResult:
        global _counter
        await asyncio.sleep(0.5)
        text = MOCK_TEXTS[_counter % len(MOCK_TEXTS)]
        _counter += 1
        lines = [
            {"text": line, "conf": 0.98, "box": None}
            for line in text.splitlines()
            if line.strip() != ""
        ]
        return {"text": text, "lines": lines, "avg_conf": 0.98 if lines else None}
