import type { UploadImageItem } from '@/types/contractOcr'
import { ImageBubble } from './ImageBubble'

type Props = {
  items: UploadImageItem[]
  onRemove: (id: string) => void
  onPreview: (item: UploadImageItem) => void
}

export function ImageBubbleList({ items, onRemove, onPreview }: Props) {
  if (items.length === 0) return null

  return (
    <div className="flex flex-wrap gap-2 max-w-xl">
      {items.map((item) => (
        <ImageBubble
          key={item.id}
          item={item}
          onRemove={onRemove}
          onPreview={onPreview}
        />
      ))}
    </div>
  )
}
