import { useState } from 'react'
import { Cargando } from '@/components/Skeleton'
import { FormFooter } from '@/controls/forms/FormFooter'
import { entero } from '@/lib/format'
import { useMeta } from '@/shell/hooks/datos/useMeta'
import { useGuardar } from '@/shell/hooks/acciones/useGuardar'
import { useMutations } from '@/shell/hooks/acciones/useMutations'
import { CamposTx, cuerpoTx, useOpcionesTx } from '@/features/transacciones'
import type { Recurrente } from '@/types'
import { FormModal } from '@/controls/forms/FormModal'

export function MaterializeForm({ r, dateISO }: { r: Recurrente; dateISO: string }) {
  const opciones = useOpcionesTx()
  const textos = useMeta()?.textos.materializar
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
        ayudaMonto={textos?.ayuda_monto}
      />
      <FormFooter saveLabel={textos?.guardar ?? ''} onSave={() => void save()} />
    </FormModal>
  )
}
