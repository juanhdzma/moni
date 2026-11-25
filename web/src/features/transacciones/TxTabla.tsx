import type { KeyboardEvent, ReactNode } from 'react'
import { EmptyCard } from '@/components/EmptyCard'
import { IconoMetodo } from '@/components/IconoMetodo'
import { Monto } from '@/components/monto'
import { cn } from '@/lib/utils'
import { fmtDate } from '@/lib/format'
import type { ColumnaTransaccion, FilaTx, TextoVacio } from '@/types'

const CELDA = 'px-2 py-3 align-middle sm:py-2'

interface Celda {
  clase?: string
  contenido: (t: FilaTx) => ReactNode
}

const CELDAS: Record<string, Celda> = {
  fecha: { clase: 'whitespace-nowrap text-xs text-muted-foreground', contenido: (t) => fmtDate(t.fecha) },
  tipo: { clase: 'text-xs text-muted-foreground', contenido: (t) => t.tipo_label },
  categoria: { contenido: (t) => t.categoria },
  descripcion: {
    clase: 'min-w-0 max-w-[14rem] truncate',
    contenido: (t) => (
      <>
        <span className="block truncate">{t.descripcion || '—'}</span>
        <span className="block truncate text-xs text-muted-foreground sm:hidden">
          {t.categoria} · {t.tipo_label}
        </span>
      </>
    ),
  },
  monto: { clase: 'whitespace-nowrap text-right font-semibold', contenido: (t) => <Monto valor={t.monto_firmado} tono={t.tono} /> },
  metodo_pago: {
    clase: 'text-xs text-muted-foreground',
    contenido: (t) => (
      <div className="flex items-center gap-2">
        <IconoMetodo icono={t.icono_metodo} />
        <span title={t.tarjeta_nombre ?? undefined}>{t.metodo_pago}</span>
      </div>
    ),
  },
}

export const claseOculta = (c: ColumnaTransaccion) => (c.oculta_en_movil ? 'hidden sm:table-cell' : '')

function TxRow({ t, columnas, onEdit }: { t: FilaTx; columnas: ColumnaTransaccion[]; onEdit: (id: number) => void }) {
  const editar = t.editable
    ? {
        onClick: () => onEdit(t.id),
        onKeyDown: (e: KeyboardEvent) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            onEdit(t.id)
          }
        },
        tabIndex: 0,
        role: 'button',
        'aria-label': `Editar ${t.descripcion || t.categoria}`,
      }
    : {}
  return (
    <tr
      {...editar}
      className={cn('border-b last:border-b-0', t.editable && 'cursor-pointer hover:bg-muted focus-visible:bg-muted focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring')}
    >
      {columnas.map((c) => {
        const celda = CELDAS[c.col]
        return (
          celda && (
            <td key={c.col} data-label={c.label} className={cn(CELDA, celda.clase, claseOculta(c))}>
              {celda.contenido(t)}
            </td>
          )
        )
      })}
    </tr>
  )
}

interface FilasProps {
  items: FilaTx[] | null
  columnas: ColumnaTransaccion[]
  agrupar: boolean
  textoVacio?: TextoVacio
  onEdit: (id: number) => void
}

export function FilasTx({ items, columnas, agrupar, textoVacio, onEdit }: FilasProps) {
  const span = columnas.length || 1
  const mensaje = (key: string, children: ReactNode) => (
    <tr key={key}>
      <td colSpan={span} className="px-2 py-10 text-center text-sm text-muted-foreground">
        {children}
      </td>
    </tr>
  )
  if (!items) return mensaje('loading', 'Cargando...')
  if (!items.length) return mensaje('empty', textoVacio && <EmptyCard titulo={textoVacio.titulo} texto={textoVacio.texto} className="py-0" />)
  const rows: ReactNode[] = []
  let lastBucket: string | null = null
  items.forEach((t) => {
    if (agrupar && t.grupo !== lastBucket) {
      rows.push(
        <tr key={`g-${t.grupo}-${t.id}`} className="tx-group-row bg-muted">
          <td className="tx-group-label px-2 py-1.5 text-xs font-semibold text-muted-foreground" colSpan={span}>
            {t.grupo}
          </td>
        </tr>,
      )
      lastBucket = t.grupo
    }
    rows.push(<TxRow key={t.id} t={t} columnas={columnas} onEdit={onEdit} />)
  })
  return <>{rows}</>
}
