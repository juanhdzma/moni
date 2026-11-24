import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '../../../test/render'
import { failure, mockFetch } from '../../../test/mockFetch'
import type { OperacionProxima } from '../../../types'
import { Dashboard } from '../index'
import { PROXIMAS, frase, list, rutas, stat } from './fixtures'

const spies = vi.hoisted(() => ({ pay: vi.fn(), yield: vi.fn(), mat: vi.fn() }))
vi.mock('../../deudas', () => ({ openDeudaPayFormById: spies.pay }))
vi.mock('../../inversiones', () => ({ openInvYieldFormById: spies.yield }))
vi.mock('../../recurrentes', () => ({ openRecurrenteMaterializeFormById: spies.mat }))

beforeEach(() => {
  Object.values(spies).forEach((s) => s.mockClear())
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('Próximas operaciones', () => {
  it('lista lo que devuelve el backend en su orden', async () => {
    mockFetch(rutas())
    renderWithProviders(<Dashboard active />)
    await screen.findByText('Banco')
    const rows = list().querySelectorAll('.prox-op-row')
    expect(Array.from(rows).map((r) => r.querySelector('.prox-op-label')?.textContent)).toEqual(['Gym', 'Banco', 'CDT'])
    expect(rows[1]).toHaveTextContent('Cuota deuda')
    expect(rows[1]).toHaveTextContent('−$20.000')
    expect(rows[1]).toHaveTextContent('en 5d')
    expect(rows[1]).toHaveTextContent('20ago')
    expect(rows[2]).toHaveTextContent('+$3.800')
  })

  it('ocultar hace POST /api/ops-ocultas, recarga y no abre formulario', async () => {
    const m = mockFetch(rutas({ 'POST /api/ops-ocultas': { clave: 'deuda:1:2026-08-20' } }))
    renderWithProviders(<Dashboard active />)
    const row = (await screen.findByText('Banco')).closest('.prox-op-row') as HTMLElement
    m.set('GET /api/proximas-operaciones', { ...PROXIMAS, items: PROXIMAS.items.filter((i) => i.tipo !== 'deuda') })
    fireEvent.click(within(row).getByTitle('No tomar esta vez'))
    await waitFor(() => expect(within(list()).queryByText('Banco')).not.toBeInTheDocument())
    expect(m.mutations()).toEqual([
      expect.objectContaining({ method: 'POST', url: '/api/ops-ocultas', body: { clave: 'deuda:1:2026-08-20' } }),
    ])
    expect(m.mutations()[0]?.headers['X-Moni-Request']).toBe('1')
    expect(spies.pay).not.toHaveBeenCalled()
  })

  it('si ocultar falla muestra el error y no oculta nada', async () => {
    const m = mockFetch(rutas({ 'POST /api/ops-ocultas': failure(422, 'clave inválida') }))
    renderWithProviders(<Dashboard active />)
    const row = (await screen.findByText('Banco')).closest('.prox-op-row') as HTMLElement
    fireEvent.click(within(row).getByTitle('No tomar esta vez'))
    await waitFor(() => expect(m.callsTo('GET', '/api/bootstrap')).toHaveLength(1))
    expect(within(list()).getByText('Banco')).toBeInTheDocument()
  })

  it('materialize abre el formulario correcto y no oculta nada', async () => {
    const m = mockFetch(rutas())
    renderWithProviders(<Dashboard active />)
    await screen.findByText('Banco')
    const click = (label: string) => fireEvent.click(within(within(list()).getByText(label).closest('.prox-op-row') as HTMLElement).getByTitle('Registrar'))
    click('Banco')
    expect(spies.pay).toHaveBeenCalledWith(expect.anything(), 1)
    click('CDT')
    expect(spies.yield).toHaveBeenCalledWith(expect.anything(), 2)
    click('Gym')
    expect(spies.mat).toHaveBeenCalledWith(expect.anything(), 3, '2026-08-17')
    expect(m.mutations()).toEqual([])
    expect(within(list()).getByText('Banco')).toBeInTheDocument()
  })

  it('muestra el mensaje vacío', async () => {
    mockFetch(rutas({ 'GET /api/proximas-operaciones': { ...PROXIMAS, items: [], frase: null } }))
    renderWithProviders(<Dashboard active />)
    expect(await screen.findByText('Sin operaciones en los próximos 45 días.')).toBeInTheDocument()
  })

  it('las acciones son botones alcanzables por teclado', async () => {
    mockFetch(rutas())
    renderWithProviders(<Dashboard active />)
    await screen.findByText('Banco')
    const buttons = within(list()).getAllByRole('button')
    expect(buttons).toHaveLength(6)
    buttons.forEach((b) => expect(b.tagName).toBe('BUTTON'))
    expect(buttons[0]).toHaveAccessibleName('No tomar esta vez: Gym')
    expect(buttons[1]).toHaveAccessibleName('Registrar: Gym')
  })

  it('resume por pagar y vencidos con los totales del backend', async () => {
    mockFetch(rutas())
    const { unmount } = renderWithProviders(<Dashboard active />)
    await waitFor(() => expect(stat('dash-proximas')).toHaveTextContent('$70.000 por pagar en los próximos 45 días.'))
    unmount()
    mockFetch(rutas({ 'GET /api/proximas-operaciones': { ...PROXIMAS, frase: frase('Tenés ', ['1 pago vencido', 'negativo'], ' y ', ['$20.000', 'fuerte'], ' por pagar en 45 días.') } }))
    renderWithProviders(<Dashboard active />)
    await waitFor(() => expect(stat('dash-proximas')).toHaveTextContent('Tenés 1 pago vencido y $20.000 por pagar en 45 días.'))
  })

  it('muestra items y despliega extra con el texto del backend', async () => {
    const op = (i: number) => ({ ...(PROXIMAS.items[0] as OperacionProxima), clave: `recurrente:${i}:2026-08-17`, fuente_id: i, etiqueta: `R${i}` })
    const items = [1, 2, 3, 4, 5].map(op)
    mockFetch(rutas({ 'GET /api/proximas-operaciones': { ...PROXIMAS, items, extra: [op(6), op(7)], texto_ver_todas: 'Ver las 7', texto_ver_menos: 'Ver menos' } }))
    renderWithProviders(<Dashboard active />)
    await screen.findByText('Ver las 7')
    expect(list().querySelectorAll('.prox-op-row')).toHaveLength(5)
    fireEvent.click(screen.getByText('Ver las 7'))
    expect(list().querySelectorAll('.prox-op-row')).toHaveLength(7)
    fireEvent.click(screen.getByText('Ver menos'))
    expect(list().querySelectorAll('.prox-op-row')).toHaveLength(5)
  })

  it('una cuota en cero no lleva signo', async () => {
    mockFetch(rutas({ 'GET /api/proximas-operaciones': { ...PROXIMAS, items: [{ ...(PROXIMAS.items[1] as OperacionProxima), etiqueta: 'Visa', monto: 0, sin_monto: true }] } }))
    renderWithProviders(<Dashboard active />)
    const row = (await screen.findByText('Visa')).closest('.prox-op-row') as HTMLElement
    expect(row.textContent).not.toMatch(/[+−]\$0/)
  })
})
