import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

type Props = {
  src: string | null
  index: number
  onClose: () => void
}

export function ImagePreviewModal({ src, index, onClose }: Props) {
  return (
    <Dialog open={!!src} onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>图片预览 - 第 {index + 1} 张</DialogTitle>
        </DialogHeader>
        {src && (
          <div className="flex items-center justify-center">
            <img
              src={src}
              alt={`第 ${index + 1} 张图片`}
              className="max-h-[70vh] max-w-full object-contain rounded"
            />
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
