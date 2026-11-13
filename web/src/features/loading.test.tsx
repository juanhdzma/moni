import { screen } from '@testing-library/react'
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

const contenedores = [
  ['deudas', Deudas, ['deudas-grid-credito', 'deudas-grid-tarjeta', 'deudas-terminados']],
  ['inversiones', Inversiones, ['inv-grid-fija', 'inv-grid-variable']],
  ['activos', Activos, ['activos-grid']],
] as const

describe('contenedores vacíos antes de la primera carga', () => {
  it.each(contenedores)('%s no muestra vacíos hasta que carga', (_nombre, Tab, ids) => {
    const { unmount } = renderWithProviders(<Tab active />, { loaded: false })
    for (const id of ids) expect(document.getElementById(id)).toBeEmptyDOMElement()
    unmount()
    renderWithProviders(<Tab active />, { loaded: true })
    const algunoConContenido = ids.some((id) => document.getElementById(id)?.childElementCount)
    expect(algunoConContenido).toBe(true)
  })

  it('recurrentes conserva los títulos de sección y no muestra vacíos hasta que carga', () => {
    const { unmount } = renderWithProviders(<Recurrentes active />, { loaded: false })
    expect(screen.getByText('Ingresos recurrentes')).toBeInTheDocument()
    expect(screen.getByText('Gastos fijos')).toBeInTheDocument()
    expect(screen.queryByText('Sin ingresos recurrentes.')).toBeNull()
    expect(screen.queryByText('Sin gastos recurrentes.')).toBeNull()
    unmount()
    renderWithProviders(<Recurrentes active />, { loaded: true })
    expect(screen.getByText('Sin ingresos recurrentes.')).toBeInTheDocument()
  })
})
