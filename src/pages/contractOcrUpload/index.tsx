import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bot, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { UploadComposer } from './components/UploadComposer'
import { ImageBubbleList } from './components/ImageBubbleList'
import { ImagePreviewModal } from './components/ImagePreviewModal'
import { useContractOcrStore } from '@/store/contractOcrStore'
import { notifyError, notifyWarning } from '@/utils/notify'
import type { UploadImageItem } from '@/types/contractOcr'

export default function ContractOcrUploadPage() {
  const navigate = useNavigate()
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [previewItem, setPreviewItem] = useState<UploadImageItem | null>(null)

  const {
    items,
    messages,
    isRecognizing,
    addImages,
    removeImage,
    clearAll,
    addMessage,
    setRecognizing,
  } = useContractOcrStore()

  const handleFilesSelected = (files: File[]) => {
    const { added, errors } = addImages(files)

    if (errors.length > 0) {
      errors.forEach((e) => notifyError(e))
    }

    if (added > 0) {
      addMessage({
        role: 'user',
        content: `已上传 ${added} 张图片`,
        images: useContractOcrStore
          .getState()
          .items.slice(-added),
      })
      addMessage({
        role: 'system',
        content: `已添加 ${added} 张图片，当前共 ${items.length + added} 张。点击"开始识别"进入识别编辑页面。`,
      })
      scrollToBottom()
    }
  }

  const handleRemove = (id: string) => {
    removeImage(id)
    addMessage({
      role: 'system',
      content: `已删除 1 张图片，当前共 ${items.length - 1} 张。`,
    })
  }

  const handleClear = () => {
    const count = items.length
    clearAll()
    addMessage({
      role: 'system',
      content: `已清空全部 ${count} 张图片。`,
    })
  }

  const handleStartOcr = () => {
    if (items.length === 0) {
      notifyWarning('请先上传图片')
      return
    }
    setRecognizing(true)
    addMessage({
      role: 'system',
      content: `正在跳转到识别编辑页面，共 ${items.length} 张图片...`,
    })
    navigate('/editor')
  }

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, 50)
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-10 bg-card border-b border-border px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-foreground">合同识别</h1>
            <p className="text-sm text-muted-foreground">上传合同图片进行 OCR 识别</p>
          </div>
          {items.length > 0 && (
            <Button
              onClick={handleStartOcr}
              loading={isRecognizing}
              size="lg"
              className="min-w-32"
            >
              开始识别 ({items.length})
            </Button>
          )}
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-3xl mx-auto space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.role === 'system' && (
                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Bot className="w-4 h-4 text-primary-foreground" />
                </div>
              )}
              <div
                className={`max-w-xl rounded-2xl px-4 py-3 shadow-sm ${
                  msg.role === 'user'
                    ? 'bg-primary text-primary-foreground rounded-tr-sm'
                    : 'bg-card border border-border text-foreground rounded-tl-sm'
                }`}
              >
                <p className="text-sm leading-relaxed">{msg.content}</p>
                {msg.images && msg.images.length > 0 && (
                  <div className="mt-2">
                    <ImageBubbleList
                      items={msg.images}
                      onRemove={handleRemove}
                      onPreview={setPreviewItem}
                    />
                  </div>
                )}
              </div>
              {msg.role === 'user' && (
                <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center flex-shrink-0 mt-0.5">
                  <User className="w-4 h-4 text-secondary-foreground" />
                </div>
              )}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </div>

      <div className="sticky bottom-0 bg-background border-t border-border px-4 py-4">
        <div className="max-w-3xl mx-auto space-y-3">
          {items.length > 0 && (
            <div className="px-1">
              <ImageBubbleList
                items={items}
                onRemove={handleRemove}
                onPreview={setPreviewItem}
              />
            </div>
          )}
          <UploadComposer
            onFilesSelected={handleFilesSelected}
            onClear={handleClear}
            hasImages={items.length > 0}
            disabled={isRecognizing}
          />
          {items.length > 0 && (
            <div className="flex justify-end">
              <Button
                onClick={handleStartOcr}
                loading={isRecognizing}
                className="min-w-32"
              >
                开始识别 ({items.length})
              </Button>
            </div>
          )}
        </div>
      </div>

      <ImagePreviewModal
        src={previewItem?.previewUrl ?? null}
        index={previewItem?.order ?? 0}
        onClose={() => setPreviewItem(null)}
      />
    </div>
  )
}
