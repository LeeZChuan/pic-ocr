import { supabase } from '@/lib/supabase'

export type OcrResult = {
  text: string
  confidence?: number
}

async function runOcrViaEdgeFunction(file: File): Promise<OcrResult> {
  const formData = new FormData()
  formData.append('image', file)

  const { data: { session } } = await supabase.auth.getSession()

  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ocr-process`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session?.access_token ?? import.meta.env.VITE_SUPABASE_SUPABASE_ANON_KEY}`,
      },
      body: formData,
    }
  )

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: 'OCR 请求失败' }))
    throw new Error(err.error ?? 'OCR 请求失败')
  }

  const result = await response.json() as OcrResult
  return result
}

export async function runOcr(file: File): Promise<OcrResult> {
  return runOcrViaEdgeFunction(file)
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
