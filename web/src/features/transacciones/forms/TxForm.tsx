import { useState } from 'react'
import { FechaNotas } from '../../../controls/FormFields'
import { FormFooter } from '../../../controls/FormFooter'
import { MoneyInput } from '../../../controls/MoneyInput'
import { Select } from '../../../controls/Select'
import { TipoToggle } from '../../../controls/TipoToggle'
import { cargarOpcionesTx } from '../../../lib/api/transacciones'
import { numToInput, parseMoney } from '../../../lib/format'
import { useConfirmDelete } from '@/shell/hooks/useConfirmDelete'
import { useGuardar } from '@/shell/hooks/useGuardar'
import { useMeta } from '@/shell/hooks/useMeta'
import { useMutations } from '@/shell/hooks/useMutations'
import { useVista } from '@/shell/hooks/useVista'
import type { OpcionesTx, Transaccion } from '../../../types'
import { NuevaCategoria } from './NuevaCategoria'

const SIN_CATEGORIAS = 'Sin categorías — agregá una con +'

export function TxForm({ tx }: { tx: Transaccion | null }) {
  const { data: opciones } = useVista(`tx-opciones:${tx?.id ?? 'nuevo'}`, () => cargarOpcionesTx(tx?.id))
  if (!opciones) return <p className="py-6 text-center text-sm text-muted-foreground">Cargando...</p>
  return <TxFormCampos tx={tx} opciones={opciones} />
}

function TxFormCampos({ tx, opciones }: { tx: Transaccion | null; opciones: OpcionesTx }) {
  const guardar = useGuardar()
  const meta = useMeta()
  const { crudOp } = useMutations()
  const eliminar = useConfirmDelete('tx', tx, '¿Eliminar este movimiento?')
  const isEdit = tx !== null
  const { tarjetas, inicial } = opciones

  const [tipo, setTipo] = useState(inicial.tipo)
  const [categoria, setCategoria] = useState(inicial.categoria)
  const [descripcion, setDescripcion] = useState(tx?.descripcion || '')
  const [monto, setMonto] = useState(tx ? numToInput(tx.monto) : '')
  const [tarjeta, setTarjeta] = useState(inicial.tarjeta_id != null ? String(inicial.tarjeta_id) : '')
  const [fecha, setFecha] = useState(inicial.fecha)
  const [notas, setNotas] = useState(tx?.notas || '')

  const cats = opciones.categorias[tipo]

  const cambiarTipo = (t: 'ingreso' | 'gasto') => {
    setTipo(t)
    setCategoria(opciones.categoria_default[t])
  }

  const save = async () => {
    const data = {
      fecha,
      tipo,
      categoria,
      descripcion: descripcion.trim(),
      monto: parseMoney(monto),
      notas: notas.trim(),
      tarjeta_id: tipo === 'gasto' && tarjeta ? Number(tarjeta) : null,
    }
    await guardar(async () => {
      if (tx) await crudOp('tx', 'update', { ...data, id: tx.id })
      else await crudOp('tx', 'add', data)
    })
  }

  return (
    <>
      <TipoToggle value={tipo} opciones={meta?.tipos_transaccion.filter((t) => t.value !== 'transfer') ?? []} onChange={cambiarTipo} />
      <div className="form-group">
        <label className="form-label" htmlFor="m-cat">Categoría</label>
        <NuevaCategoria key={tipo} tipo={tipo} onCreada={setCategoria}>
          <Select
            id="m-cat"
            style={{ flex: 1 }}
            value={categoria}
            onChange={setCategoria}
            ariaLabel="Categoría"
            options={cats.length ? cats.map((c) => ({ value: c, label: c })) : [{ value: '', label: SIN_CATEGORIAS }]}
          />
        </NuevaCategoria>
      </div>
      <div className="form-group">
        <label className="form-label" htmlFor="m-desc">Descripción</label>
        <input
          className="form-input"
          type="text"
          id="m-desc"
          maxLength={30}
          value={descripcion}
          placeholder="Ej. Mercado Éxito"
          onChange={(e) => setDescripcion(e.target.value)}
        />
      </div>
      <div className="form-group">
        <label className="form-label" htmlFor="m-monto">Monto (COP)</label>
        <MoneyInput id="m-monto" value={monto} onChange={setMonto} ariaLabel="Monto (COP)" />
      </div>
      {tipo === 'gasto' && (
        <div className="form-group" id="wrap-tarjeta">
          <label className="form-label" htmlFor="m-tarjeta">Pagado con</label>
          <Select
            id="m-tarjeta"
            value={tarjeta}
            onChange={setTarjeta}
            ariaLabel="Pagado con"
            options={[{ value: '', label: 'Efectivo / Débito' }, ...tarjetas.map((d) => ({ value: String(d.id), label: d.nombre }))]}
          />
        </div>
      )}
      <FechaNotas fechaLabel="Fecha" fecha={fecha} onFecha={setFecha} notas={notas} onNotas={setNotas} notasPlaceholder="Notas adicionales" />
      <FormFooter saveLabel={isEdit ? 'Guardar cambios' : 'Agregar'} onSave={() => void save()} onDelete={eliminar} cancelClassName="ml-auto" buttonType="button" />
    </>
  )
}
