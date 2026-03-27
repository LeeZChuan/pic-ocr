import { useCallback, useEffect, useRef } from 'react'
import { ZoomIn, RefreshCw, AlertCircle, CheckCircle2, Loader2, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { UploadImageItem } from '@/types/contractOcr'

type Props = {
  item: UploadImageItem
  onTextChange: (id: string, text: string) => void
  onRetry: (id: string) => void
  onPreview: (item: UploadImageItem) => void
}

const STATUS_CONFIG = {
  idle: {
    label: '待识别',
    icon: Clock,
    badgeVariant: 'secondary' as const,
  },
  processing: {
    label: '识别中',
    icon: Loader2,
    badgeVariant: 'default' as const,
  },
  success: {
    label: '识别成功',
    icon: CheckCircle2,
    badgeVariant: 'success' as const,
  },
  error: {
    label: '识别失败',
    icon: AlertCircle,
    badgeVariant: 'destructive' as const,
  },
}

export function OcrCard({ item, onTextChange, onRetry, onPreview }: Props) {
  const config = STATUS_CONFIG[item.ocrStatus]
  const StatusIcon = config.icon
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  const handleTextChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const value = e.target.value
      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(() => {
        onTextChange(item.id, value)
      }, 500)
      if (textareaRef.current) {
        textareaRef.current.value = value
      }
    },
    [item.id, onTextChange]
  )

  useEffect(() => {
    if (textareaRef.current && item.ocrStatus === 'success') {
      textareaRef.current.value = item.ocrText
    }
  }, [item.ocrText, item.ocrStatus])

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-secondary/30">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-foreground">第 {item.order + 1} 页</span>
          <Badge variant={config.badgeVariant} className="gap-1">
            <StatusIcon
              className={cn('w-3 h-3', item.ocrStatus === 'processing' && 'animate-spin')}
            />
            {config.label}
          </Badge>
        </div>
        {item.ocrStatus === 'error' && (
          <Button variant="outline" size="sm" onClick={() => onRetry(item.id)}>
            <RefreshCw className="w-3.5 h-3.5" />
            重试
          </Button>
        )}
      </div>

      <div className="flex gap-0 min-h-64 max-h-96">
        <div className="w-2/5 border-r border-border relative group bg-secondary/20 flex items-center justify-center overflow-hidden">
          <img
            src={item.previewUrl}
            alt={`第 ${item.order + 1} 页`}
            className="max-w-full max-h-full object-contain"
          />
          <button
            className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100"
            onClick={() => onPreview(item)}
          >
            <div className="bg-black/60 rounded-full p-2">
              <ZoomIn className="w-5 h-5 text-white" />
            </div>
          </button>
        </div>

        <div className="w-3/5 flex flex-col">
          {item.ocrStatus === 'error' && (
            <div className="px-3 py-2 bg-destructive/10 border-b border-destructive/20 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
              <p className="text-xs text-destructive">{item.errorMsg ?? '识别失败，请重试'}</p>
            </div>
          )}
          {item.ocrStatus === 'processing' ? (
            <div className="flex-1 flex items-center justify-center gap-3 text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-sm">正在识别...</span>
            </div>
          ) : (
            <textarea
              ref={textareaRef}
              defaultValue={item.ocrText}
              onChange={handleTextChange}
              placeholder={item.ocrStatus === 'idle' ? '等待识别...' : '识别完成后可在此编辑文本'}
              className="flex-1 w-full resize-none p-3 text-sm text-foreground bg-transparent outline-none placeholder:text-muted-foreground/50 leading-relaxed"
            />
          )}
        </div>
      </div>
    </div>
  )
}
