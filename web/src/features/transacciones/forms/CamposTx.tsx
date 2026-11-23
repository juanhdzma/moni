import type { ReactNode } from 'react'
import { FechaNotas } from '../../../controls/FormFields'
import { MoneyInput } from '../../../controls/MoneyInput'
import { Select } from '../../../controls/Select'
import { cargarOpcionesTx } from '../../../lib/api/transacciones'
import { parseMoney } from '../../../lib/format'
import { useVista } from '@/shell/hooks/useVista'
import { DEPENDENCIAS_DE_VISTA } from '@/shell/invalidacion'
import { NuevaCategoria } from './NuevaCategoria'

const SIN_CATEGORIAS = 'Sin categorías — agregá una con +'

type TipoManual = 'ingreso' | 'gasto'

export interface ValoresTx {
  categoria: string
  descripcion: string
  monto: string
  fecha: string
  notas: string
}

export const useOpcionesTx = (txId?: number) =>
  useVista(`tx-opciones:${txId ?? 'nuevo'}`, () => cargarOpcionesTx(txId), DEPENDENCIAS_DE_VISTA.opcionesTransaccion).data

export const cuerpoTx = (tipo: TipoManual, v: ValoresTx, tarjetaId: number | null) => ({
  fecha: v.fecha,
  tipo,
  categoria: v.categoria,
  descripcion: v.descripcion.trim(),
  monto: parseMoney(v.monto),
  notas: v.notas.trim(),
  tarjeta_id: tarjetaId,
})

interface Props {
  tipo: TipoManual
  categorias: string[]
  valores: ValoresTx
  onCambio: (parcial: Partial<ValoresTx>) => void
  fechaType?: 'date' | 'datetime-local'
  ayudaMonto?: string
  children?: ReactNode
}

export function CamposTx({ tipo, categorias, valores, onCambio, fechaType, ayudaMonto, children }: Props) {
  return (
    <>
      <div className="form-group">
        <label className="form-label" htmlFor="m-cat">Categoría</label>
        <NuevaCategoria key={tipo} tipo={tipo} onCreada={(categoria) => onCambio({ categoria })}>
          <Select
            id="m-cat"
            style={{ flex: 1 }}
            value={valores.categoria}
            onChange={(categoria) => onCambio({ categoria })}
            ariaLabel="Categoría"
            options={categorias.length ? categorias.map((c) => ({ value: c, label: c })) : [{ value: '', label: SIN_CATEGORIAS }]}
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
          value={valores.descripcion}
          placeholder="Ej. Mercado Éxito"
          onChange={(e) => onCambio({ descripcion: e.target.value })}
        />
      </div>
      <div className="form-group">
        <label className="form-label" htmlFor="m-monto">Monto (COP)</label>
        <MoneyInput id="m-monto" value={valores.monto} onChange={(monto) => onCambio({ monto })} ariaLabel="Monto (COP)" />
        {ayudaMonto && <div className="mt-1.5 text-xs text-muted-foreground">{ayudaMonto}</div>}
      </div>
      {children}
      <FechaNotas
        fechaType={fechaType}
        fechaLabel="Fecha"
        fecha={valores.fecha}
        onFecha={(fecha) => onCambio({ fecha })}
        notas={valores.notas}
        onNotas={(notas) => onCambio({ notas })}
        notasPlaceholder="Notas adicionales"
      />
    </>
  )
}
