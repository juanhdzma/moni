import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { META } from '@/test/meta'
import { mockFetch } from '@/test/mockFetch'
import { renderWithProviders } from '@/test/render'
import { CrearTxToggle, RegistrarToggle } from '@/controls/inputs/AdvancedToggle'
import { Campo, NumeroField } from '@/controls/inputs/Campo'
import { FechaNotas } from '@/controls/forms/FormFields'
import { FormFooter } from '@/controls/forms/FormFooter'
import { FormModal } from '@/controls/forms/FormModal'
import { FormStatus, StatusMessage } from '@/controls/forms/FormStatus'
import { FormValor } from '@/controls/forms/FormValor'
import { IconButton } from '@/controls/forms/IconButton'
import { ModalPanel } from '@/controls/forms/ModalPanel'
import { NombreField } from '@/controls/inputs/NombreField'
import { TipoToggle } from '@/controls/inputs/TipoToggle'

afterEach(() => vi.unstubAllGlobals())

describe('Campo y NumeroField', () => {
  it('Campo asocia el label con el control y la pista tiene id propio', () => {
    renderWithProviders(
      <Campo id="x" label="Algo" hint="Ayuda">
        <input id="x" />
      </Campo>,
    )
    expect(screen.getByLabelText('Algo')).toHaveAttribute('id', 'x')
    expect(screen.getByText('Ayuda')).toHaveAttribute('id', 'x-hint')
  })

  it('NumeroField es un input numérico con step, min, max y descripción', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    renderWithProviders(<NumeroField id="n" label="Día" value="" onChange={onChange} min={1} max={31} step="1" hint="Del mes" />)
    const input = screen.getByLabelText('Día')
    expect(input).toHaveAttribute('type', 'number')
    expect(input).toHaveAttribute('min', '1')
    expect(input).toHaveAttribute('max', '31')
    expect(input).toHaveAttribute('step', '1')
    expect(input).toHaveAccessibleDescription('Del mes')
    await user.type(input, '5')
    expect(onChange).toHaveBeenCalledWith('5')
  })

  it('NumeroField acepta un control a la derecha, como el toggle EA/MV', async () => {
    const user = userEvent.setup()
    const onTipo = vi.fn()
    renderWithProviders(
      <NumeroField
        id="t"
        label="Tasa"
        value="12"
        onChange={() => undefined}
        derecha={<TipoToggle inline label="Tipo de tasa" value="ea" opciones={META.tipos_tasa} onChange={onTipo} />}
      />,
    )
    const grupo = screen.getByRole('group', { name: 'Tipo de tasa' })
    expect(screen.getByRole('button', { name: 'EA' })).toHaveAttribute('aria-pressed', 'true')
    expect(grupo).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'MV' }))
    expect(onTipo).toHaveBeenCalledWith('mv')
  })
})

describe('límites de meta', () => {
  it('NombreField y las notas toman maxLength de meta.limites', async () => {
    mockFetch()
    renderWithProviders(
      <>
        <NombreField value="" onChange={() => undefined} placeholder="n" />
        <FechaNotas fechaLabel="Fecha" fecha="" onFecha={() => undefined} notas="" onNotas={() => undefined} notasPlaceholder="p" />
      </>,
    )
    await waitFor(() => expect(screen.getByLabelText('Nombre')).toHaveAttribute('maxlength', String(META.limites.nombre)))
    expect(screen.getByLabelText('Notas (opcional)')).toHaveAttribute('maxlength', String(META.limites.notas))
  })
})

