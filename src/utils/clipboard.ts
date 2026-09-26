export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(text)
        return true
      } catch {
        // A denied clipboard permission may still allow the legacy copy command.
      }
    }
    const input = document.createElement('textarea')
    input.value = text
    input.style.position = 'fixed'
    input.style.opacity = '0'
    document.body.append(input)
    try {
      input.select()
      return document.execCommand('copy')
    } finally {
      input.remove()
    }
  } catch {
    return false
  }
}
