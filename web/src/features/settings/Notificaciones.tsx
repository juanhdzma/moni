import { useEffect, useState } from 'react'
import { StatusMessage } from '../../controls/FormStatus'
import { Hint } from '../../controls/Hint'
import { useMeta } from '@/shell/hooks/useMeta'
import { useStatus } from '@/shell/hooks/useStatus'
import { activarPush, desactivarPush, probarPush, pushSoportado, suscripcionActual } from '../../lib/seguridad/push'

export function Notificaciones() {
  const soportado = pushSoportado()
  const [activas, setActivas] = useState(false)
  const meta = useMeta()
  const status = useStatus()

  useEffect(() => {
    if (!soportado) return
    void suscripcionActual().then((s) => setActivas(s !== null))
  }, [soportado])

  const correr = async (fn: () => Promise<unknown>, ok: string, activasDespues?: boolean) => {
    try {
      await fn()
      if (activasDespues !== undefined) setActivas(activasDespues)
      status.ok(ok)
    } catch (err) {
      status.err(err)
    }
  }

  if (!soportado) {
    return (
      <Hint className="mt-2">
        Este navegador no soporta notificaciones. En iPhone agregá Moni a la pantalla de inicio (Compartir, Agregar a inicio) y abrila desde ahí.
      </Hint>
    )
  }

  return (
    <>
      <div className="mb-3 text-sm text-muted-foreground">
        {meta?.push.frase}
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
      <StatusMessage cls={status.cls} msg={status.msg} id="settings-notificaciones-status" />
    </>
  )
}
