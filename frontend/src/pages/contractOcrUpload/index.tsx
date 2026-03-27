import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { X, ZoomIn, FileImage, AlertCircle, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ImagePreviewModal } from './components/ImagePreviewModal'
import { UploadComposer } from './components/UploadComposer'
import { useContractOcrStore } from '@/store/contractOcrStore'
import { notifyError, notifyWarning } from '@/utils/notify'
import type { UploadImageItem } from '@/types/contractOcr'

export default function ContractOcrUploadPage() {
  const navigate = useNavigate()
  const [previewItem, setPreviewItem] = useState<UploadImageItem | null>(null)

  const {
    items,
    userPlan,
    isRecognizing,
    addImages,
    removeImage,
    clearAll,
    setRecognizing,
  } = useContractOcrStore()

  const MAX_FREE = 10
  const limit = userPlan.isPro ? Infinity : MAX_FREE

  const handleFilesSelected = (files: File[]) => {
    const { added, errors } = addImages(files)
    errors.forEach((e) => notifyError(e))
    if (added === 0 && errors.length === 0) {
      notifyWarning('没有可添加的文件')
    }
  }

  const handleStartOcr = () => {
    if (items.length === 0) {
      notifyWarning('请先上传图片')
      return
    }
    setRecognizing(true)
    navigate('/editor')
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-border px-6 py-5">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-2xl font-semibold text-foreground">合同识别</h1>
          <p className="text-sm text-muted-foreground mt-0.5">上传合同图片，自动识别文字内容并导出</p>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8 space-y-6 pb-28">
        <div className="bg-card border border-border rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-medium text-foreground">上传图片</h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                支持 JPG、PNG、WEBP，单文件最大 15MB
                {!userPlan.isPro && `，最多上传 ${MAX_FREE} 张`}
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-sm">
              <span className={items.length >= MAX_FREE && !userPlan.isPro ? 'text-destructive font-medium' : 'text-foreground font-medium'}>
                {items.length}
              </span>
              {!userPlan.isPro && (
                <span className="text-muted-foreground">/ {MAX_FREE}</span>
              )}
              <span className="text-muted-foreground">张</span>
            </div>
          </div>

          <UploadComposer
            onFilesSelected={handleFilesSelected}
            disabled={items.length >= limit}
          />

          {!userPlan.isPro && items.length >= MAX_FREE && (
            <div className="flex items-start gap-2 p-3 bg-warning/10 border border-warning/20 rounded-lg">
              <AlertCircle className="w-4 h-4 text-warning flex-shrink-0 mt-0.5" />
              <p className="text-sm text-warning">已达到 {MAX_FREE} 张上限，升级到专业版可无限上传</p>
            </div>
          )}
        </div>

        {items.length > 0 ? (
          <div className="bg-card border border-border rounded-xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-medium text-foreground">
                已选图片
                <span className="ml-2 text-sm font-normal text-muted-foreground">({items.length} 张)</span>
              </h2>
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-destructive"
                onClick={clearAll}
              >
                <X className="w-4 h-4" />
                清空全部
              </Button>
            </div>

            <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2">
              {[...items].sort((a, b) => a.order - b.order).map((item) => (
                <ImageThumb
                  key={item.id}
                  item={item}
                  onRemove={removeImage}
                  onPreview={setPreviewItem}
                />
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center mb-4">
              <FileImage className="w-8 h-8 text-muted-foreground" />
            </div>
            <p className="text-base font-medium text-muted-foreground">暂无图片</p>
            <p className="text-sm text-muted-foreground/70 mt-1">点击上方区域或拖拽图片到此处</p>
          </div>
        )}
      </main>

      {items.length > 0 && (
        <div className="fixed bottom-0 inset-x-0 bg-card/95 backdrop-blur border-t border-border px-6 py-4">
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              已上传{' '}
              <span className="font-medium text-foreground">{items.length}</span>{' '}
              张图片，准备好后点击开始识别
            </p>
            <Button
              size="lg"
              onClick={handleStartOcr}
              loading={isRecognizing}
              className="gap-2"
            >
              开始识别
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      <ImagePreviewModal
        src={previewItem?.previewUrl ?? null}
        index={previewItem?.order ?? 0}
        onClose={() => setPreviewItem(null)}
      />
    </div>
  )
}

function ImageThumb({
  item,
  onRemove,
  onPreview,
}: {
  item: UploadImageItem
  onRemove: (id: string) => void
  onPreview: (item: UploadImageItem) => void
}) {
  return (
    <div className="relative group aspect-square rounded-lg overflow-hidden border border-border bg-secondary cursor-pointer">
      <img
        src={item.previewUrl}
        alt={`图片 ${item.order + 1}`}
        className="w-full h-full object-cover"
        onClick={() => onPreview(item)}
      />
      <div
        className="absolute inset-0 bg-black/0 group-hover:bg-black/25 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100"
        onClick={() => onPreview(item)}
      >
        <ZoomIn className="w-4 h-4 text-white drop-shadow" />
      </div>
      <button
        className="absolute top-1 right-1 w-5 h-5 bg-black/60 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/90 z-10"
        onClick={(e) => { e.stopPropagation(); onRemove(item.id) }}
      >
        <X className="w-3 h-3 text-white" />
      </button>
      <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-[10px] text-center py-0.5">
        {item.order + 1}
      </div>
    </div>
  )
}
