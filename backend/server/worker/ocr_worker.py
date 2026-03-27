"""
OCR Worker - 当需要将 OCR 处理解耦为独立进程时使用。
目前 OCR 任务通过 FastAPI BackgroundTasks 在进程内异步处理。
如需扩展为 Celery/ARQ 等任务队列，在此模块实现 worker 逻辑。
"""
