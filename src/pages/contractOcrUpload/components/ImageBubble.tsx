import { X, ZoomIn } from 'lucide-react'
import type { UploadImageItem } from '@/types/contractOcr'

type Props = {
  item: UploadImageItem
  onRemove: (id: string) => void
  onPreview: (item: UploadImageItem) => void
}

export function ImageBubble({ item, onRemove, onPreview }: Props) {
  return (
    <div className="relative group w-20 h-20 rounded-lg overflow-hidden border border-border shadow-sm flex-shrink-0 cursor-pointer bg-secondary">
      <img
        src={item.previewUrl}
        alt={`图片 ${item.order + 1}`}
        className="w-full h-full object-cover"
        onClick={() => onPreview(item)}
      />
      <div
        className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100"
        onClick={() => onPreview(item)}
      >
        <ZoomIn className="w-5 h-5 text-white" />
      </div>
      <button
        className="absolute top-1 right-1 w-5 h-5 bg-black/60 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive"
        onClick={(e) => {
          e.stopPropagation()
          onRemove(item.id)
        }}
      >
        <X className="w-3 h-3 text-white" />
      </button>
      <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-[10px] text-center py-0.5">
        {item.order + 1}
      </div>
    </div>
  )
}
