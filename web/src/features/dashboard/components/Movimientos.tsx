import { cargarMovimientos } from '@/lib/api'
import { fmtDateShort } from '@/lib/format'
import { cn } from '@/lib/utils'
import { useVista } from '@/shell/hooks/useVista'
import { DEPENDENCIAS_DE_VISTA } from '@/shell/invalidacion'
import { Monto } from '@/components/monto'
import { Panel } from '@/components/panel'

export function Movimientos() {
  const { data } = useVista('movimientos', () => cargarMovimientos(), DEPENDENCIAS_DE_VISTA.movimientos)
  const recent = data?.items ?? []
  return (
    <Panel id="dash-movimientos" titulo="Últimos movimientos">
      {data === null ? null : recent.length ? (
        <ul id="recent-list" className="divide-y">
          {recent.map((t) => (
            <li key={t.id} className="recent-item flex items-baseline gap-3 py-2 text-sm">
              <span className="w-[4.5rem] shrink-0 whitespace-nowrap text-xs text-muted-foreground">{fmtDateShort(t.fecha)}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate">{t.descripcion || t.categoria}</span>
                <span className="block truncate text-xs text-muted-foreground">{t.categoria}</span>
              </span>
              <span
                className={cn('recent-amount shrink-0 font-semibold', t.tipo === 'gasto' && 'text-foreground', t.tipo === 'transfer' && 'text-muted-foreground')}
                data-tipo={t.tipo}
              >
                <Monto valor={t.tipo === 'ingreso' ? t.monto : -t.monto} color={t.tipo === 'ingreso' ? 'siempre' : 'ninguno'} />
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="py-3 text-sm text-muted-foreground">Sin transacciones</p>
      )}
    </Panel>
  )
}
