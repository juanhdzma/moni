import { describe, expect, it } from 'vitest'
import { renderWithProviders } from '../test/render'
import { Activos } from './activos'
import { Deudas } from './deudas'
import { Inversiones } from './inversiones'
import { Recurrentes } from './recurrentes'

const casos = [
  ['deudas-total', Deudas],
  ['inv-total', Inversiones],
  ['activos-total', Activos],
  ['rec-total', Recurrentes],
] as const

describe('placeholders antes de la primera carga', () => {
  it.each(casos)('%s muestra skeleton hasta que carga', (id, Tab) => {
    const { unmount } = renderWithProviders(<Tab active />, { loaded: false })
    expect(document.getElementById(id)?.querySelector('.skeleton')).toBeInTheDocument()
    unmount()
    renderWithProviders(<Tab active />)
    expect(document.getElementById(id)?.querySelector('.skeleton')).toBeNull()
  })
})
