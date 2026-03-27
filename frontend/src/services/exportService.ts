import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx'
import jsPDF from 'jspdf'
import type { UploadImageItem } from '@/types/contractOcr'

function formatTitle(): string {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  const h = String(now.getHours()).padStart(2, '0')
  const min = String(now.getMinutes()).padStart(2, '0')
  return `合同识别结果_${y}${m}${d}_${h}${min}`
}

export function getEmptyPageNumbers(items: UploadImageItem[]): number[] {
  return items
    .filter((item) => item.ocrText.trim() === '')
    .map((item) => item.order + 1)
}

export async function buildDocx(items: UploadImageItem[]): Promise<Blob> {
  const title = formatTitle()
  const children: Paragraph[] = [
    new Paragraph({
      text: title,
      heading: HeadingLevel.HEADING_1,
    }),
  ]

  const sorted = [...items].sort((a, b) => a.order - b.order)

  for (const item of sorted) {
    children.push(
      new Paragraph({
        text: `第${item.order + 1}页`,
        heading: HeadingLevel.HEADING_2,
      })
    )
    const lines = item.ocrText.split('\n')
    for (const line of lines) {
      children.push(
        new Paragraph({
          children: [new TextRun({ text: line, size: 24 })],
        })
      )
    }
    children.push(new Paragraph({ text: '' }))
  }

  const doc = new Document({
    sections: [{ children }],
  })

  return Packer.toBlob(doc)
}

export async function buildPdf(items: UploadImageItem[]): Promise<Blob> {
  const title = formatTitle()
  const sorted = [...items].sort((a, b) => a.order - b.order)

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

  const pageWidth = doc.internal.pageSize.getWidth()
  const margin = 20
  const contentWidth = pageWidth - margin * 2
  const lineHeight = 7

  doc.setFont('helvetica')
  doc.setFontSize(18)
  doc.text(title, margin, 25)

  let y = 40

  for (const item of sorted) {
    if (y > 260) {
      doc.addPage()
      y = 20
    }

    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text(`第${item.order + 1}页`, margin, y)
    y += lineHeight + 3

    doc.setFontSize(11)
    doc.setFont('helvetica', 'normal')

    const lines = doc.splitTextToSize(item.ocrText || '(空)', contentWidth) as string[]
    for (const line of lines) {
      if (y > 270) {
        doc.addPage()
        y = 20
      }
      doc.text(line, margin, y)
      y += lineHeight
    }
    y += 8
  }

  return doc.output('blob')
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
