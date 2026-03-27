import { useRef, useState } from 'react'
import { Upload, ImagePlus } from 'lucide-react'
import { cn } from '@/lib/utils'

type Props = {
  onFilesSelected: (files: File[]) => void
  disabled?: boolean
}

export function UploadComposer({ onFilesSelected, disabled }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)

  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return
    onFilesSelected(Array.from(files))
    if (inputRef.current) inputRef.current.value = ''
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    if (!disabled) setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragging(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    if (!disabled) handleFiles(e.dataTransfer.files)
  }

  return (
    <div
      role="button"
      tabIndex={disabled ? -1 : 0}
      className={cn(
        'relative flex flex-col items-center justify-center gap-3 p-10 rounded-xl border-2 border-dashed transition-all cursor-pointer select-none',
        isDragging
          ? 'border-primary bg-accent scale-[1.01]'
          : 'border-border hover:border-primary/50 hover:bg-secondary/40',
        disabled && 'opacity-50 cursor-not-allowed pointer-events-none'
      )}
      onClick={() => !disabled && inputRef.current?.click()}
      onKeyDown={(e) => e.key === 'Enter' && !disabled && inputRef.current?.click()}
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

      <div className={cn(
        'w-12 h-12 rounded-xl flex items-center justify-center transition-colors',
        isDragging ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'
      )}>
        {isDragging ? (
          <ImagePlus className="w-6 h-6" />
        ) : (
          <Upload className="w-6 h-6" />
        )}
      </div>

      <div className="text-center">
        <p className="text-sm font-medium text-foreground">
          {isDragging ? '松开以添加图片' : '点击选择或拖拽图片到此处'}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          支持 JPG、PNG、WEBP，可多选，单文件最大 15MB
        </p>
      </div>
    </div>
  )
}
