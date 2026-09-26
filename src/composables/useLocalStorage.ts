import { ref, watch, type Ref } from 'vue'

export function useLocalStorage<T>(key: string, fallback: T, parse: (value: unknown) => T): Ref<T> {
  let initial = fallback
  try {
    const raw = localStorage.getItem(key)
    if (raw !== null) initial = parse(JSON.parse(raw) as unknown)
  } catch {
    // Storage can be blocked or contain malformed JSON. Keep the app usable.
  }
  const state = ref(initial) as Ref<T>
  watch(state, (value) => {
    try {
      localStorage.setItem(key, JSON.stringify(value))
    } catch {
      // Quota and privacy settings must not break number generation.
    }
  }, { deep: true, flush: 'sync' })
  return state
}
