import { useState } from 'react'
import { FechaNotas } from '../../../controls/FormFields'
import { FormFooter } from '../../../controls/FormFooter'
import { MoneyInput } from '../../../controls/MoneyInput'
import { Select } from '../../../controls/Select'
import { numToInput, parseMoney } from '../../../lib/format'
import { useGuardar } from '@/shell/hooks/useGuardar'
import { useMutations } from '@/shell/hooks/useMutations'
import { useCategorias } from '@/shell/hooks/useCategorias'
import type { Recurrente } from '../../../types'

export function MaterializeForm({ r, dateISO }: { r: Recurrente; dateISO: string }) {
  const { categorias } = useCategorias()
  const guardar = useGuardar()
  const { crudOp } = useMutations()
  const tipo = r.tipo === 'ingreso' ? 'ingreso' : 'gasto'
  const cats = categorias[tipo].map((c) => c.nombre)
  const [categoriaElegida, setCategoriaElegida] = useState<string | null>(null)
  const categoria = categoriaElegida ?? r.categoria_sugerida
  const [descripcion, setDescripcion] = useState(r.nombre)
  const [monto, setMonto] = useState(numToInput(r.monto))
  const [fecha, setFecha] = useState(dateISO)
  const [notas, setNotas] = useState('')

  const save = () =>
    guardar(() =>
      crudOp('tx', 'add', {
        fecha,
        tipo,
        categoria,
        descripcion: descripcion.trim(),
        monto: parseMoney(monto),
        notas: notas.trim(),
        tarjeta_id: null,
      }),
    )

  return (
    <>
      <div className="form-group">
        <label className="form-label" htmlFor="m-cat">Categoría</label>
        <Select id="m-cat" value={categoria} onChange={setCategoriaElegida} options={cats.map((c) => ({ value: c, label: c }))} />
      </div>
      <div className="form-group">
        <label className="form-label" htmlFor="m-desc">Descripción</label>
        <input className="form-input" type="text" id="m-desc" maxLength={30} value={descripcion} onChange={(e) => setDescripcion(e.target.value)} />
      </div>
      <div className="form-group">
        <label className="form-label" htmlFor="m-monto">Monto (COP)</label>
        <MoneyInput id="m-monto" value={monto} onChange={setMonto} />
        <div className="mt-1.5 text-xs text-muted-foreground">
          Pre-llenado con el monto recurrente — ajustá si difiere.
        </div>
      </div>
      <FechaNotas fechaType="date" fechaLabel="Fecha" fecha={fecha} onFecha={setFecha} notas={notas} onNotas={setNotas} notasPlaceholder="" />
      <FormFooter saveLabel="Registrar" onSave={() => void save()} cancelClassName="ml-auto" />
    </>
  )
}
