import { fireEvent, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { clearCurrencySymbolCache } from '../../lib/format'
import { json, mockFetch } from '../../test/mockFetch'
import { renderWithProviders } from '../../test/render'
import { expectLabels, modalBody } from '../../test/labels'
import { Dashboard } from '../dashboard'
import { Settings } from '.'

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'], now: new Date(2026, 5, 15, 10, 30) })
  localStorage.clear()
  clearCurrencySymbolCache()
})
afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

describe('categorias', () => {
  it('agrega y quita una categoria custom y persiste en moni_cats', async () => {
    renderWithProviders(<Settings active />)
    await userEvent.type(document.getElementById('settings-new-cat-gasto') as HTMLInputElement, 'Mascotas{Enter}')
    expect(screen.getByText('Mascotas')).toBeTruthy()
    expect(JSON.parse(localStorage.getItem('moni_cats') ?? '{}')).toEqual({ gasto: ['Mascotas'] })
    expect((document.getElementById('settings-new-cat-gasto') as HTMLInputElement).value).toBe('')
    await userEvent.click(screen.getByRole('button', { name: 'Eliminar Mascotas' }))
    expect(screen.queryByText('Mascotas')).toBeNull()
    expect(JSON.parse(localStorage.getItem('moni_cats') ?? '{}')).toEqual({ gasto: [] })
  })

  it('las categorias de sistema no tienen boton de eliminar', () => {
    renderWithProviders(<Settings active />)
    expect(screen.getByText('Intereses')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Eliminar Intereses' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Eliminar Pago deuda' })).toBeNull()
  })
})

describe('operaciones ocultas', () => {
  it('lista y restaura una', async () => {
    localStorage.setItem('moni_skipped_ops', JSON.stringify(['deuda:1:2026-01-01', 'rec:2:2026-02-01']))
    renderWithProviders(<Settings active />)
    expect(screen.getByText('deuda:1:2026-01-01')).toBeTruthy()
    await userEvent.click(screen.getAllByRole('button', { name: 'Restaurar' })[0] as HTMLElement)
    expect(screen.queryByText('deuda:1:2026-01-01')).toBeNull()
    expect(JSON.parse(localStorage.getItem('moni_skipped_ops') ?? '[]')).toEqual(['rec:2:2026-02-01'])
    await userEvent.click(screen.getByRole('button', { name: 'Restaurar todas' }))
    expect(screen.getByText('Ninguna operación oculta.')).toBeTruthy()
  })
})

describe('operaciones ocultas y recarga', () => {
  it('siguen listadas tras montar la app antes de la primera carga', () => {
    const guardadas = ['deuda:1:2026-01-01', 'rec:2:2026-02-01']
    localStorage.setItem('moni_skipped_ops', JSON.stringify(guardadas))
    renderWithProviders(
      <>
        <Dashboard active />
        <Settings active />
      </>,
      { loaded: false },
    )
    expect(screen.getByText('deuda:1:2026-01-01')).toBeTruthy()
    expect(screen.getByText('rec:2:2026-02-01')).toBeTruthy()
    expect(JSON.parse(localStorage.getItem('moni_skipped_ops') ?? '[]')).toEqual(guardadas)
  })
})

describe('moneda', () => {
  it('un símbolo guardado desconocido muestra la primera opción sin escribir nada', () => {
    localStorage.setItem('moni_currency_symbol', 'CHF')
    renderWithProviders(<Settings active />)
    expect(screen.getByRole('button', { name: 'Símbolo mostrado junto a los montos' })).toHaveTextContent('Peso colombiano ($)')
    expect(localStorage.getItem('moni_currency_symbol')).toBe('CHF')
  })

  it('cambia el simbolo y lo persiste', async () => {
    renderWithProviders(<Settings active />)
    await userEvent.click(screen.getByRole('button', { name: 'Símbolo mostrado junto a los montos' }))
    await userEvent.click(screen.getByRole('option', { name: 'Euro (€)' }))
    expect(localStorage.getItem('moni_currency_symbol')).toBe('€')
  })
})

