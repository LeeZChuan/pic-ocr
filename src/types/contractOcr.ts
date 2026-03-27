export type OcrStatus = 'idle' | 'processing' | 'success' | 'error'

export type UserPlan = {
  isPro: boolean
}

export type UploadImageItem = {
  id: string
  file: File
  previewUrl: string
  order: number
  ocrStatus: OcrStatus
  ocrText: string
  errorMsg?: string
}

export type ChatMessage = {
  id: string
  role: 'system' | 'user'
  content: string
  timestamp: Date
  images?: UploadImageItem[]
}

export type ExportFormat = 'docx' | 'pdf'

export type OcrJobStatus = 'pending' | 'processing' | 'success' | 'error'

export type OcrJob = {
  id: string
  imageItems: UploadImageItem[]
  status: OcrJobStatus
  createdAt: Date
}
