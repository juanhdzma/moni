import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import { estado } from '@/test/factories'
import { renderWithProviders } from '@/test/render'
import { sumarDias, sumarMeses } from './calendario'
import { DatePicker } from './DatePicker'

describe('DatePicker', () => {
  function H({ type = 'date' as 'date' | 'datetime-local', initial = '2026-08-05' }) {
    const [v, setV] = useState(initial)
    return (
      <>
        <DatePicker value={v} onChange={setV} type={type} />
        <output data-testid="v">{v}</output>
      </>
    )
  }

  it('elegir un día confirma y cierra', async () => {
    const user = userEvent.setup()
    renderWithProviders(<H />)
    await user.click(screen.getByRole('button', { name: /05\/08\/2026/ }))
    expect(document.querySelector('.cdp-panel')).toHaveClass('open')
    expect(document.querySelector('.cdp-month')).toHaveTextContent('Agosto de 2026')
    await user.click(screen.getByRole('button', { name: /, 20 de agosto de 2026$/ }))
    expect(screen.getByTestId('v')).toHaveTextContent('2026-08-20')
    expect(document.querySelector('.cdp-panel')).not.toHaveClass('open')
  })

  it('vacío arranca en estado.hoy, marca el día actual y Hoy lo elige', async () => {
    const user = userEvent.setup()
    renderWithProviders(<H initial="2026-03-05" />, { estado: estado({ hoy: '2026-08-20' }) })
    await user.click(screen.getByRole('button', { name: /05\/03\/2026/ }))
    await user.click(screen.getByText('Hoy'))
    expect(screen.getByTestId('v')).toHaveTextContent('2026-08-20')
    await user.click(screen.getByRole('button', { name: /20\/08\/2026/ }))
    expect(document.querySelector('.cdp-day.today')).toHaveTextContent('20')
  })

  it('sin valor el selector abre en el mes de estado.hoy', async () => {
    const user = userEvent.setup()
    renderWithProviders(<H initial="" />, { estado: estado({ hoy: '2026-08-20' }) })
    await user.click(screen.getByRole('button', { name: 'Seleccionar fecha' }))
    expect(document.querySelector('.cdp-month')).toHaveTextContent('Agosto de 2026')
  })

  it('datetime: Hoy toma fecha y hora reales de estado.ahora', async () => {
    const user = userEvent.setup()
    renderWithProviders(<H type="datetime-local" initial="2026-03-05T07:09" />, { estado: estado({ ahora: '2026-08-20T14:45' }) })
    await user.click(screen.getByRole('button', { name: /05\/03\/2026 07:09/ }))
    await user.click(screen.getByText('Hoy'))
    await user.click(screen.getByText('Aceptar'))
    expect(screen.getByTestId('v')).toHaveTextContent('2026-08-20T14:45')
  })

  it('con estado.hoy vacío no abre un calendario con fecha inválida', async () => {
    const user = userEvent.setup()
    renderWithProviders(<H initial="" />, { estado: estado({ hoy: '', ahora: '' }) })
    await user.click(screen.getByRole('button', { name: 'Seleccionar fecha' }))
    expect(document.querySelector('.cdp-panel')).not.toHaveClass('open')
    expect(screen.getByTestId('v')).toHaveTextContent('')
  })

  it('navegar de mes y Escape cancela sin confirmar', async () => {
    const user = userEvent.setup()
    renderWithProviders(<H />)
    await user.click(screen.getByRole('button', { name: /05\/08\/2026/ }))
    await user.click(screen.getByLabelText('Mes siguiente'))
    expect(document.querySelector('.cdp-month')).toHaveTextContent('Septiembre de 2026')
    await user.keyboard('{Escape}')
    expect(document.querySelector('.cdp-panel')).not.toHaveClass('open')
    expect(screen.getByTestId('v')).toHaveTextContent('2026-08-05')
  })

  it('datetime: hora se ajusta con límites y Aceptar confirma', async () => {
    const user = userEvent.setup()
    renderWithProviders(<H type="datetime-local" initial="2026-08-05T07:09" />)
    await user.click(screen.getByRole('button', { name: /05\/08\/2026 07:09/ }))
    await user.click(screen.getByRole('button', { name: /, 12 de agosto de 2026$/ }))
    const hh = screen.getByLabelText('Hora')
    await user.clear(hh)
    await user.type(hh, '99')
    await user.click(screen.getByText('Aceptar'))
    expect(screen.getByTestId('v')).toHaveTextContent('2026-08-12T23:09')
  })

  it('click afuera conserva lo elegido en datetime', async () => {
    const user = userEvent.setup()
    renderWithProviders(<H type="datetime-local" initial="2026-08-05T07:09" />)
    await user.click(screen.getByRole('button', { name: /05\/08\/2026 07:09/ }))
    await user.click(screen.getByRole('button', { name: /, 12 de agosto de 2026$/ }))
    await user.click(document.body)
    expect(screen.getByTestId('v')).toHaveTextContent('2026-08-12T07:09')
  })

  it('ARIA: el panel es un dialog, el día elegido va pressed y hoy lleva aria-current', async () => {
    const user = userEvent.setup()
    renderWithProviders(<H />, { estado: estado({ hoy: '2026-08-20' }) })
    const trigger = screen.getByRole('button', { name: /05\/08\/2026/ })
    expect(trigger).toHaveAttribute('aria-haspopup', 'dialog')
    await user.click(trigger)
    const panel = screen.getByRole('dialog', { name: 'Elegir fecha' })
    expect(trigger).toHaveAttribute('aria-controls', panel.id)
    expect(screen.getByRole('button', { name: /, 5 de agosto de 2026$/ })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: /, 6 de agosto de 2026$/ })).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByRole('button', { name: /, 20 de agosto de 2026$/ })).toHaveAttribute('aria-current', 'date')
  })

  it('al abrir mueve el foco al día elegido y las flechas lo recorren entre meses', async () => {
    const user = userEvent.setup()
    renderWithProviders(<H initial="2026-08-31" />)
    await user.click(screen.getByRole('button', { name: /31\/08\/2026/ }))
    expect(screen.getByRole('button', { name: /, 31 de agosto de 2026$/ })).toHaveFocus()
    await user.keyboard('{ArrowRight}')
    expect(screen.getByRole('button', { name: /, 1 de septiembre de 2026$/ })).toHaveFocus()
    expect(document.querySelector('.cdp-month')).toHaveTextContent('Septiembre de 2026')
    await user.keyboard('{ArrowDown}')
    expect(screen.getByRole('button', { name: /, 8 de septiembre de 2026$/ })).toHaveFocus()
    await user.keyboard('{PageUp}')
    expect(screen.getByRole('button', { name: /, 8 de agosto de 2026$/ })).toHaveFocus()
    await user.keyboard('{Home}')
    expect(screen.getByRole('button', { name: /, 3 de agosto de 2026$/ })).toHaveFocus()
    await user.keyboard('{End}')
    expect(screen.getByRole('button', { name: /, 9 de agosto de 2026$/ })).toHaveFocus()
    await user.keyboard('{Enter}')
    expect(screen.getByTestId('v')).toHaveTextContent('2026-08-09')
  })

  it('solo el día con foco entra en el orden de Tab y Escape devuelve el foco al trigger', async () => {
    const user = userEvent.setup()
    renderWithProviders(<H />)
    const trigger = screen.getByRole('button', { name: /05\/08\/2026/ })
    await user.click(trigger)
    const dias = document.querySelectorAll<HTMLElement>('.cdp-day')
    expect([...dias].filter((d) => d.tabIndex === 0)).toHaveLength(1)
    await user.keyboard('{Escape}')
    expect(trigger).toHaveFocus()
  })
})

describe('calendario', () => {
  it('sumarMeses recorta el día al largo del mes y sumarDias cruza de año', () => {
    expect(sumarMeses({ y: 2026, m: 0, d: 31 }, 1)).toEqual({ y: 2026, m: 1, d: 28 })
    expect(sumarMeses({ y: 2026, m: 0, d: 15 }, -1)).toEqual({ y: 2025, m: 11, d: 15 })
    expect(sumarDias({ y: 2026, m: 11, d: 31 }, 1)).toEqual({ y: 2027, m: 0, d: 1 })
  })
})
