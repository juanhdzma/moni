import { render } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { clearActivePopup, closeAnyOpenPopup, openPopup, usePopupOutsideClick } from './popups'

function Escucha() {
  usePopupOutsideClick()
  return (
    <>
      <button>afuera</button>
      <div className="cdd-menu">
        <button>dentro</button>
      </div>
    </>
  )
}

afterEach(() => closeAnyOpenPopup())

describe('popups', () => {
  it('abrir un popup cierra el anterior y cada uno se cierra una sola vez', () => {
    const a = vi.fn()
    const b = vi.fn()
    openPopup(a)
    openPopup(b)
    expect(a).toHaveBeenCalledTimes(1)
    closeAnyOpenPopup()
    closeAnyOpenPopup()
    expect(b).toHaveBeenCalledTimes(1)
  })

  it('clearActivePopup solo olvida al popup activo', () => {
    const a = vi.fn()
    const b = vi.fn()
    openPopup(a)
    clearActivePopup(b)
    closeAnyOpenPopup()
    expect(a).toHaveBeenCalledTimes(1)
    openPopup(b)
    clearActivePopup(b)
    closeAnyOpenPopup()
    expect(b).not.toHaveBeenCalled()
  })

  it('click afuera cierra; click dentro de un menú no', async () => {
    const user = userEvent.setup()
    const dismiss = vi.fn()
    const { getByText } = render(<Escucha />)
    openPopup(dismiss)
    await user.click(getByText('dentro'))
    expect(dismiss).not.toHaveBeenCalled()
    await user.click(getByText('afuera'))
    expect(dismiss).toHaveBeenCalledTimes(1)
  })

  it('Escape cierra el popup y no llega a otros listeners; sin popup lo deja pasar', async () => {
    const user = userEvent.setup()
    const dismiss = vi.fn()
    const alBubble = vi.fn()
    document.addEventListener('keydown', alBubble)
    render(<Escucha />)
    await user.keyboard('{Escape}')
    expect(alBubble).toHaveBeenCalledTimes(1)
    openPopup(dismiss)
    await user.keyboard('{Escape}')
    expect(dismiss).toHaveBeenCalledTimes(1)
    expect(alBubble).toHaveBeenCalledTimes(1)
    openPopup(dismiss)
    await user.keyboard('a')
    expect(dismiss).toHaveBeenCalledTimes(1)
    document.removeEventListener('keydown', alBubble)
  })
})
