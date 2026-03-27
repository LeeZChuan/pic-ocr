# 产出文档（Output Documents）

## 1. 本项目应交付清单

## 1.1 需求与设计产物
- `核心规格文档（The Specification）`
- `过程驱动文档（Process Documents）`
- `产出文档（Output Documents）`
- 页面线框图（上传页、识别编辑页）
- 关键交互说明（状态流、错误提示、导出反馈）

## 1.2 工程交付产物
- 页面A：上传页（会话式上传 + 预览 + 限制逻辑）
- 页面B：识别编辑页（左图右文 + 实时编辑 + 重试）
- OCR服务层（可切换 Mock / 实际OCR）
- 导出服务层（`docx` / `pdf`）
- 埋点与错误日志

## 1.3 测试与验收产物
- 测试用例文档（功能/边界/异常）
- 冒烟测试报告
- 发布说明（版本号、功能范围、已知问题）

## 2. 文件级开发任务拆解（建议）
以下路径为建议命名，Agent 可按项目结构微调：

- `src/pages/contractOcrUpload/index.tsx`
  - 上传页主容器与会话消息流。
- `src/pages/contractOcrUpload/components/UploadComposer.tsx`
  - 上传输入区（按钮+拖拽）。
- `src/pages/contractOcrUpload/components/ImageBubbleList.tsx`
  - 图片缩略图与预览。
- `src/pages/contractOcrEditor/index.tsx`
  - 识别编辑页容器。
- `src/pages/contractOcrEditor/components/OcrCard.tsx`
  - 左图右文卡片。
- `src/store/contractOcrStore.ts`
  - 全局状态（上传项、识别状态、文本编辑）。
- `src/services/ocrService.ts`
  - OCR调用封装（MVP可本地实现）。
- `src/services/exportService.ts`
  - `docx`/`pdf` 导出封装。
- `src/types/contractOcr.ts`
  - 类型定义。

## 3. 里程碑输出要求
- M1（上传页完成）：可上传、可预览、限制正确。
- M2（识别编辑完成）：可识别、可编辑、可重试。
- M3（导出完成）：可导出 `docx/pdf` 且顺序正确。
- M4（上线准备）：测试通过、埋点在线、文档齐套。

## 4. 发布门禁（Go/No-Go）
- P0问题为0（阻断级）。
- 导出成功率达到验收线（>=95%）。
- 关键路径性能可接受（10张图内可交互）。
- 回滚方案明确（开关关闭新入口）。
