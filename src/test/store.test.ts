import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useContractOcrStore } from '@/store/contractOcrStore'

vi.mock('nanoid', () => ({
  nanoid: () => Math.random().toString(36).slice(2),
}))

global.URL.createObjectURL = vi.fn(() => 'blob:mock')
global.URL.revokeObjectURL = vi.fn()

const makeFile = (name: string, type = 'image/jpeg', size = 1024): File => {
  const blob = new Blob(['x'.repeat(size)], { type })
  return new File([blob], name, { type })
}

describe('contractOcrStore - addImages', () => {
  beforeEach(() => {
    useContractOcrStore.setState({
      items: [],
      userPlan: { isPro: false },
      messages: [],
      isRecognizing: false,
    })
  })

  it('should add valid image files', () => {
    const store = useContractOcrStore.getState()
    const { added, errors } = store.addImages([
      makeFile('a.jpg'),
      makeFile('b.png', 'image/png'),
    ])
    expect(added).toBe(2)
    expect(errors).toHaveLength(0)
    expect(useContractOcrStore.getState().items).toHaveLength(2)
  })

  it('should reject unsupported file types', () => {
    const store = useContractOcrStore.getState()
    const { added, errors } = store.addImages([
      makeFile('doc.pdf', 'application/pdf'),
    ])
    expect(added).toBe(0)
    expect(errors).toHaveLength(1)
    expect(errors[0]).toContain('格式不支持')
  })

  it('should reject files exceeding 15MB', () => {
    const store = useContractOcrStore.getState()
    const bigFile = makeFile('big.jpg', 'image/jpeg', 16 * 1024 * 1024)
    const { added, errors } = store.addImages([bigFile])
    expect(added).toBe(0)
    expect(errors).toHaveLength(1)
    expect(errors[0]).toContain('超过')
  })

  it('should enforce 10-image limit for free users', () => {
    const store = useContractOcrStore.getState()
    const files = Array.from({ length: 11 }, (_, i) => makeFile(`img${i}.jpg`))
    const { added, errors } = store.addImages(files)
    expect(added).toBe(10)
    expect(errors.some((e) => e.includes('上限'))).toBe(true)
    expect(useContractOcrStore.getState().items).toHaveLength(10)
  })

  it('should allow more than 10 images for pro users', () => {
    useContractOcrStore.setState({ userPlan: { isPro: true } })
    const store = useContractOcrStore.getState()
    const files = Array.from({ length: 15 }, (_, i) => makeFile(`img${i}.jpg`))
    const { added, errors } = store.addImages(files)
    expect(added).toBe(15)
    expect(errors).toHaveLength(0)
  })

  it('should enforce limit counting existing items', () => {
    const store = useContractOcrStore.getState()
    store.addImages(Array.from({ length: 9 }, (_, i) => makeFile(`img${i}.jpg`)))
    const { added, errors } = store.addImages([
      makeFile('new1.jpg'),
      makeFile('new2.jpg'),
    ])
    expect(added).toBe(1)
    expect(errors.some((e) => e.includes('上限'))).toBe(true)
  })
})

describe('contractOcrStore - removeImage', () => {
  beforeEach(() => {
    useContractOcrStore.setState({ items: [], userPlan: { isPro: false }, messages: [], isRecognizing: false })
  })

  it('should remove an image by id and reorder', () => {
    const store = useContractOcrStore.getState()
    store.addImages([makeFile('a.jpg'), makeFile('b.jpg'), makeFile('c.jpg')])
    const { items } = useContractOcrStore.getState()
    const idToRemove = items[1].id
    useContractOcrStore.getState().removeImage(idToRemove)
    const updated = useContractOcrStore.getState().items
    expect(updated).toHaveLength(2)
    expect(updated.every((item, idx) => item.order === idx)).toBe(true)
  })
})

describe('contractOcrStore - updateOcrStatus', () => {
  beforeEach(() => {
    useContractOcrStore.setState({ items: [], userPlan: { isPro: false }, messages: [], isRecognizing: false })
  })

  it('should update ocr status and text', () => {
    const store = useContractOcrStore.getState()
    store.addImages([makeFile('a.jpg')])
    const { items } = useContractOcrStore.getState()
    const id = items[0].id
    useContractOcrStore.getState().updateOcrStatus(id, 'success', '识别文本内容')
    const updated = useContractOcrStore.getState().items
    expect(updated[0].ocrStatus).toBe('success')
    expect(updated[0].ocrText).toBe('识别文本内容')
  })

  it('should update ocr status to error with message', () => {
    const store = useContractOcrStore.getState()
    store.addImages([makeFile('a.jpg')])
    const { items } = useContractOcrStore.getState()
    const id = items[0].id
    useContractOcrStore.getState().updateOcrStatus(id, 'error', undefined, '网络超时')
    const updated = useContractOcrStore.getState().items
    expect(updated[0].ocrStatus).toBe('error')
    expect(updated[0].errorMsg).toBe('网络超时')
  })
})

describe('contractOcrStore - clearAll', () => {
  it('should clear all items', () => {
    useContractOcrStore.setState({ items: [], userPlan: { isPro: false }, messages: [], isRecognizing: false })
    const store = useContractOcrStore.getState()
    store.addImages([makeFile('a.jpg'), makeFile('b.jpg')])
    expect(useContractOcrStore.getState().items).toHaveLength(2)
    useContractOcrStore.getState().clearAll()
    expect(useContractOcrStore.getState().items).toHaveLength(0)
  })
})
