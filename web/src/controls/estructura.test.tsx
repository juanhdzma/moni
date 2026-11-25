import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { renderWithProviders } from '@/test/render'
import { useModal } from '@/shell/providers/ModalProvider'
import { Breakdown, BreakdownRow } from './Breakdown'
import { FormStatus, StatusMessage } from './FormStatus'
import { Hint } from './Hint'
import { ModalPanel } from './ModalPanel'

describe('Hint', () => {
  it('lleva id, clase base y clase extra', () => {
    renderWithProviders(<Hint id="h" className="extra">Ayuda</Hint>)
    const h = screen.getByText('Ayuda')
    expect(h).toHaveAttribute('id', 'h')
    expect(h).toHaveClass('text-xs', 'text-muted-foreground', 'extra')
  })
})

describe('StatusMessage', () => {
  it('ok es status con ícono, err es alert con ícono, info es status sin ícono', () => {
    renderWithProviders(
      <>
        <StatusMessage cls="ok" msg="Guardado" id="o" />
        <StatusMessage cls="err" msg="Falló" id="e" />
        <StatusMessage cls="info" msg="Guardando..." id="i" />
      </>,
    )
    const ok = document.getElementById('o')!
    const err = document.getElementById('e')!
    const info = document.getElementById('i')!
    expect(ok).toHaveAttribute('role', 'status')
    expect(ok).toHaveClass('form-status', 'ok')
    expect(ok.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
    expect(err).toHaveAttribute('role', 'alert')
    expect(err).toHaveClass('form-status', 'err')
    expect(err.querySelector('svg')).toBeInTheDocument()
    expect(info).toHaveAttribute('role', 'status')
    expect(info.querySelector('svg')).not.toBeInTheDocument()
  })

  it('sin mensaje no pinta el ícono', () => {
    renderWithProviders(<StatusMessage cls="err" msg="" id="v" />)
    expect(document.getElementById('v')!.querySelector('svg')).not.toBeInTheDocument()
  })

  it('FormStatus pinta el estado del modal con id m-status', async () => {
    function Abrir() {
      const { openModal, setModalStatus } = useModal()
      return (
        <button
          onClick={() => {
            openModal('Prueba', <FormStatus />)
            setModalStatus('err', 'Monto inválido')
          }}
        >
          abrir
        </button>
      )
    }
    renderWithProviders(<Abrir />)
    await userEvent.click(screen.getByText('abrir'))
    const s = screen.getByRole('alert')
    expect(s).toHaveAttribute('id', 'm-status')
    expect(s).toHaveTextContent('Monto inválido')
    expect(s).toHaveClass('mt-3', 'err')
  })
})

describe('ModalPanel', () => {
  it('solo izquierda: una columna sin alineación derecha ni detalle', () => {
    renderWithProviders(<ModalPanel izquierda={{ label: 'Saldo', valor: '$10', clase: 'text-deudas' }} />)
    const cols = document.querySelectorAll('.modal-panel-col')
    expect(cols).toHaveLength(1)
    expect(cols[0]).not.toHaveClass('right')
    expect(screen.getByText('Saldo')).toHaveClass('modal-panel-label')
    expect(screen.getByText('$10')).toHaveClass('modal-panel-value', 'text-deudas')
    expect(cols[0]!.children).toHaveLength(2)
  })

  it('con derecha y detalle: dos columnas, el detalle precede a la etiqueta', () => {
    renderWithProviders(
      <ModalPanel izquierda={{ label: 'A', valor: '1' }} derecha={{ label: 'B', valor: '2', detalle: 'nota' }} />,
    )
    const cols = document.querySelectorAll('.modal-panel-col')
    expect(cols).toHaveLength(2)
    expect(cols[0]).not.toHaveClass('right')
    expect(cols[1]).toHaveClass('right')
    expect(cols[1]!.children).toHaveLength(3)
    expect(cols[1]!.firstElementChild).toHaveTextContent('nota')
    expect(cols[0]!.children).toHaveLength(2)
  })
})

describe('Breakdown', () => {
  it('visible agrega la clase y las filas muestran etiqueta y valor con id', () => {
    renderWithProviders(
      <Breakdown id="b" visible>
        <BreakdownRow id="r" label="Capital">$5</BreakdownRow>
      </Breakdown>,
    )
    expect(document.getElementById('b')).toHaveClass('breakdown', 'visible')
    expect(screen.getByText('Capital')).toHaveClass('breakdown-label')
    expect(document.getElementById('r')).toHaveClass('breakdown-value')
    expect(document.getElementById('r')).toHaveTextContent('$5')
  })
})

