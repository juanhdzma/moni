import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { AdvancedToggle } from './AdvancedToggle'
import { MoneyInput } from './MoneyInput'
import { Select } from './Select'
import { renderWithProviders } from '@/test/render'

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
  it('con un valor desconocido muestra la primera opción y no llama a onChange', () => {
    const onChange = vi.fn()
    renderWithProviders(<Select value="zzz" onChange={onChange} options={OPTS} id="s" />)
    expect(document.getElementById('s')).toHaveTextContent('Alfa')
    expect(onChange).not.toHaveBeenCalled()
  })

  it('el id va en el trigger, así que el label lo enfoca y lo nombra', () => {
    renderWithProviders(
      <>
        <label htmlFor="s">Letra</label>
        <Select value="a" onChange={() => undefined} options={OPTS} id="s" />
      </>,
    )
    expect(screen.getByLabelText('Letra').tagName).toBe('BUTTON')
  })

  it('Enter en el trigger abre, Enter en una opción elige y cierra', async () => {
    const user = userEvent.setup()
    renderWithProviders(<SelectHarness />)
    const trigger = screen.getByRole('button', { name: /Alfa/ })
    trigger.focus()
    await user.keyboard('{Enter}')
    expect(document.querySelector('.cdd-menu')).toHaveClass('open')
    expect(screen.getByRole('listbox')).toHaveFocus()
    await user.keyboard('{ArrowDown}{Enter}')
    expect(screen.getByTestId('v')).toHaveTextContent('b')
    expect(document.querySelector('.cdd-menu')).not.toHaveClass('open')
    expect(trigger).toHaveTextContent('Beta')
    expect(trigger).toHaveFocus()
  })

  it('ARIA: el trigger apunta a la lista y la lista a la opción activa', async () => {
    const user = userEvent.setup()
    renderWithProviders(<SelectHarness />)
    const trigger = screen.getByRole('button', { name: /Alfa/ })
    const lista = document.querySelector('.cdd-menu') as HTMLElement
    expect(trigger).toHaveAttribute('aria-controls', lista.id)
    expect(lista).not.toHaveAttribute('aria-activedescendant')
    await user.click(trigger)
    const [alfa, beta] = screen.getAllByRole('option')
    expect(lista).toHaveAttribute('aria-activedescendant', alfa?.id)
    expect(alfa).toHaveAttribute('aria-selected', 'true')
    await user.keyboard('{ArrowDown}')
    expect(lista).toHaveAttribute('aria-activedescendant', beta?.id)
    expect(beta).toHaveClass('active')
  })

  it('flechas, Home y End mueven la opción activa sin salirse de los límites', async () => {
    const user = userEvent.setup()
    renderWithProviders(<SelectHarness />)
    await user.click(screen.getByRole('button', { name: /Alfa/ }))
    const lista = screen.getByRole('listbox')
    const [alfa, beta] = screen.getAllByRole('option')
    await user.keyboard('{ArrowUp}')
    expect(lista).toHaveAttribute('aria-activedescendant', alfa?.id)
    await user.keyboard('{End}')
    expect(lista).toHaveAttribute('aria-activedescendant', beta?.id)
    await user.keyboard('{ArrowDown}')
    expect(lista).toHaveAttribute('aria-activedescendant', beta?.id)
    await user.keyboard('{Home}')
    expect(lista).toHaveAttribute('aria-activedescendant', alfa?.id)
  })

  it('ArrowDown en el trigger abre y escribir una letra salta a la opción que empieza así', async () => {
    const user = userEvent.setup()
    renderWithProviders(<SelectHarness />)
    screen.getByRole('button', { name: /Alfa/ }).focus()
    await user.keyboard('{ArrowDown}')
    expect(document.querySelector('.cdd-menu')).toHaveClass('open')
    await user.keyboard('b')
    expect(screen.getByRole('listbox')).toHaveAttribute('aria-activedescendant', screen.getByRole('option', { name: 'Beta' }).id)
    await user.keyboard('{Enter}')
    expect(screen.getByTestId('v')).toHaveTextContent('b')
  })

  it('Escape devuelve el foco al trigger y Tab cierra sin elegir', async () => {
    const user = userEvent.setup()
    renderWithProviders(
      <>
        <SelectHarness />
        <button type="button">Siguiente</button>
      </>,
    )
    const trigger = screen.getByRole('button', { name: /Alfa/ })
    await user.click(trigger)
    await user.keyboard('{Escape}')
    expect(trigger).toHaveFocus()
    await user.keyboard('{Enter}{ArrowDown}{Tab}')
    expect(document.querySelector('.cdd-menu')).not.toHaveClass('open')
    expect(screen.getByTestId('v')).toHaveTextContent('a')
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
    renderWithProviders(<Harness />)
    const input = document.getElementById('m') as HTMLInputElement
    await user.type(input, '1234567')
    expect(input.value).toBe('1.234.567')
    await user.clear(input)
    await user.type(input, 'a1b2,5,6')
    expect(input.value).toBe('1.256')
  })

  it('borrar un dígito del medio conserva el caret', async () => {
    const user = userEvent.setup()
    renderWithProviders(<Harness initial="1.234.567" />)
    const input = document.getElementById('m') as HTMLInputElement
    input.focus()
    input.setSelectionRange(3, 3)
    await user.keyboard('{Backspace}')
    expect(input.value).toBe('134.567')
    expect(input.selectionStart).toBe(1)
  })

  it('prefijo $ y inputmode numérico', () => {
    renderWithProviders(<Harness />)
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
    renderWithProviders(<H />)
    const box = screen.getByLabelText('Registrar como nuevo en transacciones')
    expect(box).toBeChecked()
    expect(box).toHaveAttribute('id', 'm-es-nueva')
    expect(screen.getByText('Desactivá si ya lo tenías antes de usar Moni.')).toBeInTheDocument()
    await user.click(box)
    expect(box).not.toBeChecked()
  })
})
