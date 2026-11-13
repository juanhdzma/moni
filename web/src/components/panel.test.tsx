import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { Desactualizado, topSegmentos } from './panel'

const seg = (key: string, valor: number) => ({ key, label: key, valor })

describe('topSegmentos', () => {
  it('sorts, drops non-positive and keeps five as they are', () => {
    expect(topSegmentos([seg('a', 1), seg('b', 3), seg('z', 0)]).map((s) => s.key)).toEqual(['b', 'a'])
    expect(topSegmentos(['a', 'b', 'c', 'd', 'e'].map((k, i) => seg(k, i + 1)))).toHaveLength(5)
  })

  it('groups the tail into Otros', () => {
    const r = topSegmentos(['a', 'b', 'c', 'd', 'e', 'f'].map((k, i) => seg(k, i + 1)))
    expect(r.map((s) => s.label)).toEqual(['f', 'e', 'd', 'c', 'Otros'])
    expect(r[4]?.valor).toBe(3)
  })
})

describe('Desactualizado', () => {
  it('shows the explanation on tap and hides it on blur', async () => {
    render(<Desactualizado />)
    const tip = screen.getByRole('tooltip', { hidden: true })
    expect(tip).toHaveClass('sr-only')
    await userEvent.click(screen.getByRole('button'))
    expect(tip).not.toHaveClass('sr-only')
    await userEvent.tab()
    expect(tip).toHaveClass('sr-only')
  })
})