describe('TipoToggle', () => {
  it('sin tono propio usa el valor como clase y marca aria-pressed', () => {
    renderWithProviders(<TipoToggle value="gasto" opciones={META.tipos_manuales} onChange={() => undefined} idPrefix="t" />)
    expect(document.getElementById('t-gasto')).toHaveClass('gasto', 'sel')
    expect(screen.getByRole('button', { name: 'Gasto' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Ingreso' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('con tono del backend lo usa por encima del valor', () => {
    renderWithProviders(<TipoToggle value="fija" opciones={META.tipos_inversion} onChange={() => undefined} idPrefix="t" />)
    expect(document.getElementById('t-variable')).toHaveClass('gasto')
  })
})

describe('opciones de registro', () => {
  it('cada variante tiene su pista, descrita desde el checkbox, y comparten el hook de test', async () => {
    const user = userEvent.setup()
    function H() {
      const [a, setA] = useState(true)
      return (
        <>
          <CrearTxToggle checked={a} onChange={setA} />
          <output data-testid="a">{String(a)}</output>
        </>
      )
    }
    renderWithProviders(<H />)
    const box = screen.getByLabelText('Registrar como nuevo en transacciones')
    expect(box).toHaveAccessibleDescription('Desactivá si ya lo tenías antes de usar Moni.')
    await user.click(box)
    expect(screen.getByTestId('a')).toHaveTextContent('false')
  })

  it('RegistrarToggle: texto y pista de registrar', () => {
    renderWithProviders(<RegistrarToggle checked={false} onChange={() => undefined} />)
    expect(screen.getByLabelText('Registrar en transacciones')).not.toBeChecked()
    expect(screen.getByLabelText('Registrar en transacciones')).toHaveAccessibleDescription('Desactivá si ya lo registraste en otra parte.')
  })
})

describe('FormModal y FormFooter', () => {
  it('Enter dentro de un input guarda una sola vez y el botón guardar es submit', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()
    renderWithProviders(
      <FormModal>
        <input aria-label="Texto" />
        <FormFooter saveLabel="Guardar" onSave={onSave} />
      </FormModal>,
    )
    expect(screen.getByRole('button', { name: 'Guardar' })).toHaveAttribute('type', 'submit')
    await user.type(screen.getByLabelText('Texto'), 'hola{Enter}')
    expect(onSave).toHaveBeenCalledTimes(1)
    await user.click(screen.getByRole('button', { name: 'Guardar' }))
    expect(onSave).toHaveBeenCalledTimes(2)
    expect(screen.getByRole('button', { name: 'Cancelar' })).toHaveAttribute('type', 'button')
  })

  it('fuera de un FormModal el guardar sigue siendo un botón con onClick', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()
    const onDelete = vi.fn()
    renderWithProviders(<FormFooter saveLabel="Guardar" onSave={onSave} onDelete={onDelete} />)
    expect(screen.getByRole('button', { name: 'Guardar' })).toHaveAttribute('type', 'button')
    await user.click(screen.getByRole('button', { name: 'Guardar' }))
    await user.click(screen.getByRole('button', { name: 'Eliminar' }))
    expect(onSave).toHaveBeenCalledTimes(1)
    expect(onDelete).toHaveBeenCalledTimes(1)
  })

  it('peligro pinta el guardar como acción destructiva', () => {
    renderWithProviders(<FormFooter saveLabel="Borrar" onSave={() => undefined} peligro />)
    expect(screen.getByRole('button', { name: 'Borrar' })).toHaveClass('btn-danger')
  })
})

describe('FormStatus', () => {
  it('un mensaje informativo es role status y un error es alert', () => {
    renderWithProviders(
      <>
        <StatusMessage cls="" msg="Guardando..." />
        <StatusMessage cls="err" msg="Falló" />
        <FormStatus />
      </>,
    )
    expect(screen.getAllByRole('status')[0]).toHaveTextContent('Guardando...')
    expect(screen.getByRole('alert')).toHaveTextContent('Falló')
  })
})

describe('IconButton y ModalPanel', () => {
  it('IconButton es un button con nombre accesible y clase icon-btn', async () => {
    const onClick = vi.fn()
    renderWithProviders(<IconButton label="Cerrar prueba" onClick={onClick}>x</IconButton>)
    const b = screen.getByRole('button', { name: 'Cerrar prueba' })
    expect(b).toHaveClass('icon-btn')
    expect(b).toHaveAttribute('type', 'button')
    await userEvent.click(b)
    expect(onClick).toHaveBeenCalled()
  })

  it('las dos columnas usan el mismo estilo de valor y la derecha va alineada', () => {
    renderWithProviders(<ModalPanel izquierda={{ label: 'A', valor: '1', clase: 'text-deudas' }} derecha={{ label: 'B', valor: '2', detalle: 'det' }} />)
    const valores = document.querySelectorAll('.modal-panel-value')
    expect(valores).toHaveLength(2)
    expect(valores[0]).toHaveClass('text-deudas')
    expect(document.querySelectorAll('.modal-panel-col')[1]).toHaveClass('right')
    expect(screen.getByText('det')).toBeInTheDocument()
  })
})

describe('FormValor', () => {
  it('arma panel, campo de valor, variación, fecha y pie compartidos', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()
    function H() {
      const [v, setV] = useState('')
      const [f, setF] = useState('2026-08-05')
      return (
        <FormValor
          panel={{ izquierda: { label: 'Último valor', valor: '$1' } }}
          label="Nuevo valor"
          valor={v}
          onValor={setV}
          variacion={{ id: 'b', idDelta: 'd', idTotal: 't', labelTotal: 'Total', visible: true, preview: { delta: 5, total: 10, total_pct: 2 } }}
          fechaLabel="Fecha de valoración"
          fecha={f}
          onFecha={setF}
          footer={{ saveLabel: 'Actualizar', onSave }}
        />
      )
    }
    renderWithProviders(<H />)
    expect(screen.getByText('Último valor')).toBeInTheDocument()
    await user.type(screen.getByLabelText('Nuevo valor'), '1000')
    expect(screen.getByLabelText<HTMLInputElement>('Nuevo valor').value).toBe('1.000')
    expect(document.getElementById('t')).toHaveTextContent('+$10')
    expect(screen.getByLabelText('Fecha de valoración')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Actualizar' }))
    expect(onSave).toHaveBeenCalled()
  })
})
