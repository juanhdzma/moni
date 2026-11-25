import { renderHook, screen, waitFor } from '@testing-library/react'
import { renderWithProviders } from '@/test/render'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { META } from '@/test/meta'
import { mockFetch } from '@/test/mockFetch'
import { useMeta } from '@/shell/hooks/useMeta'
import { usePreview } from '@/shell/hooks/usePreview'
import { Breakdown, BreakdownRow } from './Breakdown'
import { TipoToggle } from './TipoToggle'
import { Variacion } from './Variacion'

afterEach(() => vi.unstubAllGlobals())

describe('TipoToggle', () => {
  it('marca la opción elegida, usa el tono por valor y notifica el cambio', async () => {
    const onChange = vi.fn()
    renderWithProviders(<TipoToggle value="ingreso" opciones={META.tipos_manuales} idPrefix="t" onChange={onChange} />)
    expect(screen.getByRole('group', { name: 'Tipo' })).toBeInTheDocument()
    expect(document.getElementById('t-ingreso')).toHaveClass('tipo-btn', 'ingreso', 'sel')
    await userEvent.click(screen.getByRole('button', { name: 'Gasto' }))
    expect(onChange).toHaveBeenCalledWith('gasto')
  })
})

describe('Breakdown y Variacion', () => {
  it('visible depende de la prop y la variación lleva signo y porcentaje', () => {
    renderWithProviders(
      <>
        <Breakdown id="b" visible={false}>
          <BreakdownRow id="r" label="Cambio">
            <Variacion valor={-5000} porcentaje={-2} />
          </BreakdownRow>
        </Breakdown>
      </>,
    )
    expect(document.getElementById('b')).not.toHaveClass('visible')
    expect(document.getElementById('r')).toHaveTextContent('−$5.000 (−2,0%)')
  })
})

describe('usePreview', () => {
  it('sin clave no pide; con clave pide una vez tras el debounce', async () => {
    const cargar = vi.fn(() => Promise.resolve({ n: 1 }))
    const { result, rerender } = renderHook(({ clave }) => usePreview(clave, cargar), { initialProps: { clave: null as string | null } })
    expect(cargar).not.toHaveBeenCalled()
    rerender({ clave: 'a' })
    await waitFor(() => expect(result.current).toEqual({ n: 1 }))
    expect(cargar).toHaveBeenCalledTimes(1)
    rerender({ clave: null })
    expect(result.current).toBeNull()
  })
})

describe('useMeta', () => {
  it('pide /api/meta una sola vez para todos los consumidores', async () => {
    const f = mockFetch()
    const a = renderHook(() => useMeta())
    const b = renderHook(() => useMeta())
    await waitFor(() => expect(a.result.current).toEqual(META))
    await waitFor(() => expect(b.result.current).toEqual(META))
    expect(f.callsTo('GET', '/api/meta')).toHaveLength(1)
  })
})
