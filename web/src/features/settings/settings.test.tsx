import { fireEvent, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { conAfectadas, failure, mockFetch } from '@/test/mockFetch'
import { renderWithProviders } from '@/test/render'
import { expectLabels, modalBody } from '@/test/labels'
import { estado as estadoBase } from '@/test/factories'
import { META } from '@/test/meta'
import { Settings } from '.'

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'], now: new Date(2026, 5, 15, 10, 30) })
})
afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

const OPS = {
  items: [
    { clave: 'deuda:1:2026-01-01', tipo: 'deuda', fuente_id: 1, fecha: '2026-01-01', etiqueta: 'Moto' },
    { clave: 'recurrente:2:2026-02-01', tipo: 'recurrente', fuente_id: 2, fecha: '2026-02-01', etiqueta: null },
  ],
}

describe('categorias', () => {
  it('agrega con POST /api/categorias y refresca el bootstrap porque el header declara categorias', async () => {
    const base = estadoBase()
    const gasto = [...base.categorias.gasto, { nombre: 'Mascotas', sistema: false }]
    const nuevas = { ...base.categorias, gasto }
    const f = mockFetch({ 'POST /api/categorias': conAfectadas(nuevas, 'categorias'), 'GET /api/bootstrap': { ...base, categorias: nuevas } })
    renderWithProviders(<Settings active />)
    await waitFor(() => expect(document.getElementById('settings-new-cat-gasto')).not.toBeNull())
    await userEvent.type(document.getElementById('settings-new-cat-gasto') as HTMLInputElement, 'Mascotas{Enter}')
    expect(await screen.findByText('Mascotas')).toBeInTheDocument()
    expect(f.callsTo('GET', '/api/bootstrap')).toHaveLength(1)
    expect(f.mutations()[0]).toMatchObject({ method: 'POST', url: '/api/categorias', headers: { 'X-Moni-Request': '1' }, body: { tipo: 'gasto', nombre: 'Mascotas' } })
    expect((document.getElementById('settings-new-cat-gasto') as HTMLInputElement).value).toBe('')
  })

  it('quita una custom con DELETE y query', async () => {
    const base = estadoBase()
    const estado = { ...base, categorias: { ...base.categorias, gasto: [...base.categorias.gasto, { nombre: 'Mascotas', sistema: false }] } }
    const f = mockFetch({ 'DELETE /api/categorias': conAfectadas(base.categorias, 'categorias'), 'GET /api/bootstrap': base })
    renderWithProviders(<Settings active />, { estado })
    await userEvent.click(screen.getByRole('button', { name: 'Eliminar Mascotas' }))
    await waitFor(() => expect(screen.queryByText('Mascotas')).toBeNull())
    expect(f.mutations()[0]).toMatchObject({ method: 'DELETE', url: '/api/categorias?tipo=gasto&nombre=Mascotas', headers: { 'X-Moni-Request': '1' } })
  })

  it('las categorias de sistema no tienen boton de eliminar', () => {
    renderWithProviders(<Settings active />)
    expect(screen.getByText('Intereses')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Eliminar Intereses' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Eliminar Pago deuda' })).toBeNull()
  })
})

describe('operaciones ocultas', () => {
  it('lista lo que devuelve el backend y restaura una', async () => {
    const f = mockFetch({ 'GET /api/ops-ocultas': OPS, 'DELETE /api/ops-ocultas': {} })
    renderWithProviders(<Settings active />)
    expect(await screen.findByText('deuda:1:2026-01-01')).toBeInTheDocument()
    expect(screen.getByText(/Moto/)).toBeInTheDocument()
    await userEvent.click(screen.getAllByRole('button', { name: 'Restaurar' })[0] as HTMLElement)
    await waitFor(() => expect(screen.queryByText('Mascotas')).toBeNull())
    expect(f.mutations()[0]).toMatchObject({ method: 'DELETE', url: '/api/ops-ocultas?clave=deuda%3A1%3A2026-01-01', headers: { 'X-Moni-Request': '1' } })
    await waitFor(() => expect(f.callsTo('GET', '/api/ops-ocultas').length).toBeGreaterThan(1))
  })

  it('restaurar todas manda DELETE sin clave', async () => {
    const f = mockFetch({ 'GET /api/ops-ocultas': OPS, 'DELETE /api/ops-ocultas': {} })
    renderWithProviders(<Settings active />)
    await userEvent.click(await screen.findByRole('button', { name: 'Restaurar todas' }))
    await waitFor(() => expect(screen.queryByText('Mascotas')).toBeNull())
    expect(f.mutations()[0]).toMatchObject({ method: 'DELETE', url: '/api/ops-ocultas', headers: { 'X-Moni-Request': '1' } })
  })

  it('sin ocultas muestra el vacio', async () => {
    mockFetch({})
    renderWithProviders(<Settings active />)
    expect(await screen.findByText('Ninguna operación oculta.')).toBeInTheDocument()
  })
})

