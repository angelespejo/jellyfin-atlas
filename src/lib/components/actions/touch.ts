export function useSwipe(
  element: HTMLElement,
  callbacks: { onSwipeLeft?: () => void; onSwipeRight?: () => void },
  threshold = 60
) {
  let startX = 0
  let startY = 0
  let startTime = 0
  let tracking = false

  function onStart(e: TouchEvent) {
    startX = e.touches[0].clientX
    startY = e.touches[0].clientY
    startTime = Date.now()
    tracking = true
  }

  function onMove(e: TouchEvent) {
    if (!tracking) return
    const dx = e.touches[0].clientX - startX
    const dy = e.touches[0].clientY - startY
    if (Math.abs(dy) > Math.abs(dx) * 0.5) {
      tracking = false
      return
    }
  }

  function onEnd(e: TouchEvent) {
    if (!tracking) return
    tracking = false
    const dx = e.changedTouches[0].clientX - startX
    const dt = Date.now() - startTime
    if (Math.abs(dx) > threshold && dt < 500) {
      if (dx > 0) callbacks.onSwipeRight?.()
      else callbacks.onSwipeLeft?.()
    }
  }

  element.addEventListener('touchstart', onStart, { passive: true })
  element.addEventListener('touchmove', onMove, { passive: true })
  element.addEventListener('touchend', onEnd, { passive: true })

  return () => {
    element.removeEventListener('touchstart', onStart)
    element.removeEventListener('touchmove', onMove)
    element.removeEventListener('touchend', onEnd)
  }
}
