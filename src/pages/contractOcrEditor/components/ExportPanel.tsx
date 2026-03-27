import { useState } from 'react'
import { FileText, File as FilePdf } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { notifySuccess, notifyError, notifyWarning } from '@/utils/notify'
import { buildDocx, buildPdf, downloadBlob, getEmptyPageNumbers } from '@/services/exportService'
import type { UploadImageItem, ExportFormat } from '@/types/contractOcr'

type Props = {
  items: UploadImageItem[]
}

export function ExportPanel({ items }: Props) {
  const [exporting, setExporting] = useState<ExportFormat | null>(null)

  const handleExport = async (format: ExportFormat) => {
    const emptyPages = getEmptyPageNumbers(items)
    if (emptyPages.length > 0) {
      notifyWarning(`第 ${emptyPages.join('、')} 页内容为空，将以空内容导出`)
    }

    setExporting(format)
    try {
      const now = new Date()
      const y = now.getFullYear()
      const m = String(now.getMonth() + 1).padStart(2, '0')
      const d = String(now.getDate()).padStart(2, '0')
      const h = String(now.getHours()).padStart(2, '0')
      const min = String(now.getMinutes()).padStart(2, '0')
      const filename = `合同识别结果_${y}${m}${d}_${h}${min}.${format}`

      const blob = format === 'docx' ? await buildDocx(items) : await buildPdf(items)
      downloadBlob(blob, filename)
      notifySuccess(`${format.toUpperCase()} 导出成功`)
    } catch (e) {
      const msg = e instanceof Error ? e.message : '导出失败'
      notifyError(`导出失败：${msg}`)
    } finally {
      setExporting(null)
    }
  }

  const hasSuccessItems = items.some((i) => i.ocrStatus === 'success')

  return (
    <div className="fixed bottom-6 right-6 flex flex-col gap-2 z-20">
      <Button
        size="lg"
        variant="outline"
        className="bg-card shadow-lg border-2 border-border hover:border-primary hover:text-primary gap-2"
        onClick={() => handleExport('docx')}
        loading={exporting === 'docx'}
        disabled={!hasSuccessItems || exporting !== null}
      >
        <FileText className="w-5 h-5" />
        导出 DOCX
      </Button>
      <Button
        size="lg"
        className="shadow-lg gap-2"
        onClick={() => handleExport('pdf')}
        loading={exporting === 'pdf'}
        disabled={!hasSuccessItems || exporting !== null}
      >
        <FilePdf className="w-5 h-5" />
        导出 PDF
      </Button>
    </div>
  )
}
