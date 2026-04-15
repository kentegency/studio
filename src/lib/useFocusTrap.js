// useFocusTrap — contains Tab/Shift+Tab focus within a modal container
// Usage: const ref = useFocusTrap(isOpen)
// Place ref on the modal panel div

import { useEffect, useRef } from 'react'

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ')

export function useFocusTrap(active = true) {
  const ref = useRef(null)
  const prevFocus = useRef(null)

  useEffect(() => {
    if (!active) return

    // Store element that had focus before modal opened
    prevFocus.current = document.activeElement

    // Focus first focusable element in modal
    const el = ref.current
    if (!el) return
    const focusable = Array.from(el.querySelectorAll(FOCUSABLE))
    if (focusable.length > 0) {
      // Small delay ensures modal is fully rendered
      setTimeout(() => focusable[0]?.focus(), 50)
    }

    const handleKeyDown = (e) => {
      if (e.key !== 'Tab') return
      if (!el) return

      const focusableEls = Array.from(el.querySelectorAll(FOCUSABLE))
      if (focusableEls.length === 0) return

      const first = focusableEls[0]
      const last  = focusableEls[focusableEls.length - 1]

      if (e.shiftKey) {
        // Shift+Tab — going backwards
        if (document.activeElement === first) {
          e.preventDefault()
          last.focus()
        }
      } else {
        // Tab — going forwards
        if (document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      // Restore focus to the element that had it before
      prevFocus.current?.focus?.()
    }
  }, [active])

  return ref
}
