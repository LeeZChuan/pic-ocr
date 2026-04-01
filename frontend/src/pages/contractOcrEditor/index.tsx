import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, GripVertical } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { OcrCard } from './components/OcrCard'
import { ExportPanel } from './components/ExportPanel'
import { ImagePreviewModal } from '../contractOcrUpload/components/ImagePreviewModal'
import { useContractOcrStore } from '@/store/contractOcrStore'
import { runOcr } from '@/services/ocrService'
import { notifyError } from '@/utils/notify'
import { cn } from '@/lib/utils'
import type { UploadImageItem } from '@/types/contractOcr'

export default function ContractOcrEditorPage() {
  const navigate = useNavigate()
  const [previewItem, setPreviewItem] = useState<UploadImageItem | null>(null)
  const hasStarted = useRef(false)
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState<{ id: string; position: 'before' | 'after' } | null>(null)
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(() => new Set())

  const { items, updateOcrText, updateOcrStatus, setRecognizing, moveItem } = useContractOcrStore()

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

  const handleDragStart = (id: string) => (e: React.DragEvent) => {
    setDraggingId(id)
    setDragOver(null)
    try {
      e.dataTransfer.setData('text/plain', id)
      e.dataTransfer.effectAllowed = 'move'
    } catch {
      // ignore
    }
  }

  const handleDragEnd = () => {
    setDraggingId(null)
    setDragOver(null)
  }

  const handleDragOver = (overId: string) => (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()

    const activeId = draggingId ?? e.dataTransfer.getData('text/plain')
    if (!activeId || activeId === overId) {
      setDragOver(null)
      return
    }

    const rect = e.currentTarget.getBoundingClientRect()
    const isAfter = e.clientY - rect.top > rect.height / 2
    setDragOver({ id: overId, position: isAfter ? 'after' : 'before' })
    e.dataTransfer.dropEffect = 'move'
  }

  const handleDrop = (overId: string) => (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()

    const activeId = e.dataTransfer.getData('text/plain') || draggingId
    if (!activeId || activeId === overId) {
      setDragOver(null)
      setDraggingId(null)
      return
    }

    const position =
      dragOver?.id === overId ? dragOver.position : 'before'

    moveItem(activeId, overId, position)
    setDragOver(null)
    setDraggingId(null)
  }

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
        {sortedItems.map((item) => {
          const isDragging = draggingId === item.id
          const isOver = dragOver?.id === item.id
          const showBefore = isOver && dragOver?.position === 'before'
          const showAfter = isOver && dragOver?.position === 'after'
          const isCollapsed = collapsedIds.has(item.id)

          return (
            <div
              key={item.id}
              className={cn(
                'relative',
                showBefore && "before:content-[''] before:absolute before:left-0 before:right-0 before:top-[-6px] before:h-1 before:rounded-full before:bg-primary",
                showAfter && "after:content-[''] after:absolute after:left-0 after:right-0 after:bottom-[-6px] after:h-1 after:rounded-full after:bg-primary",
                isDragging && 'opacity-60'
              )}
              onDragOver={handleDragOver(item.id)}
              onDrop={handleDrop(item.id)}
            >
              <OcrCard
                item={item}
                onTextChange={updateOcrText}
                onRetry={handleRetry}
                onPreview={setPreviewItem}
                collapsed={isCollapsed}
                onToggleCollapse={() => {
                  setCollapsedIds((prev) => {
                    const next = new Set(prev)
                    if (next.has(item.id)) {
                      next.delete(item.id)
                    } else {
                      next.add(item.id)
                    }
                    return next
                  })
                }}
                dragHandle={
                  <button
                    type="button"
                    draggable
                    onDragStart={handleDragStart(item.id)}
                    onDragEnd={handleDragEnd}
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                    }}
                    className="inline-flex items-center justify-center -ml-2 p-1 rounded text-muted-foreground/70 hover:text-foreground hover:bg-secondary/60 cursor-grab active:cursor-grabbing opacity-40 group-hover/drag:opacity-100 focus-visible:opacity-100"
                    title="拖拽调整顺序"
                    aria-label="拖拽调整顺序"
                  >
                    <GripVertical className="w-4 h-4" />
                  </button>
                }
              />
            </div>
          )
        })}
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
