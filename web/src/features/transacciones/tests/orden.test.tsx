import { screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { META } from '@/test/meta'
import { mockFetch, ui } from './fixtures'

afterEach(() => vi.unstubAllGlobals())

describe('orden inicial del listado', () => {
  it('sale de meta.defaults.orden_tx y nunca de un literal del front', async () => {
    const f = mockFetch({ 'GET /api/meta': { ...META, defaults: { ...META.defaults, orden_tx: { col: 'monto', dir: 1 } } } })
    ui()
    await waitFor(() => expect(f.callsTo('GET', '/api/tx?col=monto&dir=1&tipo=&mes=&cat=')).toHaveLength(1))
    expect(f.calls.filter((c) => c.method === 'GET' && c.url.startsWith('/api/tx?'))).toHaveLength(1)
    expect(await screen.findByRole('columnheader', { name: /Monto/ })).toHaveAttribute('aria-sort', 'ascending')
  })
})
