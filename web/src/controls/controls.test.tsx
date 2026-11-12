import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import { AdvancedToggle } from './AdvancedToggle'
import { DatePicker, formatValue, parseValue } from './DatePicker'
import { MoneyInput } from './MoneyInput'
import { Select } from './Select'
import { renderWithProviders } from '../test/render'

const OPTS = [
  { value: 'a', label: 'Alfa' },
  { value: 'b', label: 'Beta' },
]

function SelectHarness() {
  const [v, setV] = useState('a')
  return (
    <>
      <Select value={v} onChange={setV} options={OPTS} />
      <output data-testid="v">{v}</output>
    </>
  )
}

describe('Select', () => {
  it('Enter en el trigger abre, Enter en una opción elige y cierra', async () => {
    const user = userEvent.setup()
    renderWithProviders(<SelectHarness />)
    const trigger = screen.getByRole('button', { name: /Alfa/ })
    trigger.focus()
    await user.keyboard('{Enter}')
    expect(document.querySelector('.cdd-menu')).toHaveClass('open')
    await user.tab()
    expect(screen.getByRole('option', { name: 'Alfa' })).toHaveFocus()
    await user.tab()
    await user.keyboard('{Enter}')
    expect(screen.getByTestId('v')).toHaveTextContent('b')
    expect(document.querySelector('.cdd-menu')).not.toHaveClass('open')
    expect(trigger).toHaveTextContent('Beta')
  })

  it('Escape cierra el menú; click afuera también', async () => {
    const user = userEvent.setup()
    renderWithProviders(<SelectHarness />)
    await user.click(screen.getByRole('button', { name: /Alfa/ }))
    expect(document.querySelector('.cdd-menu')).toHaveClass('open')
    await user.keyboard('{Escape}')
    expect(document.querySelector('.cdd-menu')).not.toHaveClass('open')
    await user.click(screen.getByRole('button', { name: /Alfa/ }))
    await user.click(document.body)
    expect(document.querySelector('.cdd-menu')).not.toHaveClass('open')
  })

  it('abrir uno cierra el otro', async () => {
    const user = userEvent.setup()
    renderWithProviders(
      <>
        <Select value="a" onChange={() => undefined} options={OPTS} />
        <Select value="b" onChange={() => undefined} options={OPTS} />
      </>,
    )
    const [t1, t2] = screen.getAllByRole('button', { expanded: false })
    await user.click(t1 as HTMLElement)
    await user.click(t2 as HTMLElement)
    const menus = document.querySelectorAll('.cdd-menu')
    expect(menus[0]).not.toHaveClass('open')
    expect(menus[1]).toHaveClass('open')
  })
})

describe('MoneyInput', () => {
  function Harness({ initial = '' }: { initial?: string }) {
    const [v, setV] = useState(initial)
    return <MoneyInput value={v} onChange={setV} id="m" />
  }

  it('inserta puntos de miles y descarta lo que no es dígito', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    const input = document.getElementById('m') as HTMLInputElement
    await user.type(input, '1234567')
    expect(input.value).toBe('1.234.567')
    await user.clear(input)
    await user.type(input, 'a1b2,5,6')
    expect(input.value).toBe('1.256')
  })

  it('borrar un dígito del medio conserva el caret', async () => {
    const user = userEvent.setup()
    render(<Harness initial="1.234.567" />)
    const input = document.getElementById('m') as HTMLInputElement
    input.focus()
    input.setSelectionRange(3, 3)
    await user.keyboard('{Backspace}')
    expect(input.value).toBe('134.567')
    expect(input.selectionStart).toBe(1)
  })

  it('prefijo $ y inputmode numérico', () => {
    render(<Harness />)
    expect(document.querySelector('.money-pfx')).toHaveTextContent('$')
    expect(document.getElementById('m')).toHaveAttribute('inputmode', 'numeric')
  })
})

describe('AdvancedToggle', () => {
  it('textos por defecto y checkbox controlado', async () => {
    const user = userEvent.setup()
    function H() {
      const [c, setC] = useState(true)
      return <AdvancedToggle checked={c} onChange={setC} />
    }
    render(<H />)
    const box = screen.getByLabelText('Registrar como nuevo en transacciones')
    expect(box).toBeChecked()
    expect(box).toHaveAttribute('id', 'm-es-nueva')
    expect(screen.getByText('Desactivá si ya lo tenías antes de usar Moni.')).toBeInTheDocument()
    await user.click(box)
    expect(box).not.toBeChecked()
  })
})

describe('DatePicker', () => {
  it('parse/format ida y vuelta', () => {
    expect(formatValue(parseValue('2026-08-05', false), false)).toBe('2026-08-05')
    expect(formatValue(parseValue('2026-08-05T07:09', true), true)).toBe('2026-08-05T07:09')
  })

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
    await user.click(screen.getByRole('button', { name: '20' }))
    expect(screen.getByTestId('v')).toHaveTextContent('2026-08-20')
    expect(document.querySelector('.cdp-panel')).not.toHaveClass('open')
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
    await user.click(screen.getByRole('button', { name: '12' }))
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
    await user.click(screen.getByRole('button', { name: '12' }))
    await user.click(document.body)
    expect(screen.getByTestId('v')).toHaveTextContent('2026-08-12T07:09')
  })
})
