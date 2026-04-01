# 合同 OCR 后端服务

## 简介
提供“上传图片 -> OCR识别 -> 导出 docx/pdf”的后端能力，支持本地 RapidOCR、OCR.Space 与 Mock 引擎切换。导出时可对低置信文本标注“待确认”，并按图片顺序生成合同版式文档。

## 技术方案
- Web 框架：FastAPI + Uvicorn
- OCR 引擎：RapidOCR（本地）/ OCR.Space（云）/ Mock
- 导出：python-docx（docx）、reportlab（pdf）
- 存储：本地文件系统（原图与导出文件）
- 任务：FastAPI BackgroundTasks（MVP）

## 目录与文件职责
- `main.py`：应用入口、路由注册、健康检查
- `server/config.py`：配置与环境变量
- `server/api/routes/*`：HTTP 接口
  - `user_plan.py`：用户计划与配额
  - `upload_images.py`：图片上传到对象存储
  - `ocr_jobs.py`：OCR 任务创建与查询
  - `export_jobs.py`：导出任务创建与查询
- `server/services/ocr/*`：OCR 引擎实现与统一接口
- `server/services/export/*`：docx/pdf 生成逻辑
- `server/infra/repository.py`：本地内存任务存储（MVP）
- `server/infra/storage.py`：本地文件存储

## API 简表
- `GET /health`：健康检查
- `GET /api/user/plan`：返回用户配额
- `POST /api/upload/images`：上传图片，返回 `file_ids`
  - `multipart/form-data`，字段名 `images`
- `POST /api/ocr/jobs`：创建 OCR 任务
  - 方式1：`multipart/form-data`，字段名 `images`
  - 方式2：`application/json`，`{ "file_ids": ["path/0.png", ...] }`
- `GET /api/ocr/jobs/{job_id}`：查询 OCR 任务状态与结果
- `POST /api/export/jobs`：创建导出任务（`docx`/`pdf`）
- `GET /api/export/jobs/{job_id}`：查询导出状态与下载地址
- `GET /api/export/jobs/{job_id}/download`：直接下载导出文件

## 环境变量
- `STORAGE_ROOT`：本地存储目录（默认 `storage`）
- `OCR_ENGINE`：`auto` | `rapidocr` | `ocr_space` | `mock`
- `OCR_SPACE_API_KEY`：OCR.Space Key（如使用该引擎）
- `MAX_FREE_IMAGES`：普通用户最大上传数（默认 10）
- `LOW_CONFIDENCE_THRESHOLD`：低置信标注阈值（默认 0.6）

## 本地启动
```bash
cd /Users/edy/Desktop/github-code/pic-ocr/backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

export STORAGE_ROOT=storage
export OCR_ENGINE=rapidocr

uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

运行测试：
```bash
python3 -m pytest tests
```

## 常见问题：pip SSL 证书错误
如果执行 `pip install -r requirements.txt` 出现 `SSL: CERTIFICATE_VERIFY_FAILED`，可按以下方式处理：

macOS（官方 Python 安装）：
```bash
open "/Applications/Python 3.9/Install Certificates.command"
```

通用方案（使用 certifi）：
```bash
python -m pip install --upgrade pip certifi
export SSL_CERT_FILE=$(python -c "import certifi; print(certifi.where())")
pip install -r requirements.txt
```

公司网络/代理环境下临时绕过：
```bash
pip install -r requirements.txt --trusted-host pypi.org --trusted-host files.pythonhosted.org
```

## 部署流程（Docker）
```bash
cd /Users/edy/Desktop/github-code/pic-ocr/backend
docker build -t pic-ocr-backend .
docker run -p 8000:8000 \
  -e STORAGE_ROOT=storage \
  -e OCR_ENGINE=rapidocr \
  pic-ocr-backend
```

## 部署流程（非 Docker）
1. 在服务器准备 Python 3.9+ 与系统依赖（推荐安装中文字体包）。
2. 创建虚拟环境并安装依赖。
3. 配置环境变量（同上）。
4. 启动服务：
```bash
uvicorn main:app --host 0.0.0.0 --port 8000
```
5. 生产建议：用 Nginx 反向代理 + 进程守护（systemd / supervisord）。
