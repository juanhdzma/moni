import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { EMPTY_ALL, failure, json } from '../test/mockFetch'
import { tx } from '../test/factories'
import { DataProvider, ESTADO_VACIO, useData } from './DataProvider'

function Harness() {
  const { estado, reload, banner } = useData()
  return (
    <>
      <output data-testid="n">{estado.transacciones.length}</output>
      <output data-testid="banner">{banner}</output>
      <button onClick={() => void reload()}>recargar</button>
    </>
  )
}

function pendientes() {
  const resolvers: ((r: Response) => void)[] = []
  vi.stubGlobal(
    'fetch',
    vi.fn(() => new Promise<Response>((res) => resolvers.push(res))),
  )
  return resolvers
}

async function entregar(fn: () => void) {
  await act(async () => {
    fn()
    await Promise.resolve()
  })
}

const conTx = (n: number) => json({ ...EMPTY_ALL, transacciones: Array.from({ length: n }, (_, i) => tx('gasto', 'c', 1, { id: i + 1 })) })

afterEach(() => vi.unstubAllGlobals())

describe('DataProvider recargas superpuestas', () => {
  const montar = () =>
    render(
      <DataProvider initialEstado={ESTADO_VACIO}>
        <Harness />
      </DataProvider>,
    )

  it('una respuesta vieja que llega tarde no pisa a la nueva', async () => {
    const user = userEvent.setup()
    const res = pendientes()
    montar()
    await user.click(screen.getByText('recargar'))
    await user.click(screen.getByText('recargar'))
    await entregar(() => res[1]?.(conTx(2)))
    expect(screen.getByTestId('n')).toHaveTextContent('2')
    await entregar(() => res[0]?.(conTx(1)))
    expect(screen.getByTestId('n')).toHaveTextContent('2')
  })

  it('un error viejo que llega tarde no muestra banner sobre una carga nueva exitosa', async () => {
    const user = userEvent.setup()
    const res = pendientes()
    montar()
    await user.click(screen.getByText('recargar'))
    await user.click(screen.getByText('recargar'))
    await entregar(() => res[1]?.(conTx(1)))
    await entregar(() => res[0]?.(failure(500, 'viejo')))
    expect(screen.getByTestId('banner')).toBeEmptyDOMElement()
    expect(screen.getByTestId('n')).toHaveTextContent('1')
  })
})
