import { useEffect } from 'react'

let activePopup: (() => void) | null = null

export function openPopup(dismiss: () => void): void {
  if (activePopup) activePopup()
  activePopup = dismiss
}

export function clearActivePopup(dismiss: () => void): void {
  if (activePopup === dismiss) activePopup = null
}

export function closeAnyOpenPopup(): void {
  if (activePopup) {
    const d = activePopup
    activePopup = null
    d()
  }
}

export function usePopupOutsideClick(): void {
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!activePopup) return
      if (e.target instanceof Element && e.target.closest('.cdd, .cdp, .cdd-menu, .cdp-panel')) return
      closeAnyOpenPopup()
    }
    document.addEventListener('click', onClick, true)
    return () => document.removeEventListener('click', onClick, true)
  }, [])
}

export function repositionPopup(
  trigger: HTMLElement,
  popup: HTMLElement,
  opts: { matchWidth?: boolean; alignRight?: boolean } = {},
): void {
  const r = trigger.getBoundingClientRect()
  const h = popup.offsetHeight
  const w = popup.offsetWidth
  const spaceBelow = window.innerHeight - r.bottom
  const spaceAbove = r.top
  let top = spaceBelow >= h + 8 || spaceBelow >= spaceAbove ? r.bottom + 6 : r.top - h - 6
  top = Math.max(8, Math.min(top, window.innerHeight - h - 8))
  let left = opts.alignRight ? r.right - w : r.left
  left = Math.max(8, Math.min(left, window.innerWidth - w - 8))
  popup.style.top = `${top}px`
  popup.style.left = `${left}px`
  if (opts.matchWidth) popup.style.width = `${r.width}px`
}
