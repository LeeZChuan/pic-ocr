export type OcrResult = {
  text: string
  confidence?: number
}

const POLL_INTERVAL_MS = 500
const MAX_POLL_TIMES = 60

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function runOcrViaBackend(file: File): Promise<OcrResult> {
  const formData = new FormData()
  formData.append('images', file)

  const response = await fetch('/api/ocr/jobs', {
    method: 'POST',
    body: formData,
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({ detail: 'OCR 请求失败' }))
    throw new Error(err.detail ?? 'OCR 请求失败')
  }

  const job = await response.json() as { id: string }
  if (!job?.id) {
    throw new Error('OCR 任务创建失败')
  }

  for (let i = 0; i < MAX_POLL_TIMES; i += 1) {
    await sleep(POLL_INTERVAL_MS)
    const statusRes = await fetch(`/api/ocr/jobs/${job.id}`)
    if (!statusRes.ok) {
      continue
    }
    const data = await statusRes.json() as {
      status: string
      results: Array<{ order: number; text: string; status: string; error_msg?: string }>
    }
    if (data.status === 'success') {
      const first = (data.results || []).sort((a, b) => a.order - b.order)[0]
      if (!first) return { text: '' }
      if (first.status === 'error') {
        throw new Error(first.error_msg ?? '识别失败')
      }
      return { text: first.text ?? '' }
    }
    if (data.status === 'error') {
      const first = (data.results || [])[0]
      throw new Error(first?.error_msg ?? '识别失败')
    }
  }

  throw new Error('OCR 超时，请稍后重试')
}

export async function runOcr(file: File): Promise<OcrResult> {
  return runOcrViaBackend(file)
}

export async function runOcrBatch(
  files: File[],
  concurrency = 2,
  onProgress?: (index: number, result: OcrResult | null, error?: string) => void
): Promise<(OcrResult | null)[]> {
  const results: (OcrResult | null)[] = new Array(files.length).fill(null)

  for (let i = 0; i < files.length; i += concurrency) {
    const batch = files.slice(i, i + concurrency)
    const batchResults = await Promise.allSettled(batch.map((f) => runOcr(f)))

    batchResults.forEach((r, j) => {
      const idx = i + j
      if (r.status === 'fulfilled') {
        results[idx] = r.value
        onProgress?.(idx, r.value)
      } else {
        results[idx] = null
        onProgress?.(idx, null, r.reason?.message ?? '识别失败')
      }
    })
  }

  return results
}
