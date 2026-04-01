import { Document, Packer, Paragraph, TextRun } from 'docx'
import jsPDF from 'jspdf'
import type { UploadImageItem } from '@/types/contractOcr'

const SECTION_RE = /^(一|二|三|四|五|六|七|八|九|十|[0-9]+)[、.]/
const ARTICLE_RE = /^第[一二三四五六七八九十0-9]+条/
const INDENT_TWIPS = 480
const MARGIN_TOP = 1440
const MARGIN_BOTTOM = 1440
const MARGIN_LEFT = 1800
const MARGIN_RIGHT = 1800

function isSectionTitle(text: string): boolean {
  return SECTION_RE.test(text) || ARTICLE_RE.test(text)
}

export function getEmptyPageNumbers(items: UploadImageItem[]): number[] {
  return items
    .filter((item) => item.ocrText.trim() === '')
    .map((item) => item.order + 1)
}

export async function buildDocx(items: UploadImageItem[]): Promise<Blob> {
  const children: Paragraph[] = []

  const sorted = [...items].sort((a, b) => a.order - b.order)

  sorted.forEach((item, idx) => {
    const lines = item.ocrText.split('\n')
    if (lines.length === 0 || (lines.length === 1 && lines[0].trim() === '')) {
      children.push(
        new Paragraph({
          children: [new TextRun({ text: '' })],
        })
      )
    } else {
      lines.forEach((raw) => {
        const text = raw.trim()
        if (!text) {
          children.push(new Paragraph({ text: '' }))
          return
        }
        const isTitle = isSectionTitle(text)
        children.push(
          new Paragraph({
            indent: isTitle ? undefined : { firstLine: INDENT_TWIPS },
            children: [
              new TextRun({
                text,
                size: 24,
                bold: isTitle,
                font: 'SimSun',
              }),
            ],
          })
        )
      })
    }
    if (idx < sorted.length - 1) {
      children.push(new Paragraph({ text: '' }))
    }
  })

  const doc = new Document({
    styles: {
      default: {
        document: {
          run: {
            font: 'SimSun',
            size: 24,
          },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: MARGIN_TOP,
              bottom: MARGIN_BOTTOM,
              left: MARGIN_LEFT,
              right: MARGIN_RIGHT,
            },
          },
        },
        children,
      },
    ],
  })

  return Packer.toBlob(doc)
}

export async function buildPdf(items: UploadImageItem[]): Promise<Blob> {
  const sorted = [...items].sort((a, b) => a.order - b.order)

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

  const pageWidth = doc.internal.pageSize.getWidth()
  const margin = 20
  const contentWidth = pageWidth - margin * 2
  const lineHeight = 7

  doc.setFont('helvetica')
  doc.setFontSize(11)
  let y = 20

  for (let i = 0; i < sorted.length; i += 1) {
    const item = sorted[i]
    if (y > 260) {
      doc.addPage()
      y = 20
    }

    const lines = item.ocrText.split('\n')
    if (lines.length === 0 || (lines.length === 1 && lines[0].trim() === '')) {
      y += lineHeight
      continue
    }

    for (const raw of lines) {
      const text = raw.trim()
      if (!text) {
        y += lineHeight
        continue
      }
      const isTitle = isSectionTitle(text)
      doc.setFont('helvetica', isTitle ? 'bold' : 'normal')
      const content = isTitle ? text : `　　${text}`
      const wrapped = doc.splitTextToSize(content, contentWidth) as string[]
      for (const line of wrapped) {
        if (y > 270) {
          doc.addPage()
          y = 20
        }
        doc.text(line, margin, y)
        y += lineHeight
      }
    }

    if (i < sorted.length - 1) {
      y += 4
    }
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
