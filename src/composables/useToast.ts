import { ref } from 'vue'

export interface Toast { id: number; message: string; tone: 'success' | 'error' | 'info' }

export function useToast() {
  const toasts = ref<Toast[]>([])
  let nextId = 0
  function dismiss(id: number) { toasts.value = toasts.value.filter((toast) => toast.id !== id) }
  function show(message: string, tone: Toast['tone'] = 'info') {
    const id = ++nextId
    toasts.value.push({ id, message, tone })
    setTimeout(() => dismiss(id), 3200)
  }
  return { toasts, show, dismiss }
}
