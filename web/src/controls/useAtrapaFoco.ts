import { useEffect, type RefObject } from 'react'

const FOCUSABLE = 'a[href], button:not([disabled]):not([tabindex="-1"]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

export const enfocables = (raiz: HTMLElement | null): HTMLElement[] =>
  [...(raiz?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? [])].filter((el) => el.offsetParent !== null && !el.closest('[hidden]'))

export function useAtrapaFoco(ref: RefObject<HTMLElement | null>, activo: boolean, onEscape: () => void): void {
  useEffect(() => {
    if (!activo) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onEscape()
        return
      }
      if (e.key !== 'Tab' || !ref.current) return
      const lista = enfocables(ref.current)
      const primero = lista[0]
      const ultimo = lista[lista.length - 1]
      if (!primero || !ultimo) return
      const dentro = ref.current.contains(document.activeElement)
      if (!dentro || (e.shiftKey && document.activeElement === primero)) {
        e.preventDefault()
        ;(e.shiftKey ? ultimo : primero).focus()
      } else if (!e.shiftKey && document.activeElement === ultimo) {
        e.preventDefault()
        primero.focus()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [ref, activo, onEscape])
}
