import { create } from 'zustand'
import type { UploadImageItem, UserPlan } from '@/types/contractOcr'
import { nanoid } from 'nanoid'

const MAX_FREE_IMAGES = 10
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
const MAX_FILE_SIZE_MB = 15

type ContractOcrStore = {
  userPlan: UserPlan
  items: UploadImageItem[]
  isRecognizing: boolean

  addImages: (files: File[]) => { added: number; errors: string[] }
  removeImage: (id: string) => void
  clearAll: () => void
  updateOcrText: (id: string, text: string) => void
  updateOcrStatus: (id: string, status: UploadImageItem['ocrStatus'], text?: string, errorMsg?: string) => void
  setRecognizing: (v: boolean) => void
  setUserPlan: (plan: UserPlan) => void
  reorderItems: (items: UploadImageItem[]) => void
  moveItem: (activeId: string, overId: string, position: 'before' | 'after') => void
}

export const useContractOcrStore = create<ContractOcrStore>((set, get) => ({
  userPlan: { isPro: false },
  items: [],
  isRecognizing: false,

  addImages: (files) => {
    const { items, userPlan } = get()
    const errors: string[] = []
    const validFiles: File[] = []
    const currentCount = items.length

    for (const file of files) {
      if (!ALLOWED_TYPES.includes(file.type)) {
        errors.push(`${file.name}：格式不支持，请上传 JPG/PNG/WEBP`)
        continue
      }
      if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
        errors.push(`${file.name}：文件超过 ${MAX_FILE_SIZE_MB}MB 限制`)
        continue
      }
      validFiles.push(file)
    }

    const limit = userPlan.isPro ? Infinity : MAX_FREE_IMAGES
    const available = Math.max(0, limit - currentCount)

    const toAdd = validFiles.slice(0, available)
    const blocked = validFiles.slice(available)

    if (blocked.length > 0) {
      errors.push(`已达到 ${MAX_FREE_IMAGES} 张上限，${blocked.length} 张未添加`)
    }

    const newItems: UploadImageItem[] = toAdd.map((file, idx) => ({
      id: nanoid(),
      file,
      previewUrl: URL.createObjectURL(file),
      order: currentCount + idx,
      ocrStatus: 'idle',
      ocrText: '',
    }))

    set((state) => ({ items: [...state.items, ...newItems] }))

    return { added: toAdd.length, errors }
  },

  removeImage: (id) => {
    set((state) => {
      const updated = state.items
        .filter((item) => item.id !== id)
        .map((item, idx) => ({ ...item, order: idx }))
      return { items: updated }
    })
  },

  clearAll: () => {
    const { items } = get()
    items.forEach((item) => URL.revokeObjectURL(item.previewUrl))
    set({ items: [] })
  },

  updateOcrText: (id, text) => {
    set((state) => ({
      items: state.items.map((item) =>
        item.id === id ? { ...item, ocrText: text } : item
      ),
    }))
  },

  updateOcrStatus: (id, status, text, errorMsg) => {
    set((state) => ({
      items: state.items.map((item) =>
        item.id === id
          ? {
              ...item,
              ocrStatus: status,
              ...(text !== undefined ? { ocrText: text } : {}),
              ...(errorMsg !== undefined ? { errorMsg } : {}),
            }
          : item
      ),
    }))
  },

  setRecognizing: (v) => set({ isRecognizing: v }),

  setUserPlan: (plan) => set({ userPlan: plan }),

  reorderItems: (items) =>
    set({
      items: items.map((item, idx) => ({ ...item, order: idx })),
    }),

  moveItem: (activeId, overId, position) => {
    set((state) => {
      const sorted = [...state.items].sort((a, b) => a.order - b.order)
      const fromIndex = sorted.findIndex((i) => i.id === activeId)
      const toIndex = sorted.findIndex((i) => i.id === overId)

      if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) {
        return {}
      }

      const [moved] = sorted.splice(fromIndex, 1)

      let insertIndex = toIndex
      if (fromIndex < toIndex) insertIndex -= 1
      if (position === 'after') insertIndex += 1
      insertIndex = Math.max(0, Math.min(insertIndex, sorted.length))

      sorted.splice(insertIndex, 0, moved)

      return {
        items: sorted.map((item, idx) => ({ ...item, order: idx })),
      }
    })
  },
}))
