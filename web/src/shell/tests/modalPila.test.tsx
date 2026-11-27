import { act, renderHook, screen } from '@testing-library/react'
import { useEffect } from 'react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Select } from '@/controls/inputs/Select'
import { mockFetch } from '@/test/mockFetch'
import { renderWithProviders } from '@/test/render'
import { ConfirmModal } from '@/shell/hooks/acciones/ConfirmModal'
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

beforeEach(() => localStorage.clear())
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

describe('modal', () => {
  describe('pila: confirmación encima del form', () => {
    function ConPila() {
      const { openModal, pushModal, popModal, closeModal } = useModal()
      const confirmar = () =>
        pushModal('Confirmar', <ConfirmModal mensaje="¿Seguro?" onCancelar={popModal} onConfirmar={() => closeModal()} />)
      return (
        <button onClick={() => openModal('Form', <><input aria-label="nombre" /><button onClick={confirmar}>pedir</button></>)}>abrir</button>
      )
    }

    const abrirConfirmacion = async () => {
      const user = userEvent.setup()
      renderWithProviders(<ConPila />)
      const abrir = screen.getByText('abrir')
      abrir.focus()
      await user.click(abrir)
      await user.type(screen.getByLabelText('nombre'), 'abc')
      await user.click(screen.getByRole('button', { name: 'pedir' }))
      return { user, abrir }
    }

    it('al abrirla muestra solo la confirmación y enfoca su primer control', async () => {
      await abrirConfirmacion()
      expect(screen.getByText('Confirmar')).toHaveAttribute('id', 'modal-title')
      expect(screen.getByText('¿Seguro?')).toBeVisible()
      expect(screen.getByLabelText('nombre')).not.toBeVisible()
      expect(screen.getByRole('button', { name: 'Cancelar' })).toHaveFocus()
    })

    it('cancelar vuelve al form con lo escrito y devuelve el foco al botón que la abrió', async () => {
      const { user } = await abrirConfirmacion()
      await user.click(screen.getByRole('button', { name: 'Cancelar' }))
      expect(document.getElementById('modal-overlay')).toHaveClass('open')
      expect(screen.getByText('Form')).toHaveAttribute('id', 'modal-title')
      expect(screen.getByLabelText('nombre')).toHaveValue('abc')
      expect(screen.queryByText('¿Seguro?')).toBeNull()
      expect(screen.getByRole('button', { name: 'pedir' })).toHaveFocus()
    })

    it('confirmar cierra todo y devuelve el foco al abridor original', async () => {
      const { user, abrir } = await abrirConfirmacion()
      await user.click(screen.getByRole('button', { name: 'Eliminar' }))
      expect(document.getElementById('modal-overlay')).not.toHaveClass('open')
      expect(abrir).toHaveFocus()
    })

    it('Escape cierra solo el tope y un segundo Escape cierra el form', async () => {
      const { user, abrir } = await abrirConfirmacion()
      await user.keyboard('{Escape}')
      expect(document.getElementById('modal-overlay')).toHaveClass('open')
      expect(screen.getByLabelText('nombre')).toHaveValue('abc')
      await user.keyboard('{Escape}')
      expect(document.getElementById('modal-overlay')).not.toHaveClass('open')
      expect(abrir).toHaveFocus()
    })

    it('Tab no escapa a los controles escondidos del form de abajo', async () => {
      const { user } = await abrirConfirmacion()
      const eliminar = screen.getByRole('button', { name: 'Eliminar' })
      eliminar.focus()
      await user.tab()
      expect(screen.getByLabelText('Cerrar')).toHaveFocus()
    })
  })
})
