import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { activo, estado, inversion } from '../test/factories'
import { failure, mockFetch } from '../test/mockFetch'
import { renderWithProviders } from '../test/render'
import { CategoriasProvider } from './CategoriasProvider'
import { DataProvider } from './DataProvider'
import { ModalProvider } from './ModalProvider'
import { Shell } from './Shell'

beforeEach(() => vi.useFakeTimers({ toFake: ['Date'], now: new Date(2026, 5, 15, 10, 30) }))
afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

const nav = () => document.getElementById('header-nav') as HTMLElement

describe('Shell', () => {
  it('nav de escritorio y drawer con sus etiquetas', () => {
    renderWithProviders(<Shell />)
    expect(within(nav()).getAllByRole('button').map((b) => b.textContent)).toEqual([
      'Dashboard', 'Transacciones', 'Deudas', 'Inversiones', 'Activos', 'Recurrentes', 'Ajustes',
    ])
    expect(within(document.getElementById('nav-drawer') as HTMLElement).getByText('Movimientos')).toBeInTheDocument()
  })

  it('cambiar de tab mueve active en nav, drawer y contenido', async () => {
    const user = userEvent.setup()
    renderWithProviders(<Shell />)
    expect(document.getElementById('tab-dashboard')).toHaveClass('active')
    await user.click(within(nav()).getByText('Deudas'))
    expect(document.getElementById('tab-deudas')).toHaveClass('active')
    expect(document.getElementById('tab-dashboard')).not.toHaveClass('active')
    expect(within(nav()).getByText('Deudas')).toHaveClass('active')
    expect(document.querySelector('.nav-drawer-item.active')).toHaveTextContent('Deudas')
  })

  it('FAB visible solo en tabs con acción', async () => {
    const user = userEvent.setup()
    renderWithProviders(<Shell />)
    const fab = screen.getByLabelText('Agregar')
    expect(fab).toHaveStyle({ display: 'none' })
    for (const t of ['Transacciones', 'Deudas', 'Inversiones', 'Activos', 'Recurrentes']) {
      await user.click(within(nav()).getByText(t))
      expect(fab).not.toHaveStyle({ display: 'none' })
    }
    await user.click(within(nav()).getByText('Ajustes'))
    expect(fab).toHaveStyle({ display: 'none' })
    await user.click(within(nav()).getByText('Dashboard'))
    expect(fab).toHaveStyle({ display: 'none' })
  })

  it('FAB abre el formulario de la tab activa', async () => {
    const user = userEvent.setup()
    renderWithProviders(<Shell />)
    await user.click(within(nav()).getByText('Activos'))
    await user.click(screen.getByLabelText('Agregar'))
    expect(screen.getByText('Nuevo activo', { selector: '#modal-title' })).toBeInTheDocument()
  })

  it('drawer: abre con la hamburguesa, cierra con tab, backdrop y Escape', async () => {
    const user = userEvent.setup()
    renderWithProviders(<Shell />)
    const overlay = document.getElementById('nav-drawer-overlay') as HTMLElement
    await user.click(screen.getByLabelText('Menú'))
    expect(overlay).toHaveClass('open')
    await user.click(within(overlay).getByText('Activos'))
    expect(overlay).not.toHaveClass('open')
    expect(document.getElementById('tab-activos')).toHaveClass('active')
    await user.click(screen.getByLabelText('Menú'))
    await user.click(overlay)
    expect(overlay).not.toHaveClass('open')
    await user.click(screen.getByLabelText('Menú'))
    await user.keyboard('{Escape}')
    expect(overlay).not.toHaveClass('open')
  })

  it('has-warning en activos e inversiones variables sin actualizar', () => {
    renderWithProviders(<Shell />, {
      estado: estado({
        activos: [activo({ valor_actualizado_en: '2020-01-01' })],
        inversiones: [inversion({ tipo: 'fija', valor_actualizado_en: '2020-01-01' })],
      }),
    })
    expect(within(nav()).getByText('Activos')).toHaveClass('has-warning')
    expect(within(nav()).getByText('Inversiones')).not.toHaveClass('has-warning')
  })

  it('carga inicial: banner con el error del backend', async () => {
    mockFetch({ 'GET /api/all': failure(500, 'caído') })
    render(
      <DataProvider>
        <CategoriasProvider>
          <ModalProvider>
            <Shell />
          </ModalProvider>
        </CategoriasProvider>
      </DataProvider>,
    )
    await waitFor(() => expect(document.getElementById('err-banner')).toHaveTextContent('⚠ caído'))
    expect(document.getElementById('err-banner')).toHaveStyle({ display: 'block' })
  })
})
