# 合同 OCR 前端

## 本地启动
```bash
cd /Users/edy/Desktop/github-code/pic-ocr/frontend
npm install
npm run dev
```

默认开发端口：`http://localhost:5173`

## 代理说明
开发环境已在 `vite.config.ts` 里配置 `/api` 代理到 `http://127.0.0.1:8000`。
因此前端访问 `/api/ocr/jobs`、`/api/export/jobs` 会自动走本地后端。

## 常见问题
1. OCR 请求失败但后端正常  
   请确认前端是通过 `/api/ocr/jobs` 调用，并且 Vite 代理已指向 `http://127.0.0.1:8000`。

2. 本地后端安装依赖时出现 `SSL: CERTIFICATE_VERIFY_FAILED`  
   见后端文档：`/Users/edy/Desktop/github-code/pic-ocr/backend/README.md` 的 “常见问题：pip SSL 证书错误”。
