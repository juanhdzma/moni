import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { mockFetch } from '@/test/mockFetch'
import { renderWithProviders } from '@/test/render'
import { useModal } from '@/shell/providers/ModalProvider'

function Abridor({ contenido, pila }: { contenido: React.ReactNode; pila?: React.ReactNode }) {
  const { openModal, pushModal, closeModal } = useModal()
  return (
    <>
      <button onClick={() => openModal('Titulo', contenido)}>abrir</button>
      <button onClick={() => pushModal('Encima', pila)}>apilar</button>
      <button onClick={closeModal}>cerrar-api</button>
      <input aria-label="afuera" />
    </>
  )
}

const abierto = () => document.getElementById('modal-overlay')?.classList.contains('open')

afterEach(() => vi.unstubAllGlobals())

describe('trampa de foco', () => {
  it('con el foco fuera del diálogo, Tab entra al primer control y Shift+Tab al último', async () => {
    const user = userEvent.setup()
    mockFetch()
    renderWithProviders(<Abridor contenido={<><input aria-label="uno" /><input aria-label="dos" /></>} />)
    await user.click(screen.getByText('abrir'))
    const afuera = screen.getByLabelText('afuera')
    afuera.focus()
    await user.tab()
    expect(screen.getByLabelText('Cerrar')).toHaveFocus()
    afuera.focus()
    await user.tab({ shift: true })
    expect(screen.getByLabelText('dos')).toHaveFocus()
  })

  it('desde el último Tab vuelve al primero y desde el primero Shift+Tab va al último', async () => {
    const user = userEvent.setup()
    mockFetch()
    renderWithProviders(<Abridor contenido={<><input aria-label="uno" /><input aria-label="dos" /></>} />)
    await user.click(screen.getByText('abrir'))
    screen.getByLabelText('dos').focus()
    await user.tab()
    expect(screen.getByLabelText('Cerrar')).toHaveFocus()
    await user.tab({ shift: true })
    expect(screen.getByLabelText('dos')).toHaveFocus()
  })

  it('en el medio Tab avanza normal sin que la trampa intervenga', async () => {
    const user = userEvent.setup()
    mockFetch()
    renderWithProviders(<Abridor contenido={<><input aria-label="uno" /><input aria-label="dos" /><input aria-label="tres" /></>} />)
    await user.click(screen.getByText('abrir'))
    screen.getByLabelText('uno').focus()
    await user.tab()
    expect(screen.getByLabelText('dos')).toHaveFocus()
    await user.tab({ shift: true })
    expect(screen.getByLabelText('uno')).toHaveFocus()
  })

  it('salta controles deshabilitados, divs con tabindex -1 y escondidos', async () => {
    const user = userEvent.setup()
    mockFetch()
    renderWithProviders(
      <Abridor
        contenido={
          <>
            <input aria-label="uno" />
            <button disabled>muerto</button>
            <div tabIndex={-1}>excluido</div>
            <div hidden>
              <input aria-label="oculto" />
            </div>
            <input aria-label="ultimo" />
          </>
        }
      />,
    )
    await user.click(screen.getByText('abrir'))
    screen.getByLabelText('ultimo').focus()
    await user.tab()
    expect(screen.getByLabelText('Cerrar')).toHaveFocus()
    await user.tab({ shift: true })
    expect(screen.getByLabelText('ultimo')).toHaveFocus()
  })

  it('un tabindex positivo o 0 cuenta como enfocable', async () => {
    const user = userEvent.setup()
    mockFetch()
    renderWithProviders(<Abridor contenido={<div tabIndex={0} aria-label="div-foco" />} />)
    await user.click(screen.getByText('abrir'))
    screen.getByLabelText('div-foco').focus()
    await user.tab()
    expect(screen.getByLabelText('Cerrar')).toHaveFocus()
  })

  it('con el modal cerrado Tab no queda atrapado', async () => {
    const user = userEvent.setup()
    mockFetch()
    renderWithProviders(<Abridor contenido={<input aria-label="uno" />} />)
    screen.getByText('abrir').focus()
    await user.tab()
    expect(screen.getByText('apilar')).toHaveFocus()
  })
})

describe('pila y cierre', () => {
  it('en una pila Shift+Tab desde el primero del tope salta al último del tope, no al form de abajo', async () => {
    const user = userEvent.setup()
    mockFetch()
    renderWithProviders(<Abridor contenido={<input aria-label="base" />} pila={<><button>si</button><button>no</button></>} />)
    await user.click(screen.getByText('abrir'))
    await user.click(screen.getByText('apilar'))
    expect(screen.getByText('si')).toHaveFocus()
    await user.tab({ shift: true })
    expect(screen.getByLabelText('Cerrar')).toHaveFocus()
    await user.tab({ shift: true })
    expect(screen.getByText('no')).toHaveFocus()
    expect(screen.getByLabelText('base')).not.toBeVisible()
  })

  it('pushModal sin modal abierto lo abre como uno normal', async () => {
    const user = userEvent.setup()
    mockFetch()
    renderWithProviders(<Abridor contenido={<input />} pila={<span>suelto</span>} />)
    await user.click(screen.getByText('apilar'))
    expect(abierto()).toBe(true)
    expect(screen.getByText('Encima')).toHaveAttribute('id', 'modal-title')
    await user.keyboard('{Escape}')
    expect(abierto()).toBe(false)
  })

  it('closeModal por API cierra aunque haya pila y devuelve el foco al abridor', async () => {
    const user = userEvent.setup()
    mockFetch()
    renderWithProviders(<Abridor contenido={<input aria-label="base" />} pila={<span>otra</span>} />)
    const abrir = screen.getByText('abrir')
    abrir.focus()
    await user.click(abrir)
    await user.click(screen.getByText('apilar'))
    await user.click(screen.getByText('cerrar-api'))
    expect(abierto()).toBe(false)
    expect(screen.queryByText('otra')).toBeNull()
    expect(abrir).toHaveFocus()
  })

  it('abrir de nuevo tras cerrar vuelve a mostrar el contenido y el título nuevo', async () => {
    const user = userEvent.setup()
    mockFetch()
    renderWithProviders(<Abridor contenido={<input aria-label="uno" />} />)
    await user.click(screen.getByText('abrir'))
    await user.click(screen.getByLabelText('Cerrar'))
    expect(abierto()).toBe(false)
    expect(screen.queryByLabelText('uno')).toBeNull()
    await user.click(screen.getByText('abrir'))
    expect(abierto()).toBe(true)
    expect(screen.getByLabelText('uno')).toBeInTheDocument()
  })

  it('el botón Cerrar en una pila de dos solo cierra el tope', async () => {
    const user = userEvent.setup()
    mockFetch()
    renderWithProviders(<Abridor contenido={<input aria-label="base" />} pila={<span>otra</span>} />)
    await user.click(screen.getByText('abrir'))
    await user.click(screen.getByText('apilar'))
    await user.click(screen.getByLabelText('Cerrar'))
    expect(abierto()).toBe(true)
    expect(screen.getByLabelText('base')).toBeVisible()
    expect(screen.queryByText('otra')).toBeNull()
  })
})
