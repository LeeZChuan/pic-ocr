/*
  # 创建 OCR 任务与导出任务表

  ## 新建表
  - `ocr_jobs`：存储 OCR 识别任务状态与结果
    - id (uuid, pk)
    - user_id (uuid, 关联 auth.users，可为空支持匿名)
    - status: pending | processing | success | error
    - image_count: 图片数量
    - results: jsonb 数组，每项包含 order/text/confidence/status/error_msg
    - created_at / updated_at

  - `export_jobs`：存储导出任务状态
    - id (uuid, pk)
    - user_id (uuid, 可为空)
    - ocr_job_id (uuid, 关联 ocr_jobs)
    - format: docx | pdf
    - status: pending | processing | success | error
    - download_url: 导出文件下载链接
    - created_at / updated_at

  ## 安全
  - 所有表启用 RLS
  - 认证用户只能操作自己的记录
  - 匿名场景下 user_id 为 null，数据仅在会话期间使用（不持久化关联）
*/

CREATE TABLE IF NOT EXISTS ocr_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'success', 'error')),
  image_count integer NOT NULL DEFAULT 0,
  results jsonb NOT NULL DEFAULT '[]',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS export_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ocr_job_id uuid REFERENCES ocr_jobs(id) ON DELETE CASCADE,
  format text NOT NULL CHECK (format IN ('docx', 'pdf')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'success', 'error')),
  download_url text,
  error_msg text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ocr_jobs_user_id ON ocr_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_ocr_jobs_status ON ocr_jobs(status);
CREATE INDEX IF NOT EXISTS idx_export_jobs_user_id ON export_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_export_jobs_ocr_job_id ON export_jobs(ocr_job_id);

ALTER TABLE ocr_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE export_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own ocr jobs"
  ON ocr_jobs FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own ocr jobs"
  ON ocr_jobs FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own ocr jobs"
  ON ocr_jobs FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own ocr jobs"
  ON ocr_jobs FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view own export jobs"
  ON export_jobs FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own export jobs"
  ON export_jobs FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own export jobs"
  ON export_jobs FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own export jobs"
  ON export_jobs FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
