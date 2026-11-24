import { useState } from 'react'
import { Cargando } from '@/components/Cargando'
import { FormFooter } from '../../../controls/FormFooter'
import { Select } from '../../../controls/Select'
import { TipoToggle } from '../../../controls/TipoToggle'
import { entero } from '../../../lib/format'
import { useGuardarEntidad } from '@/shell/hooks/useGuardarEntidad'
import { useMeta } from '@/shell/hooks/useMeta'
import type { OpcionesTx, TipoRec, Transaccion } from '../../../types'
import { CamposTx, cuerpoTx, useOpcionesTx, type ValoresTx } from './CamposTx'

export function TxForm({ tx }: { tx: Transaccion | null }) {
  const opciones = useOpcionesTx(tx?.id)
  if (!opciones) return <Cargando />
  return <TxFormCampos tx={tx} opciones={opciones} />
}

function TxFormCampos({ tx, opciones }: { tx: Transaccion | null; opciones: OpcionesTx }) {
  const meta = useMeta()
  const { guardar, eliminar, etiquetaGuardar } = useGuardarEntidad('tx', { item: tx, mensajeEliminar: '¿Eliminar este movimiento?' })
  const { tarjetas, inicial } = opciones

  const [tipo, setTipo] = useState(inicial.tipo)
  const [tarjeta, setTarjeta] = useState(inicial.tarjeta_id != null ? String(inicial.tarjeta_id) : '')
  const [valores, setValores] = useState<ValoresTx>({
    categoria: inicial.categoria,
    descripcion: tx?.descripcion || '',
    monto: tx ? entero(tx.monto) : '',
    fecha: inicial.fecha,
    notas: tx?.notas || '',
  })

  const cambiarTipo = (t: TipoRec) => {
    setTipo(t)
    setValores((v) => ({ ...v, categoria: opciones.categoria_default[t] }))
  }

  const save = () => guardar(cuerpoTx(tipo, valores, tarjeta ? Number(tarjeta) : null))

  return (
    <>
      <TipoToggle value={tipo} opciones={meta?.tipos_manuales ?? []} onChange={cambiarTipo} />
      <CamposTx tipo={tipo} categorias={opciones.categorias[tipo]} valores={valores} onCambio={(p) => setValores((v) => ({ ...v, ...p }))}>
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
      </CamposTx>
      <FormFooter saveLabel={etiquetaGuardar()} onSave={() => void save()} onDelete={eliminar} cancelClassName="ml-auto" />
    </>
  )
}
