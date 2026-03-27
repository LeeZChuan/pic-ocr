import { useRef, useState } from 'react'
import { Upload, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type Props = {
  onFilesSelected: (files: File[]) => void
  onClear: () => void
  hasImages: boolean
  disabled?: boolean
}

export function UploadComposer({ onFilesSelected, onClear, hasImages, disabled }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)

  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return
    onFilesSelected(Array.from(files))
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => setIsDragging(false)

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    handleFiles(e.dataTransfer.files)
  }

  return (
    <div
      className={cn(
        'flex items-center gap-3 p-3 rounded-xl border-2 border-dashed transition-colors',
        isDragging
          ? 'border-primary bg-accent'
          : 'border-border bg-card',
        disabled && 'opacity-50 pointer-events-none'
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
        disabled={disabled}
      />

      <Button
        variant="outline"
        size="sm"
        className="flex-shrink-0"
        onClick={() => inputRef.current?.click()}
        disabled={disabled}
      >
        <Upload className="w-4 h-4" />
        选择图片
      </Button>

      <span className="text-sm text-muted-foreground flex-1 select-none">
        {isDragging ? '松开鼠标添加图片' : '或将图片拖拽到此处'}
      </span>

      {hasImages && (
        <Button
          variant="ghost"
          size="sm"
          className="flex-shrink-0 text-muted-foreground hover:text-destructive"
          onClick={onClear}
          disabled={disabled}
        >
          <X className="w-4 h-4" />
          清空
        </Button>
      )}
    </div>
  )
}
