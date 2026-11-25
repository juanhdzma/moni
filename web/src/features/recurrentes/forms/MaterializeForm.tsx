import { useState } from 'react'
import { Cargando } from '@/components/Cargando'
import { FormFooter } from '@/controls/FormFooter'
import { entero } from '@/lib/format'
import { useGuardar } from '@/shell/hooks/useGuardar'
import { useMutations } from '@/shell/hooks/useMutations'
import { CamposTx, cuerpoTx, useOpcionesTx } from '@/features/transacciones'
import type { Recurrente } from '@/types'
import { FormModal } from '@/controls/FormModal'

export function MaterializeForm({ r, dateISO }: { r: Recurrente; dateISO: string }) {
  const opciones = useOpcionesTx()
  const guardar = useGuardar()
  const { crudOp } = useMutations()
  const tipo = r.tipo
  const [valores, setValores] = useState({
    categoria: r.categoria_sugerida,
    descripcion: r.nombre,
    monto: entero(r.monto),
    fecha: dateISO,
    notas: '',
  })

  if (!opciones) return <Cargando />

  const save = () => guardar(() => crudOp('tx', 'add', cuerpoTx(tipo, valores, null)))

  return (
    <FormModal>
      <CamposTx
        tipo={tipo}
        categorias={opciones.categorias[tipo]}
        valores={valores}
        onCambio={(p) => setValores((v) => ({ ...v, ...p }))}
        fechaType="date"
        ayudaMonto="Pre-llenado con el monto recurrente — ajustá si difiere."
      />
      <FormFooter saveLabel="Registrar" onSave={() => void save()} cancelClassName="ml-auto" />
    </FormModal>
  )
}
