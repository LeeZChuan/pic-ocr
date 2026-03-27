import { describe, it, expect } from 'vitest'
import { getEmptyPageNumbers } from '@/services/exportService'
import type { UploadImageItem } from '@/types/contractOcr'

const makeItem = (order: number, text: string): UploadImageItem => ({
  id: `id-${order}`,
  file: new File([], 'test.jpg'),
  previewUrl: 'blob:mock',
  order,
  ocrStatus: 'success',
  ocrText: text,
})

describe('getEmptyPageNumbers', () => {
  it('should return empty array when all pages have content', () => {
    const items = [
      makeItem(0, '合同内容第一页'),
      makeItem(1, '合同内容第二页'),
    ]
    expect(getEmptyPageNumbers(items)).toEqual([])
  })

  it('should return page numbers (1-indexed) for empty pages', () => {
    const items = [
      makeItem(0, '合同内容'),
      makeItem(1, ''),
      makeItem(2, '   '),
      makeItem(3, '第四页内容'),
    ]
    expect(getEmptyPageNumbers(items)).toEqual([2, 3])
  })

  it('should handle all empty pages', () => {
    const items = [makeItem(0, ''), makeItem(1, '')]
    expect(getEmptyPageNumbers(items)).toEqual([1, 2])
  })

  it('should handle empty items array', () => {
    expect(getEmptyPageNumbers([])).toEqual([])
  })
})