describe('backup', () => {
  it('exporta el JSON de /api/all con el nombre esperado', async () => {
    const data = { transacciones: [{ id: 1 }], deudas: [], inversiones: [], activos: [], recurrentes: [] }
    mockFetch({ 'GET /api/all': data })
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
    expect(download).toBe('moni-backup-2026-06-15.json')
    expect(revoke).toHaveBeenCalledWith('blob:x')
    click.mockRestore()
  })

  it('importa con POST /api/import y muestra el resultado', async () => {
    const f = mockFetch({ 'POST /api/import': { transacciones: 2, deudas: 1 } })
    renderWithProviders(<Settings active />)
    const payload = { transacciones: [{ id: 1 }, { id: 2 }], deudas: [{ id: 1 }] }
    const file = new File([JSON.stringify(payload)], 'b.json', { type: 'application/json' })
    const input = document.querySelector('input[type=file]') as HTMLInputElement
    fireEvent.change(input, { target: { files: [file] } })
    await waitFor(() => expect(document.getElementById('settings-backup-status')?.textContent).toBe('Importado: 2 transacciones, 1 deudas'))
    expect(f.mutations()[0]).toMatchObject({ method: 'POST', url: '/api/import', headers: { 'X-Moni-Request': '1' }, body: payload })
    expect(document.getElementById('settings-backup-status')?.className).toBe('form-status ok')
  })

  it('muestra el error del import', async () => {
    mockFetch({ 'POST /api/import': json({ detail: 'ids duplicados' }, 409) })
    renderWithProviders(<Settings active />)
    const file = new File(['{}'], 'b.json', { type: 'application/json' })
    fireEvent.change(document.querySelector('input[type=file]') as HTMLInputElement, { target: { files: [file] } })
    await waitFor(() => expect(document.getElementById('settings-backup-status')?.textContent).toBe('❌ ids duplicados'))
    expect(document.getElementById('settings-backup-status')?.className).toBe('form-status err')
  })
})

describe('zona de peligro', () => {
  it('exige BORRAR y luego envia POST /api/truncate', async () => {
    const f = mockFetch({ 'POST /api/truncate': { ok: true } })
    renderWithProviders(<Settings active />)
    await userEvent.click(screen.getByRole('button', { name: 'Borrar todos los datos' }))
    await userEvent.click(screen.getByRole('button', { name: 'Borrar todo' }))
    expect(screen.getByText('Escribí BORRAR (en mayúsculas) para confirmar')).toBeTruthy()
    expect(f.mutations()).toHaveLength(0)
    await userEvent.type(screen.getByPlaceholderText('BORRAR'), 'borrar')
    await userEvent.click(screen.getByRole('button', { name: 'Borrar todo' }))
    expect(f.mutations()).toHaveLength(0)
    await userEvent.clear(screen.getByPlaceholderText('BORRAR'))
    await userEvent.type(screen.getByPlaceholderText('BORRAR'), ' BORRAR ')
    await userEvent.click(screen.getByRole('button', { name: 'Borrar todo' }))
    await waitFor(() => expect(screen.queryByPlaceholderText('BORRAR')).toBeNull())
    expect(f.mutations()[0]).toMatchObject({ method: 'POST', url: '/api/truncate', headers: { 'X-Moni-Request': '1' } })
    expect(f.callsTo('GET', '/api/all').length).toBeGreaterThan(0)
  })
})

describe('teclado', () => {
  it('todo lo accionable es button/input alcanzable por Tab', async () => {
    localStorage.setItem('moni_skipped_ops', JSON.stringify(['a:1:2026-01-01']))
    renderWithProviders(<Settings active />)
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
    expectLabels(document.getElementById('settings-currency') as HTMLElement, { 'Símbolo mostrado junto a los montos': 'settings-currency-select' })
    await userEvent.click(screen.getByRole('button', { name: 'Borrar todos los datos' }))
    expectLabels(modalBody(), { 'Escribí BORRAR para confirmar': 'm-confirm-truncate' })
  })
})
