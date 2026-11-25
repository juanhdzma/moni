import { act, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { usePreview } from '@/shell/hooks/usePreview'

function Harness({ clave, cargar }: { clave: string | null; cargar: () => Promise<string> }) {
  return <output data-testid="p">{usePreview(clave, cargar) ?? '-'}</output>
}

function pendientes() {
  const cola: { resolver: (v: string) => void; rechazar: (e: Error) => void }[] = []
  return { cola, cargar: () => new Promise<string>((resolver, rechazar) => cola.push({ resolver, rechazar })) }
}

async function entregar(fn: () => void) {
  await act(async () => {
    fn()
    await Promise.resolve()
  })
}

afterEach(() => vi.useRealTimers())

describe('usePreview', () => {
  it('no pide nada con clave null', async () => {
    vi.useFakeTimers()
    const cargar = vi.fn(() => Promise.resolve('x'))
    render(<Harness clave={null} cargar={cargar} />)
    await act(() => vi.advanceTimersByTimeAsync(1000))
    expect(cargar).not.toHaveBeenCalled()
    expect(screen.getByTestId('p')).toHaveTextContent('-')
  })

  it('espera 250 ms antes de pedir y pide una sola vez', async () => {
    vi.useFakeTimers()
    const cargar = vi.fn(() => Promise.resolve('listo'))
    render(<Harness clave="a" cargar={cargar} />)
    await act(() => vi.advanceTimersByTimeAsync(249))
    expect(cargar).not.toHaveBeenCalled()
    await act(() => vi.advanceTimersByTimeAsync(1))
    expect(cargar).toHaveBeenCalledTimes(1)
    expect(screen.getByTestId('p')).toHaveTextContent('listo')
  })

  it('cambiar la clave antes del debounce cancela el pedido anterior', async () => {
    vi.useFakeTimers()
    const cargar = vi.fn(() => Promise.resolve('x'))
    const r = render(<Harness clave="a" cargar={cargar} />)
    await act(() => vi.advanceTimersByTimeAsync(200))
    r.rerender(<Harness clave="b" cargar={cargar} />)
    await act(() => vi.advanceTimersByTimeAsync(249))
    expect(cargar).not.toHaveBeenCalled()
    await act(() => vi.advanceTimersByTimeAsync(1))
    expect(cargar).toHaveBeenCalledTimes(1)
  })

  it('con dos pedidos en vuelo, el viejo que llega tarde no pisa al nuevo', async () => {
    vi.useFakeTimers()
    const { cola, cargar } = pendientes()
    const r = render(<Harness clave="a" cargar={cargar} />)
    await act(() => vi.advanceTimersByTimeAsync(250))
    r.rerender(<Harness clave="b" cargar={cargar} />)
    await act(() => vi.advanceTimersByTimeAsync(250))
    expect(cola).toHaveLength(2)
    await entregar(() => cola[1]?.resolver('de b'))
    expect(screen.getByTestId('p')).toHaveTextContent('de b')
    await entregar(() => cola[0]?.resolver('de a'))
    expect(screen.getByTestId('p')).toHaveTextContent('de b')
  })

  it('al cambiar de clave no muestra el preview de la anterior mientras llega el nuevo', async () => {
    vi.useFakeTimers()
    const { cola, cargar } = pendientes()
    const r = render(<Harness clave="a" cargar={cargar} />)
    await act(() => vi.advanceTimersByTimeAsync(250))
    await entregar(() => cola[0]?.resolver('de a'))
    expect(screen.getByTestId('p')).toHaveTextContent('de a')
    r.rerender(<Harness clave="b" cargar={cargar} />)
    expect(screen.getByTestId('p')).toHaveTextContent('-')
  })

  it('un error del preview se ignora en silencio y no deja datos', async () => {
    vi.useFakeTimers()
    const { cola, cargar } = pendientes()
    render(<Harness clave="a" cargar={cargar} />)
    await act(() => vi.advanceTimersByTimeAsync(250))
    await entregar(() => cola[0]?.rechazar(new Error('mal')))
    expect(screen.getByTestId('p')).toHaveTextContent('-')
  })

  it('un pedido que llega después de desmontar no rompe nada', async () => {
    vi.useFakeTimers()
    const { cola, cargar } = pendientes()
    const r = render(<Harness clave="a" cargar={cargar} />)
    await act(() => vi.advanceTimersByTimeAsync(250))
    r.unmount()
    await expect(entregar(() => cola[0]?.resolver('tarde'))).resolves.toBeUndefined()
  })

  it('con timers reales: usa la última función de carga recibida', async () => {
    vi.useRealTimers()
    const primera = vi.fn(() => Promise.resolve('primera'))
    const segunda = vi.fn(() => Promise.resolve('segunda'))
    const r = render(<Harness clave="a" cargar={primera} />)
    r.rerender(<Harness clave="a" cargar={segunda} />)
    await waitFor(() => expect(screen.getByTestId('p')).toHaveTextContent('segunda'))
    expect(primera).not.toHaveBeenCalled()
  })
})
