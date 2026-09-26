import { ref, watch } from 'vue'

export function useTheme() {
  let stored: string | null = null
  try { stored = localStorage.getItem('lotto-random:theme') } catch { /* storage unavailable */ }
  const prefersDark = typeof matchMedia === 'function' && matchMedia('(prefers-color-scheme: dark)').matches
  const dark = ref(stored === 'dark' || (stored !== 'light' && prefersDark))
  function apply(value: boolean) {
    document.documentElement.classList.toggle('dark', value)
    document.documentElement.style.colorScheme = value ? 'dark' : 'light'
  }
  apply(dark.value)
  watch(dark, (value) => {
    apply(value)
    try { localStorage.setItem('lotto-random:theme', value ? 'dark' : 'light') } catch { /* optional */ }
  })
  return { dark, toggle: () => { dark.value = !dark.value } }
}
