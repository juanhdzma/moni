import { useEffect, useState } from 'react'
import { activarPush, desactivarPush, probarPush, pushSoportado, suscripcionActual } from '../../lib/push'

const HINT = 'mt-2 text-xs text-muted-foreground'

const errMsg = (e: unknown): string => (e instanceof Error ? e.message : String(e))

export function Notificaciones() {
  const soportado = pushSoportado()
  const [activas, setActivas] = useState(false)
  const [status, setStatus] = useState({ cls: 'form-status', msg: '' })

  useEffect(() => {
    if (!soportado) return
    void suscripcionActual().then((s) => setActivas(s !== null))
  }, [soportado])

  const correr = async (fn: () => Promise<unknown>, ok: string, activasDespues?: boolean) => {
    try {
      await fn()
      if (activasDespues !== undefined) setActivas(activasDespues)
      setStatus({ cls: 'form-status ok', msg: ok })
    } catch (err) {
      setStatus({ cls: 'form-status err', msg: errMsg(err) })
    }
  }

  if (!soportado) {
    return (
      <div className={HINT}>
        Este navegador no soporta notificaciones. En iPhone agregá Moni a la pantalla de inicio (Compartir, Agregar a inicio) y abrila desde ahí.
      </div>
    )
  }

  return (
    <>
      <div className="mb-3 text-sm text-muted-foreground">
        Aviso diario a las 8:00 de las cuotas, rendimientos y recurrentes que vencen hoy o mañana.
      </div>
      <div className="mb-3 text-xs text-muted-foreground">
        Cómo funciona: al activarlo, este dispositivo se suscribe al servidor de Moni y recibe los avisos aunque la app esté cerrada. Al tocar un aviso se abre Moni en la sección correspondiente. Podés desactivarlo cuando quieras y cada dispositivo se activa por separado.
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {activas ? (
          <>
            <button type="button" className="btn btn-dim btn-sm" onClick={() => void correr(desactivarPush, 'Notificaciones desactivadas', false)}>
              Desactivar
            </button>
            <button type="button" className="btn btn-dim btn-sm" onClick={() => void correr(probarPush, 'Notificación enviada')}>
              Enviar prueba
            </button>
          </>
        ) : (
          <button type="button" className="btn btn-accent btn-sm" onClick={() => void correr(activarPush, 'Notificaciones activadas', true)}>
            Activar en este dispositivo
          </button>
        )}
      </div>
      <div className={status.cls} id="settings-notificaciones-status" role={status.cls.includes('err') ? 'alert' : undefined}>
        {status.msg}
      </div>
    </>
  )
}
