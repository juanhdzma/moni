import { useState } from 'react'
import { Cargando } from '@/components/Skeleton'
import { FormFooter } from '@/controls/forms/FormFooter'
import { Select } from '@/controls/inputs/Select'
import { TipoToggle } from '@/controls/inputs/TipoToggle'
import { entero } from '@/lib/format'
import { useGuardarEntidad } from '@/shell/hooks/acciones/useGuardarEntidad'
import { useMeta } from '@/shell/hooks/datos/useMeta'
import type { OpcionesTx, TipoRec, Transaccion } from '@/types'
import { CamposTx, cuerpoTx, useOpcionesTx, type ValoresTx } from './CamposTx'
import { FormModal } from '@/controls/forms/FormModal'

export function TxForm({ tx }: { tx: Transaccion | null }) {
  const opciones = useOpcionesTx(tx?.id)
  if (!opciones) return <Cargando />
  return <TxFormCampos tx={tx} opciones={opciones} />
}

function TxFormCampos({ tx, opciones }: { tx: Transaccion | null; opciones: OpcionesTx }) {
  const meta = useMeta()
  const { guardar, eliminar, etiquetaGuardar } = useGuardarEntidad('tx', { item: tx, mensajeEliminar: '¿Eliminar este movimiento?' })
  const { tarjetas, inicial } = opciones
  const etiquetaPago = meta?.textos.transacciones.label_pagado_con ?? ''

  const [tipo, setTipo] = useState<TipoRec>(inicial.tipo as TipoRec)
  const permiteTarjeta = meta?.tipos_manuales.find((t) => t.value === tipo)?.permite_tarjeta ?? false
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
    <FormModal>
      <TipoToggle value={tipo} opciones={meta?.tipos_manuales ?? []} onChange={cambiarTipo} />
      <CamposTx tipo={tipo} categorias={opciones.categorias[tipo]} valores={valores} onCambio={(p) => setValores((v) => ({ ...v, ...p }))}>
        {permiteTarjeta && (
          <div className="form-group" id="wrap-tarjeta">
            <label className="form-label" htmlFor="m-tarjeta">{etiquetaPago}</label>
            <Select
              id="m-tarjeta"
              value={tarjeta}
              onChange={setTarjeta}
              ariaLabel={etiquetaPago}
              options={[{ value: '', label: meta?.defaults.etiqueta_efectivo ?? '' }, ...tarjetas.map((d) => ({ value: String(d.id), label: d.nombre }))]}
            />
          </div>
        )}
      </CamposTx>
      <FormFooter saveLabel={etiquetaGuardar()} onSave={() => void save()} onDelete={eliminar} />
    </FormModal>
  )
}
