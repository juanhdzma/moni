import { render } from '@testing-library/react'
import { useRef } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { enfocables, useAtrapaFoco } from '@/controls/useAtrapaFoco'

describe('useAtrapaFoco con listas vacías', () => {
  function Hueco({ activo }: { activo: boolean }) {
    const ref = useRef<HTMLDivElement>(null)
    useAtrapaFoco(ref, activo, () => undefined)
    return (
      <div ref={ref}>
        <span>sin controles</span>
      </div>
    )
  }

  const tab = () => {
    const e = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true })
    document.dispatchEvent(e)
    return e
  }

  it('sin controles enfocables, Tab no se cancela ni lanza', () => {
    render(<Hueco activo />)
    expect(tab().defaultPrevented).toBe(false)
  })

  it('un button con tabindex -1 no cuenta como enfocable', () => {
    const div = document.createElement('div')
    div.innerHTML = '<button tabindex="-1" id="t"></button><input id="ok">'
    document.body.appendChild(div)
    expect(enfocables(div).map((e) => e.id)).toEqual(['ok'])
    div.remove()
  })

  it('al desmontar deja de escuchar el teclado', () => {
    const onEscape = vi.fn()
    function Activo() {
      const ref = useRef<HTMLDivElement>(null)
      useAtrapaFoco(ref, true, onEscape)
      return <div ref={ref} />
    }
    const r = render(<Activo />)
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    expect(onEscape).toHaveBeenCalledTimes(1)
    r.unmount()
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    expect(onEscape).toHaveBeenCalledTimes(1)
  })

  it('inactiva no escucha el teclado', () => {
    const onEscape = vi.fn()
    function Inactivo() {
      const ref = useRef<HTMLDivElement>(null)
      useAtrapaFoco(ref, false, onEscape)
      return <div ref={ref} />
    }
    render(<Inactivo />)
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    expect(onEscape).not.toHaveBeenCalled()
  })

  it('enfocables ignora ocultos y deshabilitados aunque estén al principio y al final', () => {
    const div = document.createElement('div')
    div.innerHTML = '<div hidden><input id="h1"></div><button disabled id="d"></button><div tabindex="-1" id="t"></div><input id="ok"><div hidden><input id="h2"></div>'
    document.body.appendChild(div)
    expect(enfocables(div).map((e) => e.id)).toEqual(['ok'])
    expect(enfocables(null)).toEqual([])
    div.remove()
  })
})
