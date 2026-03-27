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

export type ExportFormat = 'docx' | 'pdf'

export type OcrJobStatus = 'pending' | 'processing' | 'success' | 'error'
