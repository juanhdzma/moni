import { act, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mockFetch } from '@/test/mockFetch'
import { renderWithProviders } from '@/test/render'
import { FormStatus } from '@/controls/forms/FormStatus'
import { Select } from '@/controls/inputs/Select'
import { Shell } from '@/shell/layout/Shell'
import { useModal } from '@/shell/providers/ModalProvider'
import { useMutations } from '@/shell/hooks/acciones/useMutations'

const TX = { fecha: '2026-08-01', tipo: 'gasto', categoria: 'c', descripcion: '', monto: 1, notas: '', tarjeta_id: null } as const

function Harness() {
  const { openModal, setPendingProxOp, setModalStatus } = useModal()
  const { crudOp } = useMutations()
  return (
    <>
      <button
        onClick={() =>
          openModal(
            'Titulo',
            <div>
              <input aria-label="uno" />
              <input aria-label="dos" />
              <button onClick={() => setModalStatus('err', 'mal')}>status</button>
              <FormStatus />
            </div>,
          )
        }
      >
        abrir
      </button>
      <button onClick={() => setPendingProxOp('deuda:1:2026-08-01')}>pend</button>
      <button onClick={() => void crudOp('tx', 'add', TX)}>enviar</button>
      <button
        onClick={() => {
          openModal('Pago', <div />)
          setPendingProxOp('deuda:1:2026-08-01')
          crudOp('tx', 'add', TX).catch(() => undefined)
        }}
      >
        guardar
      </button>
    </>
  )
}

beforeEach(() => localStorage.clear())
afterEach(() => vi.unstubAllGlobals())

function Reopen() {
  const { openModal, closeModal, setPendingProxOp } = useModal()
  return (
    <>
      <button
        onClick={() => {
          setPendingProxOp('deuda:1:2026-08-01')
          openModal(
            'Primero',
            <button
              onClick={() => {
                closeModal()
                openModal('Segundo', <input aria-label="campo" />)
              }}
            >
              editar
            </button>,
          )
        }}
      >
        abrir
      </button>
    </>
  )
}

