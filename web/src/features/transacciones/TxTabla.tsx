import { Monto } from '@/components/monto'
import { cn } from '@/lib/utils'
import { FRANQUICIA_ICONS, fmtDate } from '../../lib/format'
import type { FilaTx } from '../../types'

function PmCell({ t }: { t: FilaTx }) {
  const icon = t.tipo === 'gasto' && t.tarjeta_id ? FRANQUICIA_ICONS[t.tarjeta_franquicia ?? ''] || FRANQUICIA_ICONS.Otra : 'assets/icons/efectivo.svg'
  return (
    <div className="flex items-center gap-2">
      <img src={icon} width="18" height="18" alt="" className="shrink-0" />
      <span title={t.tarjeta_nombre ?? undefined}>{t.metodo_pago}</span>
    </div>
  )
}

const CELDA = 'px-2 py-2 align-middle'

function TxRow({ t, onEdit }: { t: FilaTx; onEdit: (id: number) => void }) {
  const editable =
    t.tipo === 'transfer'
      ? {}
      : {
          onClick: () => onEdit(t.id),
          onKeyDown: (e: React.KeyboardEvent) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              onEdit(t.id)
            }
          },
          tabIndex: 0,
          role: 'button',
          'aria-label': `Editar ${t.descripcion || t.categoria}`,
        }
  return (
    <tr
      {...editable}
      className={cn('border-b last:border-b-0', t.tipo !== 'transfer' && 'cursor-pointer hover:bg-muted focus-visible:bg-muted focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring')}
    >
      <td data-label="Fecha" className={cn(CELDA, 'whitespace-nowrap text-xs text-muted-foreground')}>
        {fmtDate(t.fecha)}
      </td>
      <td data-label="Tipo" className={cn(CELDA, 'hidden text-xs text-muted-foreground sm:table-cell')}>
        {t.tipo_label}
      </td>
      <td data-label="Categoría" className={cn(CELDA, 'hidden sm:table-cell')}>
        {t.categoria}
      </td>
      <td data-label="Descripción" className={cn(CELDA, 'min-w-0 max-w-[14rem] truncate')}>
        <span className="block truncate">{t.descripcion || '—'}</span>
        <span className="block truncate text-xs text-muted-foreground sm:hidden">
          {t.categoria} · {t.tipo_label}
        </span>
        <div className="mt-0.5 text-xs text-muted-foreground md:hidden">
          <PmCell t={t} />
        </div>
      </td>
      <td data-label="Monto" className={cn(CELDA, 'whitespace-nowrap text-right font-semibold', t.tipo === 'ingreso' ? 'text-cartera' : t.tipo === 'transfer' ? 'text-muted-foreground' : 'text-foreground')}>
        <Monto valor={t.monto_firmado} color="ninguno" />
      </td>
      <td data-label="Método de pago" className={cn(CELDA, 'hidden text-xs text-muted-foreground md:table-cell')}>
        <PmCell t={t} />
      </td>
    </tr>
  )
}

const COLS = 6

const mensaje = (key: string, children: React.ReactNode) => (
  <tr key={key}>
    <td colSpan={COLS} className="px-2 py-10 text-center text-sm text-muted-foreground">
      {children}
    </td>
  </tr>
)

interface FilasProps {
  items: FilaTx[] | null
  agrupar: boolean
  onEdit: (id: number) => void
}

export function FilasTx({ items, agrupar, onEdit }: FilasProps) {
  if (!items) return mensaje('loading', 'Cargando...')
  if (!items.length) {
    return mensaje(
      'empty',
      <>
        <div className="font-semibold text-foreground">Sin movimientos</div>
        <div>Agregá un ingreso o gasto con el botón de arriba.</div>
      </>,
    )
  }
  const rows: React.ReactNode[] = []
  let lastBucket: string | null = null
  items.forEach((t) => {
    if (agrupar && t.grupo !== lastBucket) {
      rows.push(
        <tr key={`g-${t.grupo}-${t.id}`} className="tx-group-row bg-muted">
          <td className="tx-group-label px-2 py-1.5 text-xs font-semibold text-muted-foreground" colSpan={COLS}>
            {t.grupo}
          </td>
        </tr>,
      )
      lastBucket = t.grupo
    }
    rows.push(<TxRow key={t.id} t={t} onEdit={onEdit} />)
  })
  return <>{rows}</>
}
