const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

/**
 * Keeps keyboard focus inside a drawer/dialog and restores it to the element
 * that opened it. The panels are conditionally mounted, so the action's
 * `destroy` hook runs when they close.
 */
export function modalFocus(node: HTMLElement) {
  const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null

  const focusable = () =>
    [...node.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((element) => {
      const style = getComputedStyle(element)
      return style.display !== 'none' && style.visibility !== 'hidden'
    })

  const onKeydown = (event: KeyboardEvent) => {
    if (event.key !== 'Tab') return
    const items = focusable()
    if (items.length === 0) {
      event.preventDefault()
      node.focus()
      return
    }
    const first = items[0]!
    const last = items[items.length - 1]!
    if (event.shiftKey && (document.activeElement === first || document.activeElement === node)) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first.focus()
    }
  }

  node.addEventListener('keydown', onKeydown)
  const frame = requestAnimationFrame(() => {
    const first = focusable()[0]
    if (first) first.focus()
    else {
      node.tabIndex = -1
      node.focus()
    }
  })

  return {
    destroy() {
      cancelAnimationFrame(frame)
      node.removeEventListener('keydown', onKeydown)
      previous?.focus()
    },
  }
}
