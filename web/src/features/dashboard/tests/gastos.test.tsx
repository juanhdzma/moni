import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '../../../test/render'
import { mockFetch } from '../../../test/mockFetch'
import { Dashboard } from '../index'
import { GASTOS, gastoRows, pill, rutas, stat } from './fixtures'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('En qué se va tu plata', () => {
  it('una barra por categoría, con total y frase del backend', async () => {
    mockFetch(rutas())
    renderWithProviders(<Dashboard active />)
    await waitFor(() => expect(gastoRows()).toHaveLength(2))
    expect(pill('gastos-period-pills', '1M')).toHaveAttribute('data-state', 'on')
    expect(within(stat('gastos-period-pills')).getAllByRole('radio').map((b) => b.textContent)).toEqual(['1S', '1M', '3M', '6M', '1A', 'Todo'])
    expect(gastoRows().map((r) => r.textContent)).toEqual(['Comida$200k', 'Mercado$50k'])
    expect(stat('gastos-frase')).toHaveTextContent('Comida se lleva el 80% de lo que gastaste en el último mes.')
    expect(stat('dash-gastos')).toHaveTextContent('Total gastado, con tarjetas$250.000')
  })

  it('cambiar el período pide el endpoint con ese período', async () => {
    const m = mockFetch(rutas())
    renderWithProviders(<Dashboard active />)
    await waitFor(() => expect(gastoRows()).toHaveLength(2))
    fireEvent.click(pill('gastos-period-pills', 'Todo'))
    await waitFor(() => expect(m.callsTo('GET', '/api/dashboard/gastos?periodo=ALL')).toHaveLength(1))
    expect(pill('gastos-period-pills', 'Todo')).toHaveAttribute('data-state', 'on')
  })

  it('tocar una categoría muestra su detalle, el resto y atenúa las otras barras', async () => {
    mockFetch(rutas())
    renderWithProviders(<Dashboard active />)
    await waitFor(() => expect(gastoRows()).toHaveLength(2))
    const boton = within(gastoRows()[0] as HTMLElement).getByRole('button')
    expect(boton).toHaveAttribute('aria-expanded', 'false')
    fireEvent.click(boton)
    expect(boton).toHaveAttribute('aria-expanded', 'true')
    expect(within(gastoRows()[0] as HTMLElement).getByText('Almuerzo')).toBeInTheDocument()
    expect(within(gastoRows()[0] as HTMLElement).getByText('y 2 más en Transacciones')).toBeInTheDocument()
    expect(gastoRows()[1]?.querySelector('.opacity-30')).not.toBeNull()
    fireEvent.click(boton)
    expect(within(gastoRows()[0] as HTMLElement).queryByText('Almuerzo')).toBeNull()
  })

  it('sin gastos muestra el mensaje vacío', async () => {
    mockFetch(rutas({ 'GET /api/dashboard/gastos': { ...GASTOS, total: 0, max: 0, top: null, categorias: [] } }))
    renderWithProviders(<Dashboard active />)
    expect(await screen.findByText('Sin gastos para este período')).toBeInTheDocument()
  })
})
