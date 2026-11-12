import { useEffect } from 'react'
import { cop } from '../../lib/format'
import { calcularProximasOperaciones, diasHasta, podarOcultas, skipOp, textoDias, visibles } from '../../lib/proximasOps'
import { useModal } from '../../shell/ModalProvider'
import { useData } from '../../shell/DataProvider'
import { useOpenerCtx } from '../../shell/openers'
import { openDeudaPayFormById } from '../deudas'
import { openInvYieldFormById } from '../inversiones'
import { openRecurrenteMaterializeFormById } from '../recurrentes'

export function ProximasOperaciones() {
  const { estado, refresh, loaded, loadOk } = useData()
  const { setPendingProxOp } = useModal()
  const ctx = useOpenerCtx()
  const events = loaded ? visibles(calcularProximasOperaciones(estado)) : []

  useEffect(() => {
    if (loadOk) podarOcultas(calcularProximasOperaciones(estado))
  }, [loadOk, estado])

  const materialize = (key: string) => {
    const op = events.find((e) => e.key === key)
    if (!op) return
    setPendingProxOp(key)
    if (op.type === 'deuda') openDeudaPayFormById(ctx, op.sourceId)
    else if (op.type === 'inversion') openInvYieldFormById(ctx, op.sourceId)
    else openRecurrenteMaterializeFormById(ctx, op.sourceId, op.dateISO)
  }

  const skip = (key: string) => {
    skipOp(key)
    refresh()
  }

  if (!loaded) return null

  if (!events.length)
    return (
      <div style={{ fontSize: 'var(--text-base)', color: 'var(--text-muted)', padding: 'var(--sp-4) 0' }}>
        Sin operaciones en los próximos 45 días.
      </div>
    )

  const shown = events.slice(0, 20)
  return (
    <>
      {shown.map((e, i) => {
        const days = diasHasta(e.date)
        const prefix = e.monto >= 0 ? '+' : '−'
        return (
          <div
            key={e.key}
            className="prox-op-row"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: 'var(--sp-4) 0',
              borderBottom: i === shown.length - 1 ? 'none' : '1px solid var(--border)',
              gap: 'var(--sp-3)',
            }}
          >
            <div className="prox-op-main" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-1)', minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: 'var(--text-base)', fontWeight: 600, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {e.label}
              </div>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>{e.sub}</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 'var(--sp-1)', flexShrink: 0 }}>
              <div style={{ fontSize: 'var(--text-base)', fontWeight: 700, color: e.color, whiteSpace: 'nowrap', fontFamily: 'var(--font-mono)' }}>
                {prefix}
                {cop(Math.abs(e.monto))}
              </div>
              <div style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: days < 0 ? 'var(--red)' : 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                {textoDias(days)}
              </div>
            </div>
            <div className="prox-op-actions" style={{ display: 'flex', gap: 'var(--sp-2)', flexShrink: 0, marginLeft: 'var(--sp-3)' }}>
              <button type="button" className="btn btn-dim btn-sm" style={{ color: 'var(--red)' }} onClick={() => skip(e.key)} title="No tomar esta vez">
                ✕
              </button>
              <button type="button" className="btn btn-accent btn-sm" onClick={() => materialize(e.key)} title="Registrar">
                ✓
              </button>
            </div>
          </div>
        )
      })}
    </>
  )
}
