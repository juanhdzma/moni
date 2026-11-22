import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { estado } from '../../../test/factories'
import { renderWithProviders } from '../../../test/render'
import { Deudas } from '../index'
import { conResumen, credito, dialog, full, resumenCompleto, saldado, tarjeta, installFakeDate } from './fixtures'

installFakeDate()

describe('Deudas render', () => {
  it('pide el resumen al backend y muestra totales, créditos, tarjetas y terminados', async () => {
    const f = conResumen()
    renderWithProviders(<Deudas active />, { estado: full() })
    const cred = document.getElementById('deudas-grid-credito') as HTMLElement
    expect(await within(cred).findByText('Crédito carro')).toBeInTheDocument()
    expect(f.callsTo('GET', '/api/deudas/resumen')).toHaveLength(1)
    const total = document.getElementById('deudas-total') as HTMLElement
    expect(within(total).getByText('Lo que debés')).toBeInTheDocument()
    expect(total).toHaveTextContent('$7.000.000')
    expect(total).toHaveTextContent('$500.000/mes en cuotas')
    expect(total).toHaveTextContent('$962.000 pagados en intereses')
    expect(total.textContent).not.toMatch(/~/)
    expect(within(total).getByRole('list', { name: 'De qué está hecho' })).toHaveTextContent('Crédito carro')
    expect(within(cred).getByText('~12m')).toBeInTheDocument()
    expect(within(cred).getByText('40,0% pagado')).toBeInTheDocument()
    expect(within(cred).getByText('$4.000.000')).toBeInTheDocument()
    expect(within(cred).getByTitle('Suma de los pagos registrados en Moni')).toBeInTheDocument()
    expect(within(cred).getByText('Próxima cuota:')).toBeInTheDocument()
    const tar = document.getElementById('deudas-grid-tarjeta') as HTMLElement
    expect(within(tar).getByText('Visa Oro')).toBeInTheDocument()
    expect(within(tar).getByText(/Disponible:/)).toHaveTextContent('$4.000.000')
    expect(within(tar).getByText(/Intereses pagados:/)).toBeInTheDocument()
    expect(within(tar).getByAltText('Visa')).toHaveAttribute('src', 'assets/franquicias/visa.svg')
    const term = document.getElementById('deudas-terminados') as HTMLElement
    expect(within(term).getByText('Préstamos terminados')).toBeInTheDocument()
    expect(within(term).getByText('Saldado')).toBeInTheDocument()
    expect(within(term).getByText(/en intereses/)).toBeInTheDocument()
  })

  it('el color de las barras sale del nivel que manda el backend', async () => {
    conResumen({
      ...resumenCompleto,
      creditos: [{ ...credito, nivel_progreso: 'alto' }],
      tarjetas: [{ ...tarjeta, uso_pct: 95, nivel_uso: 'alto' }],
    })
    renderWithProviders(<Deudas active />, { estado: full() })
    await within(document.getElementById('deudas-grid-credito') as HTMLElement).findByText('Crédito carro')
    const barraCred = document.querySelector('#deudas-grid-credito [aria-hidden="true"] > span')
    const barraTar = document.querySelector('#deudas-grid-tarjeta [aria-hidden="true"] > span')
    expect(barraCred).toHaveClass('bg-inversiones')
    expect(barraTar).toHaveClass('bg-deudas')
  })

  it('antepone ~ cuando el backend marca los intereses como aproximados', async () => {
    conResumen({
      ...resumenCompleto,
      total_intereses: 420000,
      intereses_aproximado: true,
      dato: { ...resumenCompleto.dato, intereses: '~$420.000' },
      creditos: [
        {
          ...credito,
          total_intereses: 0,
          intereses_pagados: { valor: 420000, exacto: false },
          frases: { ...credito.frases!, intereses_texto: '~$420.000', intereses_ayuda: 'Estimado por amortización — todavía no hay pagos registrados' },
        },
      ],
      tarjetas: [],
      terminadas: [],
    })
    renderWithProviders(<Deudas active />, { estado: full() })
    const cred = document.getElementById('deudas-grid-credito') as HTMLElement
    const intereses = await within(cred).findByTitle(/Estimado por amortización/)
    expect(intereses).toHaveTextContent('~$420.000')
    expect(document.getElementById('deudas-total')).toHaveTextContent('~$420.000 pagados en intereses')
  })

  it('empty states', async () => {
    const f = conResumen({ ...resumenCompleto, total: 0, total_cuotas: 0, total_intereses: 0, dato: { ...resumenCompleto.dato, intereses: null }, segmentos: [], creditos: [], tarjetas: [], terminadas: [] })
    renderWithProviders(<Deudas active />)
    expect(await screen.findByText('Sin créditos')).toBeInTheDocument()
    expect(f.callsTo('GET', '/api/deudas/resumen')).toHaveLength(1)
    expect(screen.getByText('Agregá uno con el botón + de arriba.')).toBeInTheDocument()
    expect(screen.getByText('Sin tarjetas')).toBeInTheDocument()
    expect(document.getElementById('deudas-terminados')?.children).toHaveLength(0)
    expect(document.getElementById('deudas-total')).not.toHaveTextContent('pagados en intereses')
  })

  it('sin créditos activos pero con saldados', async () => {
    conResumen({ ...resumenCompleto, creditos: [], tarjetas: [], total: 0, segmentos: [] })
    renderWithProviders(<Deudas active />, { estado: estado({ deudas: [saldado] }) })
    expect(await screen.findByText('Sin créditos activos')).toBeInTheDocument()
    expect(screen.getByText('¡Todos los créditos están saldados!')).toBeInTheDocument()
  })

  it('tarjeta sin cupo', async () => {
    conResumen({
      ...resumenCompleto,
      tarjetas: [{ ...tarjeta, saldo_actual: 0, cupo: 0, total_intereses: 0, disponible: null, uso_pct: 0, intereses_pagados: null, frases: { ...tarjeta.frases!, detalle: 'Sin cupo definido' } }],
    })
    renderWithProviders(<Deudas active />, { estado: full() })
    expect(await screen.findByText('Sin cupo definido')).toBeInTheDocument()
    expect(screen.queryByText(/Disponible:/)).toBeNull()
  })

  it('los botones de las cards son alcanzables por teclado', async () => {
    const user = userEvent.setup()
    conResumen()
    renderWithProviders(<Deudas active />, { estado: full() })
    await within(document.getElementById('deudas-grid-credito') as HTMLElement).findByText('Crédito carro')
    const btn = screen.getAllByRole('button', { name: 'Editar' })[0] as HTMLElement
    btn.focus()
    expect(btn).toHaveFocus()
    await user.keyboard('{Enter}')
    expect(dialog()).toHaveTextContent('Editar deuda')
  })
})