describe('moneda', () => {
  it('un símbolo desconocido muestra la primera opción', () => {
    const base = estadoBase()
    renderWithProviders(<Settings active />, { estado: { ...base, ajustes: { moneda_simbolo: 'CHF' } } })
    expect(screen.getByRole('button', { name: 'Símbolo mostrado junto a los montos' })).toHaveTextContent('Peso colombiano ($)')
  })

  it('cambia el simbolo con PUT /api/ajustes y refresca el bootstrap por el header', async () => {
    const f = mockFetch({
      'PUT /api/ajustes': conAfectadas({ moneda_simbolo: '€' }, 'ajustes'),
      'GET /api/bootstrap': { ...estadoBase(), ajustes: { moneda_simbolo: '€' } },
    })
    renderWithProviders(<Settings active />)
    await userEvent.click(screen.getByRole('button', { name: 'Símbolo mostrado junto a los montos' }))
    await userEvent.click(await screen.findByRole('option', { name: 'Euro (€)' }))
    await waitFor(() => expect(f.mutations()).toHaveLength(1))
    expect(f.mutations()[0]).toMatchObject({ method: 'PUT', url: '/api/ajustes', headers: { 'X-Moni-Request': '1' }, body: { moneda_simbolo: '€' } })
    await waitFor(() => expect(screen.getByRole('button', { name: 'Símbolo mostrado junto a los montos' })).toHaveTextContent('Euro (€)'))
    expect(f.callsTo('GET', '/api/bootstrap')).toHaveLength(1)
  })
})

