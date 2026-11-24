import { act, renderHook, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { failure, mockFetch } from '../../test/mockFetch'
import { renderWithProviders } from '../../test/render'
import { useCamposMovimiento } from '@/shell/hooks/useCamposMovimiento'
import { useCerrarYAbrir } from '@/shell/hooks/openers'
import { useStatus } from '@/shell/hooks/useStatus'
import { useData } from '@/shell/providers/DataProvider'
import { useModal } from '@/shell/providers/ModalProvider'

afterEach(() => vi.unstubAllGlobals())

describe('useStatus', () => {
  it('ok, err, info y limpiar cambian cls y msg', () => {
    const { result } = renderHook(() => useStatus())
    expect(result.current).toMatchObject({ cls: '', msg: '' })
    act(() => result.current.ok('listo'))
    expect(result.current).toMatchObject({ cls: 'ok', msg: 'listo' })
    act(() => result.current.err(new Error('falló')))
    expect(result.current).toMatchObject({ cls: 'err', msg: 'falló' })
    act(() => result.current.info('Importando...'))
    expect(result.current).toMatchObject({ cls: '', msg: 'Importando...' })
    act(() => result.current.limpiar())
    expect(result.current.msg).toBe('')
  })
})

describe('useCamposMovimiento', () => {
  it('arma el cuerpo con notas recortadas y registrar por defecto', () => {
    const { result } = renderHook(() => useCamposMovimiento('2026-08-20'))
    act(() => result.current.setNotas('  Cuota #1 '))
    expect(result.current.cuerpo()).toEqual({ fecha: '2026-08-20', notas: 'Cuota #1', registrar_tx: true })
    act(() => result.current.setRegistrar(false))
    expect(result.current.cuerpo().registrar_tx).toBe(false)
  })
})

describe('conBanner', () => {
  function Harness({ ok }: { ok: boolean }) {
    const { conBanner, banner } = useData()
    return (
      <>
        <output data-testid="banner">{banner}</output>
        <button onClick={() => void conBanner(() => (ok ? Promise.resolve() : Promise.reject(new Error('boom'))), { recargar: true })}>go</button>
      </>
    )
  }

  it('un error recarga y deja el mensaje en el banner', async () => {
    const f = mockFetch()
    renderWithProviders(<Harness ok={false} />)
    await userEvent.setup().click(screen.getByText('go'))
    await waitFor(() => expect(screen.getByTestId('banner')).toHaveTextContent('boom'))
    expect(f.callsTo('GET', '/api/bootstrap')).toHaveLength(1)
  })

  it('un éxito no muestra banner', async () => {
    mockFetch({ 'GET /api/bootstrap': failure(500, 'no debería pedirse') })
    renderWithProviders(<Harness ok />)
    await userEvent.setup().click(screen.getByText('go'))
    expect(screen.getByTestId('banner')).toBeEmptyDOMElement()
  })
})

describe('useCerrarYAbrir', () => {
  function Harness({ abrir }: { abrir: () => void }) {
    const { openModal } = useModal()
    const ir = useCerrarYAbrir(abrir)
    return (
      <>
        <button onClick={() => openModal('X', <p>cuerpo</p>)}>abrir</button>
        <button onClick={ir}>ir</button>
      </>
    )
  }

  it('cierra el modal y llama a abrir con el contexto de openers', async () => {
    const abrir = vi.fn()
    renderWithProviders(<Harness abrir={abrir} />)
    const user = userEvent.setup()
    await user.click(screen.getByText('abrir'))
    expect(screen.getByText('cuerpo')).toBeInTheDocument()
    await user.click(screen.getByText('ir'))
    expect(screen.queryByText('cuerpo')).not.toBeInTheDocument()
    expect(abrir).toHaveBeenCalledTimes(1)
    expect(abrir.mock.calls[0]?.[0]).toHaveProperty('openModal')
  })
})
