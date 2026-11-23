import { useState } from 'react'
import { FormFooter } from '../../../controls/FormFooter'
import { numToInput } from '../../../lib/format'
import { useGuardar } from '@/shell/hooks/useGuardar'
import { useMutations } from '@/shell/hooks/useMutations'
import { CamposTx, cuerpoTx, useOpcionesTx } from '../../transacciones'
import type { Recurrente } from '../../../types'

export function MaterializeForm({ r, dateISO }: { r: Recurrente; dateISO: string }) {
  const opciones = useOpcionesTx()
  const guardar = useGuardar()
  const { crudOp } = useMutations()
  const tipo = r.tipo === 'ingreso' ? 'ingreso' : 'gasto'
  const [valores, setValores] = useState({
    categoria: r.categoria_sugerida,
    descripcion: r.nombre,
    monto: numToInput(r.monto),
    fecha: dateISO,
    notas: '',
  })

  if (!opciones) return <p className="py-6 text-center text-sm text-muted-foreground">Cargando...</p>

  const save = () => guardar(() => crudOp('tx', 'add', cuerpoTx(tipo, valores, null)))

  return (
    <>
      <CamposTx
        tipo={tipo}
        categorias={opciones.categorias[tipo]}
        valores={valores}
        onCambio={(p) => setValores((v) => ({ ...v, ...p }))}
        fechaType="date"
        ayudaMonto="Pre-llenado con el monto recurrente — ajustá si difiere."
      />
      <FormFooter saveLabel="Registrar" onSave={() => void save()} cancelClassName="ml-auto" />
    </>
  )
}
