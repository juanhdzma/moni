import { screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '../test/render'
import { Shell } from './Shell'

vi.mock('../features/deudas', async (orig) => ({
  ...(await orig<typeof import('../features/deudas')>()),
  Deudas: () => {
    throw new Error('rota')
  },
}))
vi.mock('../features/activos', async (orig) => ({
  ...(await orig<typeof import('../features/activos')>()),
  Activos: () => {
    throw new Error('rota')
  },
}))

describe('TabBoundary', () => {
  it('una tab que falla muestra el banner y no tumba al resto', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    renderWithProviders(<Shell />)
    const banner = document.getElementById('err-banner') as HTMLElement
    expect(banner).toHaveTextContent('No se pudo dibujar: deudas, activos. Mirá la consola.')
    expect(banner).toHaveStyle({ display: 'flex' })
    expect(document.getElementById('tab-deudas')).toBeInTheDocument()
    expect(document.getElementById('tab-dashboard')).toHaveClass('active')
    expect(screen.getByText('Lo que viene')).toBeInTheDocument()
    expect(spy).toHaveBeenCalledWith('render deudas falló:', expect.any(Error))
    spy.mockRestore()
  })
})
