import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { OcrCard } from './components/OcrCard'
import { ExportPanel } from './components/ExportPanel'
import { ImagePreviewModal } from '../contractOcrUpload/components/ImagePreviewModal'
import { useContractOcrStore } from '@/store/contractOcrStore'
import { runOcr } from '@/services/ocrService'
import { notifyError } from '@/utils/notify'
import type { UploadImageItem } from '@/types/contractOcr'

export default function ContractOcrEditorPage() {
  const navigate = useNavigate()
  const [previewItem, setPreviewItem] = useState<UploadImageItem | null>(null)
  const hasStarted = useRef(false)

  const { items, updateOcrText, updateOcrStatus, setRecognizing } = useContractOcrStore()

  useEffect(() => {
    if (items.length === 0) {
      navigate('/')
      return
    }
    if (hasStarted.current) return
    hasStarted.current = true

    runBatchOcr()
  }, [])

  const runBatchOcr = async () => {
    const pendingItems = items.filter((i) => i.ocrStatus === 'idle')
    if (pendingItems.length === 0) return

    setRecognizing(true)

    const CONCURRENCY = 2
    for (let i = 0; i < pendingItems.length; i += CONCURRENCY) {
      const batch = pendingItems.slice(i, i + CONCURRENCY)
      await Promise.allSettled(
        batch.map(async (item) => {
          updateOcrStatus(item.id, 'processing')
          try {
            const result = await runOcr(item.file)
            updateOcrStatus(item.id, 'success', result.text)
          } catch (e) {
            const msg = e instanceof Error ? e.message : '识别失败'
            updateOcrStatus(item.id, 'error', undefined, msg)
          }
        })
      )
    }

    setRecognizing(false)
  }

  const handleRetry = async (id: string) => {
    const item = items.find((i) => i.id === id)
    if (!item) return

    updateOcrStatus(id, 'processing')
    try {
      const result = await runOcr(item.file)
      updateOcrStatus(id, 'success', result.text)
    } catch (e) {
      const msg = e instanceof Error ? e.message : '识别失败'
      updateOcrStatus(id, 'error', undefined, msg)
      notifyError(`第 ${item.order + 1} 页识别失败：${msg}`)
    }
  }

  const sortedItems = [...items].sort((a, b) => a.order - b.order)

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 bg-card border-b border-border px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-xl font-semibold text-foreground">识别编辑</h1>
              <p className="text-sm text-muted-foreground">
                共 {items.length} 张图片
                {items.filter((i) => i.ocrStatus === 'success').length > 0 &&
                  `，已识别 ${items.filter((i) => i.ocrStatus === 'success').length} 张`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {items.filter((i) => i.ocrStatus === 'processing').length > 0 &&
                `正在识别第 ${
                  items.findIndex((i) => i.ocrStatus === 'processing') + 1
                } 张...`}
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6 pb-32 space-y-4">
        {sortedItems.map((item) => (
          <OcrCard
            key={item.id}
            item={item}
            onTextChange={updateOcrText}
            onRetry={handleRetry}
            onPreview={setPreviewItem}
          />
        ))}
      </main>

      <ExportPanel items={sortedItems} />

      <ImagePreviewModal
        src={previewItem?.previewUrl ?? null}
        index={previewItem?.order ?? 0}
        onClose={() => setPreviewItem(null)}
      />
    </div>
  )
}
