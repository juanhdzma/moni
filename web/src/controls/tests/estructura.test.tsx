import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { renderWithProviders } from '@/test/render'
import { useModal } from '@/shell/providers/ModalProvider'
import { Breakdown, BreakdownRow } from '@/controls/desglose/Breakdown'
import { BreakdownVariacion } from '@/controls/desglose/BreakdownVariacion'
import { FormStatus, Hint, StatusMessage } from '@/controls/forms/FormStatus'
import { ModalPanel } from '@/controls/forms/ModalPanel'

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

const propsVariacion = { id: 'p', idDelta: 'd', idTotal: 't', labelTotal: 'Ganancia total' }

describe('BreakdownVariacion', () => {
  it('muestra las dos filas con el cambio y la variación', () => {
    renderWithProviders(<BreakdownVariacion {...propsVariacion} visible preview={{ delta: 100, delta_tono: 'positivo', delta_signo: '+', total: 500, total_tono: 'positivo', total_signo: '+', total_pct: 10 }} />)
    expect(screen.getByText('Cambio desde último')).toBeInTheDocument()
    expect(screen.getByText('Ganancia total')).toBeInTheDocument()
    expect(document.getElementById('d')).toHaveTextContent('100')
    expect(document.getElementById('t')).toHaveTextContent('500')
    expect(document.getElementById('p')).toHaveClass('visible')
  })

  it('sin preview muestra guiones y oculto si no es visible', () => {
    renderWithProviders(<BreakdownVariacion {...propsVariacion} visible={false} preview={null} />)
    expect(document.getElementById('d')).toHaveTextContent('—')
    expect(document.getElementById('p')).not.toHaveClass('visible')
  })
})