describe('backup', () => {
  it('exporta el JSON de /api/backup con el nombre esperado', async () => {
    const data = { transacciones: [{ id: 1 }], deudas: [], inversiones: [], activos: [], recurrentes: [] }
    mockFetch({ 'GET /api/backup': data })
    const create = vi.fn(() => 'blob:x')
    const revoke = vi.fn()
    Object.assign(URL, { createObjectURL: create, revokeObjectURL: revoke })
    let download = ''
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      download = this.download
    })
    renderWithProviders(<Settings active />)
    await userEvent.click(screen.getByRole('button', { name: 'Exportar JSON' }))
    await waitFor(() => expect(click).toHaveBeenCalled())
    const blob = (create.mock.calls[0] as unknown as [Blob])[0]
    expect(blob.type).toBe('application/json')
    expect(await blob.text()).toBe(JSON.stringify(data, null, 2))
    expect(download).toBe('moni-backup-2026-08-20.json')
    expect(revoke).toHaveBeenCalledWith('blob:x')
    click.mockRestore()
  })

  const elegirArchivo = (contenido: string) => {
    const file = new File([contenido], 'b.json', { type: 'application/json' })
    fireEvent.change(document.querySelector('input[type=file]') as HTMLInputElement, { target: { files: [file] } })
  }

  it('importar pide la clave en un modal y manda POST /api/import con payload y clave', async () => {
    const f = mockFetch({ 'POST /api/import': conAfectadas({ counts: { transacciones: 2, deudas: 1 }, texto: 'Importado: 2 transacciones, 1 deuda' }, 'transacciones,deudas,categorias') })
    renderWithProviders(<Settings active />)
    const payload = { transacciones: [{ id: 1 }, { id: 2 }], deudas: [{ id: 1 }] }
    elegirArchivo(JSON.stringify(payload))
    await userEvent.type(await screen.findByLabelText('Clave'), 'secreta{Enter}')
    await waitFor(() => expect(document.getElementById('settings-backup-status')?.textContent).toBe('Importado: 2 transacciones, 1 deuda'))
    expect(f.mutations()).toHaveLength(1)
    expect(f.mutations()[0]).toMatchObject({ method: 'POST', url: '/api/import', headers: { 'X-Moni-Request': '1' }, body: { ...payload, clave: 'secreta' } })
    expect(document.getElementById('settings-backup-status')).toHaveClass('form-status', 'ok')
    expect(f.callsTo('GET', '/api/bootstrap')).toHaveLength(1)
  })

  it('sin clave no manda nada y pide la clave', async () => {
    const f = mockFetch({})
    renderWithProviders(<Settings active />)
    elegirArchivo('{}')
    await screen.findByLabelText('Clave')
    await userEvent.click(screen.getByRole('button', { name: 'Importar' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Ingresá tu clave para confirmar esta acción')
    expect(f.mutations()).toHaveLength(0)
  })

  it('un 403 por clave incorrecta muestra el mensaje del backend en el modal y no cierra', async () => {
    mockFetch({ 'POST /api/import': failure(403, 'Ingresá tu clave para confirmar esta acción') })
    renderWithProviders(<Settings active />)
    elegirArchivo('{}')
    await userEvent.type(await screen.findByLabelText('Clave'), 'mala{Enter}')
    expect(await screen.findByRole('alert')).toHaveTextContent('Ingresá tu clave para confirmar esta acción')
    expect(screen.getByLabelText('Clave')).toBeInTheDocument()
  })

  it('muestra el error del import dentro del modal', async () => {
    mockFetch({ 'POST /api/import': failure(409, 'ids duplicados') })
    renderWithProviders(<Settings active />)
    elegirArchivo('{}')
    await userEvent.type(await screen.findByLabelText('Clave'), 'secreta{Enter}')
    expect(await screen.findByRole('alert')).toHaveTextContent('ids duplicados')
  })

  it('un archivo que no es JSON muestra el error en el panel sin abrir el modal', async () => {
    mockFetch({})
    renderWithProviders(<Settings active />)
    elegirArchivo('no es json')
    await waitFor(() => expect(document.getElementById('settings-backup-status')).toHaveClass('err'))
    expect(screen.queryByLabelText('Clave')).toBeNull()
  })

  it('el input de archivo se puede enfocar con teclado', () => {
    renderWithProviders(<Settings active />)
    const input = document.querySelector('input[type=file]') as HTMLInputElement
    expect(input).not.toHaveClass('hidden')
    expect(input.tabIndex).not.toBe(-1)
  })
})

describe('zona de peligro', () => {
  it('muestra el texto y exige la palabra de meta.truncate antes de pedir la clave', async () => {
    const f = mockFetch({ 'POST /api/truncate': { ok: true } })
    renderWithProviders(<Settings active />)
    const card = document.getElementById('settings-danger-card') as HTMLElement
    await waitFor(() => expect(card).toHaveTextContent(META.truncate.texto))
    expect(card.textContent).not.toMatch(/Borra Esto borra/)
    await userEvent.click(screen.getByRole('button', { name: 'Borrar todos los datos' }))
    await userEvent.click(screen.getByRole('button', { name: 'Borrar todo' }))
    expect(screen.getByText('Escribí BORRAR (en mayúsculas) para confirmar')).toBeInTheDocument()
    await userEvent.type(screen.getByPlaceholderText('BORRAR'), 'borrar')
    await userEvent.type(screen.getByLabelText('Clave'), 'secreta')
    await userEvent.click(screen.getByRole('button', { name: 'Borrar todo' }))
    expect(f.mutations()).toHaveLength(0)
  })

  it('con la palabra y la clave envia POST /api/truncate con la clave y recarga', async () => {
    const f = mockFetch({ 'POST /api/truncate': { ok: true } })
    renderWithProviders(<Settings active />)
    await userEvent.click(await screen.findByRole('button', { name: 'Borrar todos los datos' }))
    expect(modalBody()).toHaveTextContent(META.truncate.texto)
    await userEvent.type(screen.getByPlaceholderText('BORRAR'), ' BORRAR ')
    await userEvent.type(screen.getByLabelText('Clave'), 'secreta{Enter}')
    await waitFor(() => expect(screen.queryByPlaceholderText('BORRAR')).toBeNull())
    expect(f.mutations()).toHaveLength(1)
    expect(f.mutations()[0]).toMatchObject({ method: 'POST', url: '/api/truncate', headers: { 'X-Moni-Request': '1' }, body: { clave: 'secreta' } })
    expect(f.callsTo('GET', '/api/bootstrap').length).toBeGreaterThan(0)
  })

  it('un 403 de clave se muestra en el modal sin cerrarlo', async () => {
    mockFetch({ 'POST /api/truncate': failure(403, 'Ingresá tu clave para confirmar esta acción') })
    renderWithProviders(<Settings active />)
    await userEvent.click(await screen.findByRole('button', { name: 'Borrar todos los datos' }))
    await userEvent.type(screen.getByPlaceholderText('BORRAR'), 'BORRAR')
    await userEvent.type(screen.getByLabelText('Clave'), 'mala{Enter}')
    expect(await screen.findByRole('alert')).toHaveTextContent('Ingresá tu clave para confirmar esta acción')
    expect(screen.getByPlaceholderText('BORRAR')).toBeInTheDocument()
  })
})

describe('teclado', () => {
  it('todo lo accionable es button/input alcanzable por Tab', async () => {
    mockFetch({ 'GET /api/ops-ocultas': OPS })
    renderWithProviders(<Settings active />)
    await screen.findByText('deuda:1:2026-01-01')
    const first = document.getElementById('settings-new-cat-ingreso') as HTMLInputElement
    first.focus()
    await userEvent.tab()
    expect(document.activeElement?.textContent).toBe('Agregar')
    await userEvent.keyboard('{Enter}')
    for (const b of screen.getAllByRole('button')) expect(b.tabIndex).not.toBe(-1)
  })
})

describe('labels', () => {
  it('moneda y confirmación de borrado se encuentran por su label', async () => {
    renderWithProviders(<Settings active />)
    expectLabels(document.getElementById('settings-currency-card') as HTMLElement, { 'Símbolo mostrado junto a los montos': 'settings-currency-select' })
    await userEvent.click(await screen.findByRole('button', { name: 'Borrar todos los datos' }))
    expectLabels(modalBody(), { 'Escribí BORRAR para confirmar': 'm-confirm-truncate', Clave: 'm-clave' })
  })
})
