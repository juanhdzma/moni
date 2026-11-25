import { act, renderHook, screen } from '@testing-library/react'
import { useEffect } from 'react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Select } from '@/controls/Select'
import { mockFetch } from '@/test/mockFetch'
import { renderWithProviders } from '@/test/render'
import { useModal, useModalStatus } from '@/shell/providers/ModalProvider'

function Abridor({ contenido, pila }: { contenido: React.ReactNode; pila?: React.ReactNode }) {
  const { openModal, pushModal } = useModal()
  return (
    <>
      <button onClick={() => openModal('Titulo', contenido)}>abrir</button>
      <button onClick={() => pushModal('Encima', pila)}>apilar</button>
    </>
  )
}

const abierto = () => document.getElementById('modal-overlay')?.classList.contains('open')

afterEach(() => vi.unstubAllGlobals())

function Sonda() {
  const { cls, msg } = useModalStatus()
  return <output data-testid="status">{JSON.stringify({ cls, msg })}</output>
}

describe('estado, foco de retorno y clases', () => {
  it('useModal fuera de ModalProvider avisa con un error claro', () => {
    const consola = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    expect(() => renderHook(() => useModal())).toThrow('useModal fuera de ModalProvider')
    consola.mockRestore()
  })

  it('el overlay lleva modal-overlay y suma open solo mientras hay modal', async () => {
    const user = userEvent.setup()
    mockFetch()
    renderWithProviders(<Abridor contenido={<input />} />)
    const overlay = document.getElementById('modal-overlay')
    expect(overlay?.className).toBe('modal-overlay')
    await user.click(screen.getByText('abrir'))
    expect(overlay?.className).toBe('modal-overlay open')
  })

  it('el estado del form se pinta dentro del modal y se limpia al abrir otro', async () => {
    const user = userEvent.setup()
    mockFetch()
    function ConEstado() {
      const { openModal, setModalStatus } = useModal()
      const contenido = (
        <>
          <Sonda />
          <button onClick={() => setModalStatus('err', 'mal')}>fallar</button>
        </>
      )
      return <button onClick={() => openModal('Uno', contenido)}>abrir</button>
    }
    renderWithProviders(<ConEstado />)
    await user.click(screen.getByText('abrir'))
    expect(screen.getByTestId('status')).toHaveTextContent('{"cls":"","msg":""}')
    await user.click(screen.getByText('fallar'))
    expect(screen.getByTestId('status')).toHaveTextContent('{"cls":"err","msg":"mal"}')
    await user.click(screen.getByLabelText('Cerrar'))
    await user.click(screen.getByText('abrir'))
    expect(screen.getByTestId('status')).toHaveTextContent('{"cls":"","msg":""}')
  })

  it('reemplazar el modal con openModal sin cerrar conserva el abridor original para devolver el foco', async () => {
    const user = userEvent.setup()
    mockFetch()
    function Reemplazo() {
      const { openModal } = useModal()
      return (
        <button onClick={() => openModal('Uno', <button onClick={() => openModal('Dos', <input aria-label="campo" />)}>reemplazar</button>)}>abrir</button>
      )
    }
    renderWithProviders(<Reemplazo />)
    const abrir = screen.getByText('abrir')
    abrir.focus()
    await user.click(abrir)
    await user.click(screen.getByText('reemplazar'))
    expect(screen.getByText('Dos')).toBeInTheDocument()
    await user.click(screen.getByLabelText('Cerrar'))
    expect(abrir).toHaveFocus()
  })

  it('pushModal sin modal abierto recuerda al abridor y le devuelve el foco al cerrar', async () => {
    const user = userEvent.setup()
    mockFetch()
    renderWithProviders(<Abridor contenido={<input />} pila={<button>dentro</button>} />)
    const apilar = screen.getByText('apilar')
    apilar.focus()
    await user.click(apilar)
    await user.keyboard('{Escape}')
    expect(abierto()).toBe(false)
    expect(apilar).toHaveFocus()
  })

  it('el abridor de una apertura vieja no se arrastra: la segunda apertura devuelve el foco a su propio botón', async () => {
    const user = userEvent.setup()
    mockFetch()
    function DosBotones() {
      const { openModal } = useModal()
      return (
        <>
          <button onClick={() => openModal('A', <input />)}>abrir-a</button>
          <button onClick={() => openModal('B', <input />)}>abrir-b</button>
        </>
      )
    }
    renderWithProviders(<DosBotones />)
    await user.click(screen.getByText('abrir-a'))
    await user.click(screen.getByLabelText('Cerrar'))
    await user.click(screen.getByText('abrir-b'))
    await user.click(screen.getByLabelText('Cerrar'))
    expect(screen.getByText('abrir-b')).toHaveFocus()
  })

  it('con tres capas, cerrar la de arriba deja las dos de abajo', async () => {
    const user = userEvent.setup()
    mockFetch()
    function Tres() {
      const { openModal, pushModal } = useModal()
      return (
        <button
          onClick={() => {
            openModal('Capa 1', <span>uno</span>)
            pushModal('Capa 2', <span>dos</span>)
            pushModal('Capa 3', <span>tres</span>)
          }}
        >
          abrir
        </button>
      )
    }
    renderWithProviders(<Tres />)
    await user.click(screen.getByText('abrir'))
    expect(screen.getByText('Capa 3')).toHaveAttribute('id', 'modal-title')
    await user.click(screen.getByLabelText('Cerrar'))
    expect(screen.getByText('Capa 2')).toHaveAttribute('id', 'modal-title')
    expect(screen.getByText('dos')).toBeVisible()
    expect(screen.getByText('uno', { selector: 'span' })).not.toBeVisible()
    await user.click(screen.getByLabelText('Cerrar'))
    expect(screen.getByText('Capa 1')).toHaveAttribute('id', 'modal-title')
    expect(screen.getByText('uno')).toBeVisible()
  })

  it('apilar un modal cierra el popup de Select abierto en el form de abajo', async () => {
    const user = userEvent.setup()
    mockFetch()
    function ConSelect() {
      const { openModal, pushModal } = useModal()
      return (
        <button
          onClick={() =>
            openModal(
              'Form',
              <>
                <Select value="a" onChange={() => undefined} options={[{ value: 'a', label: 'A' }]} />
                <button onClick={() => pushModal('Encima', <span>sobre</span>)}>apilar</button>
              </>,
            )
          }
        >
          abrir
        </button>
      )
    }
    renderWithProviders(<ConSelect />)
    await user.click(screen.getByText('abrir'))
    await user.click(screen.getByRole('button', { name: /A/ }))
    expect(document.querySelector('.cdd-menu')).toHaveClass('open')
    await user.click(screen.getByText('apilar'))
    expect(document.querySelector('.cdd-menu')).not.toHaveClass('open')
  })
})

describe('popups al apilar sin click de por medio', () => {
  it('pushModal cierra el popup abierto aunque nadie haya hecho click afuera', async () => {
    const user = userEvent.setup()
    mockFetch()
    const sujeto: { api: ReturnType<typeof useModal> | null } = { api: null }
    function ConSelect() {
      const api = useModal()
      useEffect(() => {
        sujeto.api = api
      })
      return (
        <button onClick={() => api.openModal('Form', <Select value="a" onChange={() => undefined} options={[{ value: 'a', label: 'A' }]} />)}>
          abrir
        </button>
      )
    }
    renderWithProviders(<ConSelect />)
    await user.click(screen.getByText('abrir'))
    await user.click(screen.getByRole('button', { name: /A/ }))
    expect(document.querySelector('.cdd-menu')).toHaveClass('open')
    act(() => sujeto.api?.pushModal('Encima', <span>sobre</span>))
    expect(document.querySelector('.cdd-menu')).not.toHaveClass('open')
  })
})
