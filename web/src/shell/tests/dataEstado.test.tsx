import { render, renderHook, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '@/lib/api'
import { failure, mockFetch } from '@/test/mockFetch'
import { DataProvider, ESTADO_VACIO, useData } from '@/shell/providers/DataProvider'

function Panel() {
  const { loaded, banner, estado, reload, showBanner, cerrarBanner, reportRenderFailure, conBanner } = useData()
  return (
    <>
      <output data-testid="loaded">{String(loaded)}</output>
      <output data-testid="banner">{banner}</output>
      <output data-testid="hoy">{estado.hoy}</output>
      <button onClick={() => void reload(['activos'])}>recargar</button>
      <button onClick={() => showBanner('aviso')}>aviso</button>
      <button onClick={cerrarBanner}>cerrar</button>
      <button onClick={() => reportRenderFailure('Deudas')}>falla-deudas</button>
      <button onClick={() => reportRenderFailure('Activos')}>falla-activos</button>
      <button onClick={() => void conBanner(() => Promise.reject(new ApiError('conflicto', 409)), { recargar: true })}>conflicto</button>
      <button onClick={() => void conBanner(() => Promise.reject(new ApiError('boom', 500)), { recargar: true })}>servidor</button>
      <button onClick={() => void conBanner(() => Promise.reject(new Error('red')))}>red-sin-recargar</button>
      <button onClick={() => void conBanner(() => Promise.reject(new Error('x'))).then((ok) => document.body.setAttribute('data-ok', String(ok)))}>red-con-resultado</button>
      <button onClick={() => void conBanner(() => Promise.resolve()).then((ok) => document.body.setAttribute('data-ok', String(ok)))}>bien</button>
    </>
  )
}

const montar = (props: { initialEstado?: typeof ESTADO_VACIO; initialLoaded?: boolean } = {}) =>
  render(
    <DataProvider {...props}>
      <Panel />
    </DataProvider>,
  )

afterEach(() => {
  vi.unstubAllGlobals()
  document.body.removeAttribute('data-ok')
})

describe('DataProvider arranque', () => {
  it('ESTADO_VACIO no tiene alertas ni desactualizado y usa $ por defecto', () => {
    expect(ESTADO_VACIO).toEqual({
      hoy: '',
      ahora: '',
      ajustes: { moneda_simbolo: '$' },
      categorias: { ingreso: [], gasto: [], transfer: [] },
      alertas: { activos: false, inversiones: false },
      desactualizado: { texto: '' },
    })
  })

  it('loaded empieza en false y pasa a true tras el primer fetch', async () => {
    mockFetch({ 'GET /api/bootstrap': { ...ESTADO_VACIO, hoy: '2026-11-22' } })
    montar()
    expect(screen.getByTestId('loaded')).toHaveTextContent('false')
    await waitFor(() => expect(screen.getByTestId('loaded')).toHaveTextContent('true'))
    expect(screen.getByTestId('hoy')).toHaveTextContent('2026-11-22')
  })

  it('si el primer fetch falla loaded también pasa a true y se muestra el error', async () => {
    mockFetch({ 'GET /api/bootstrap': failure(500, 'caído') })
    montar()
    await waitFor(() => expect(screen.getByTestId('loaded')).toHaveTextContent('true'))
    expect(screen.getByTestId('banner')).toHaveTextContent('caído')
    expect(screen.getByTestId('hoy')).toBeEmptyDOMElement()
  })

  it('con initialEstado no pide el bootstrap y arranca cargado', () => {
    const f = mockFetch()
    montar({ initialEstado: ESTADO_VACIO })
    expect(screen.getByTestId('loaded')).toHaveTextContent('true')
    expect(f.callsTo('GET', '/api/bootstrap')).toHaveLength(0)
  })

  it('initialLoaded=false con initialEstado respeta el false', () => {
    mockFetch()
    montar({ initialEstado: ESTADO_VACIO, initialLoaded: false })
    expect(screen.getByTestId('loaded')).toHaveTextContent('false')
  })
})

describe('DataProvider banner', () => {
  it('un reload exitoso del bootstrap limpia el banner anterior', async () => {
    const user = userEvent.setup()
    mockFetch()
    montar({ initialEstado: ESTADO_VACIO })
    await user.click(screen.getByText('aviso'))
    expect(screen.getByTestId('banner')).toHaveTextContent('aviso')
    await user.click(screen.getByText('recargar'))
    await waitFor(() => expect(screen.getByTestId('banner')).toBeEmptyDOMElement())
  })

  it('un reload fallido muestra el error en el banner', async () => {
    const user = userEvent.setup()
    mockFetch({ 'GET /api/bootstrap': failure(503, 'sin servicio') })
    montar({ initialEstado: ESTADO_VACIO })
    await user.click(screen.getByText('recargar'))
    await waitFor(() => expect(screen.getByTestId('banner')).toHaveTextContent('sin servicio'))
  })

  it('cerrarBanner lo limpia', async () => {
    const user = userEvent.setup()
    mockFetch()
    montar({ initialEstado: ESTADO_VACIO })
    await user.click(screen.getByText('aviso'))
    await user.click(screen.getByText('cerrar'))
    expect(screen.getByTestId('banner')).toBeEmptyDOMElement()
  })

  it('los fallos de render se acumulan en el banner y un reload exitoso reinicia la lista', async () => {
    const user = userEvent.setup()
    mockFetch()
    montar({ initialEstado: ESTADO_VACIO })
    await user.click(screen.getByText('falla-deudas'))
    expect(screen.getByTestId('banner')).toHaveTextContent('No se pudo dibujar: Deudas. Mirá la consola.')
    await user.click(screen.getByText('falla-activos'))
    expect(screen.getByTestId('banner')).toHaveTextContent('No se pudo dibujar: Deudas, Activos. Mirá la consola.')
    await user.click(screen.getByText('recargar'))
    await waitFor(() => expect(screen.getByTestId('banner')).toBeEmptyDOMElement())
    await user.click(screen.getByText('falla-activos'))
    expect(screen.getByTestId('banner')).toHaveTextContent('No se pudo dibujar: Activos. Mirá la consola.')
  })
})

describe('DataProvider conBanner', () => {
  it('devuelve true en éxito y no toca el banner', async () => {
    const user = userEvent.setup()
    mockFetch()
    montar({ initialEstado: ESTADO_VACIO })
    await user.click(screen.getByText('bien'))
    await waitFor(() => expect(document.body.getAttribute('data-ok')).toBe('true'))
    expect(screen.getByTestId('banner')).toBeEmptyDOMElement()
  })

  it('devuelve false cuando la acción falla', async () => {
    const user = userEvent.setup()
    mockFetch()
    montar({ initialEstado: ESTADO_VACIO })
    document.body.setAttribute('data-ok', 'sin-resultado')
    await user.click(screen.getByText('red-con-resultado'))
    await waitFor(() => expect(document.body.getAttribute('data-ok')).toBe('false'))
  })

  it('un error 4xx de la API deja el banner y no recarga; uno 5xx recarga y deja el banner', async () => {
    const user = userEvent.setup()
    const f = mockFetch()
    montar({ initialEstado: ESTADO_VACIO })
    await user.click(screen.getByText('conflicto'))
    await waitFor(() => expect(screen.getByTestId('banner')).toHaveTextContent('conflicto'))
    expect(f.callsTo('GET', '/api/bootstrap')).toHaveLength(0)
    await user.click(screen.getByText('servidor'))
    await waitFor(() => expect(screen.getByTestId('banner')).toHaveTextContent('boom'))
    await waitFor(() => expect(f.callsTo('GET', '/api/bootstrap')).toHaveLength(1))
  })

  it('sin la opción recargar un error de red solo deja el banner', async () => {
    const user = userEvent.setup()
    const f = mockFetch()
    montar({ initialEstado: ESTADO_VACIO })
    await user.click(screen.getByText('red-sin-recargar'))
    await waitFor(() => expect(screen.getByTestId('banner')).toHaveTextContent('red'))
    expect(f.callsTo('GET', '/api/bootstrap')).toHaveLength(0)
  })
})

describe('useData', () => {
  it('fuera de DataProvider avisa con un error claro', () => {
    const consola = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    expect(() => renderHook(() => useData())).toThrow('useData fuera de DataProvider')
    consola.mockRestore()
  })
})
