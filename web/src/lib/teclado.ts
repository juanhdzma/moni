import type { KeyboardEvent } from 'react'

export const alActivar = (accion: () => void) => (e: KeyboardEvent) => {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault()
    accion()
  }
}