describe('modal', () => {
  it('cerrar y reabrir en el mismo tick devuelve el foco al abridor original aunque closeModal no pueda enfocarlo', async () => {
    const user = userEvent.setup()
    renderWithProviders(<Reopen />)
    const abrir = screen.getByText('abrir')
    await user.click(abrir)
    abrir.focus = () => undefined
    await user.click(screen.getByText('editar'))
    expect(screen.getByText('Segundo')).toBeInTheDocument()
    delete (abrir as { focus?: unknown }).focus
    await user.click(screen.getByLabelText('Cerrar'))
    expect(abrir).toHaveFocus()
  })

  it('markup, foco al abrir y restauración al cerrar', async () => {
    const user = userEvent.setup()
    renderWithProviders(<Harness />)
    const abrir = screen.getByText('abrir')
    abrir.focus()
    await user.click(abrir)
    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(dialog).toHaveAttribute('aria-labelledby', 'modal-title')
    expect(dialog).not.toHaveAttribute('aria-describedby')
    expect(document.getElementById('modal-overlay')).toHaveClass('open')
    expect(screen.getByText('Titulo')).toHaveAttribute('id', 'modal-title')
    expect(screen.getByLabelText('Cerrar')).toHaveFocus()
    await user.click(screen.getByLabelText('Cerrar'))
    expect(document.getElementById('modal-overlay')).not.toHaveClass('open')
    expect(abrir).toHaveFocus()
  })

  it('focus trap con Tab y Shift+Tab', async () => {
    const user = userEvent.setup()
    renderWithProviders(<Harness />)
    await user.click(screen.getByText('abrir'))
    const cerrar = screen.getByLabelText('Cerrar')
    const status = screen.getByText('status')
    status.focus()
    await user.tab()
    expect(cerrar).toHaveFocus()
    await user.tab({ shift: true })
    expect(status).toHaveFocus()
  })

  it('click en el backdrop cierra, click dentro no', async () => {
    const user = userEvent.setup()
    renderWithProviders(<Harness />)
    await user.click(screen.getByText('abrir'))
    await user.click(screen.getByRole('dialog'))
    expect(document.getElementById('modal-overlay')).toHaveClass('open')
    await user.click(document.getElementById('modal-overlay') as HTMLElement)
    expect(document.getElementById('modal-overlay')).not.toHaveClass('open')
  })

  it('cerrar limpia la clave pendiente de próximas operaciones', async () => {
    const user = userEvent.setup()
    const f = mockFetch({ 'POST /api/tx': {} })
    renderWithProviders(<Harness />)
    await user.click(screen.getByText('abrir'))
    await user.click(screen.getByText('pend'))
    await user.click(screen.getByLabelText('Cerrar'))
    await user.click(screen.getByText('abrir'))
    await user.click(screen.getByLabelText('Cerrar'))
    await user.click(screen.getByText('enviar'))
    await vi.waitFor(() => expect(f.callsTo('POST', '/api/tx')).toHaveLength(1))
    expect(f.callsTo('POST', '/api/tx')[0]?.body).toEqual(TX)
  })

  it('la clave pendiente viaja como op_clave en el body de la mutación', async () => {
    const user = userEvent.setup()
    const f = mockFetch({ 'POST /api/tx': {} })
    renderWithProviders(<Harness />)
    await user.click(screen.getByText('guardar'))
    await vi.waitFor(() => expect(f.callsTo('POST', '/api/tx')).toHaveLength(1))
    expect(f.callsTo('POST', '/api/tx')[0]).toMatchObject({
      headers: { 'X-Moni-Request': '1' },
      body: { ...TX, op_clave: 'deuda:1:2026-08-01' },
    })
    expect(document.getElementById('modal-overlay')).not.toHaveClass('open')
  })

  it('si la mutación falla el modal sigue abierto', async () => {
    const user = userEvent.setup()
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    mockFetch({ 'POST /api/tx': new Response('{"detail":"no"}', { status: 400 }) })
    renderWithProviders(<Harness />)
    await user.click(screen.getByText('guardar'))
    await act(async () => {
      await Promise.resolve()
    })
    expect(document.getElementById('modal-overlay')).toHaveClass('open')
    spy.mockRestore()
  })

  it('setModalStatus pinta el form-status', async () => {
    const user = userEvent.setup()
    renderWithProviders(<Harness />)
    await user.click(screen.getByText('abrir'))
    await user.click(screen.getByText('status'))
    const el = document.getElementById('m-status') as HTMLElement
    expect(el).toHaveClass('form-status', 'err')
    expect(el).toHaveTextContent('mal')
  })

  it('cerrar el modal cierra un popup de Select abierto', async () => {
    const user = userEvent.setup()
    function WithSelect() {
      const { openModal } = useModal()
      return (
        <button onClick={() => openModal('S', <Select value="a" onChange={() => undefined} options={[{ value: 'a', label: 'A' }]} />)}>
          abrir
        </button>
      )
    }
    renderWithProviders(<WithSelect />)
    await user.click(screen.getByText('abrir'))
    await user.click(screen.getByRole('button', { name: /A/ }))
    expect(document.querySelector('.cdd-menu')).toHaveClass('open')
    await user.click(screen.getByLabelText('Cerrar'))
    expect(document.querySelector('.cdd-menu')).toBeNull()
  })

  it('Escape en el Shell cierra el modal', async () => {
    const user = userEvent.setup()
    mockFetch()
    renderWithProviders(<Shell />)
    await user.click(screen.getAllByText('Deudas')[0] as HTMLElement)
    await user.click(screen.getByLabelText('Agregar'))
    expect(document.getElementById('modal-overlay')).toHaveClass('open')
    await user.keyboard('{Escape}')
    expect(document.getElementById('modal-overlay')).not.toHaveClass('open')
  })

  it('Escape con un popup abierto cierra solo el popup; el segundo cierra el modal', async () => {
    const user = userEvent.setup()
    function WithSelect() {
      const { openModal } = useModal()
      return (
        <button onClick={() => openModal('S', <Select value="a" onChange={() => undefined} options={[{ value: 'a', label: 'A' }]} />)}>
          abrir
        </button>
      )
    }
    mockFetch()
    renderWithProviders(
      <>
        <Shell />
        <WithSelect />
      </>,
    )
    await user.click(screen.getByText('abrir'))
    await user.click(document.querySelector('.cdd-trigger') as HTMLElement)
    expect(document.querySelector('.cdd-menu')).toHaveClass('open')
    await user.keyboard('{Escape}')
    expect(document.querySelector('.cdd-menu')).not.toHaveClass('open')
    expect(document.getElementById('modal-overlay')).toHaveClass('open')
    await user.keyboard('{Escape}')
    expect(document.getElementById('modal-overlay')).not.toHaveClass('open')
  })

  it('un form que lanza cierra el modal, loguea y muestra el banner', async () => {
    const user = userEvent.setup()
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    function Rota(): never {
      throw new Error('boom')
    }
    function Abrir() {
      const { openModal } = useModal()
      return (
        <>
          <button onClick={() => openModal('Rota', <Rota />)}>rota</button>
          <button onClick={() => openModal('Sana', <input aria-label="sano" />)}>sana</button>
        </>
      )
    }
    mockFetch()
    renderWithProviders(
      <>
        <Abrir />
        <Shell />
      </>,
    )
    await user.click(screen.getByText('rota'))
    expect(document.getElementById('modal-overlay')).not.toHaveClass('open')
    expect(document.getElementById('err-banner')).toHaveTextContent('No se pudo abrir el formulario. Mirá la consola.')
    expect(spy).toHaveBeenCalledWith('formulario del modal falló:', expect.any(Error))
    await user.click(screen.getByText('sana'))
    expect(document.getElementById('modal-overlay')).toHaveClass('open')
    expect(screen.getByLabelText('sano')).toBeInTheDocument()
    spy.mockRestore()
  })
})
