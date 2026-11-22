import { useCallback, useEffect, useState } from 'react'
import { borrarPasskey, cargarPasskeys, cargarSesiones, revocarSesion, type Passkey, type Sesion } from '../../lib/seguridad/auth'
import { errMsg } from '../../lib/format'
import { nombreDeDispositivo, passkeysDisponibles, registrarPasskey } from '../../lib/seguridad/passkeys'
import { useAuth } from '@/shell/providers/AuthProvider'

const fechaCorta = (iso: string | null): string => (iso ? iso.slice(0, 16).replace('T', ' ') : 'nunca')

export function Seguridad() {
  const { salir } = useAuth()
  const [passkeys, setPasskeys] = useState<Passkey[] | null>(null)
  const [sesiones, setSesiones] = useState<Sesion[] | null>(null)
  const [disponible, setDisponible] = useState(false)
  const [nombre, setNombre] = useState(nombreDeDispositivo)
  const [status, setStatus] = useState({ cls: 'form-status', msg: '' })

  const cargar = useCallback(async () => {
    try {
      const [p, s] = await Promise.all([cargarPasskeys(), cargarSesiones()])
      setPasskeys(p)
      setSesiones(s)
    } catch (err) {
      setStatus({ cls: 'form-status err', msg: errMsg(err) })
    }
  }, [])

  useEffect(() => {
    void Promise.resolve().then(cargar)
    let vigente = true
    void passkeysDisponibles().then((ok) => {
      if (vigente) setDisponible(ok)
    })
    return () => {
      vigente = false
    }
  }, [cargar])

  const correr = async (fn: () => Promise<unknown>, ok: string) => {
    try {
      await fn()
      setStatus({ cls: 'form-status ok', msg: ok })
      await cargar()
    } catch (err) {
      setStatus({ cls: 'form-status err', msg: errMsg(err) })
    }
  }

  const agregar = () => {
    const limpio = nombre.trim()
    if (!limpio) return
    void correr(() => registrarPasskey(limpio), 'Face ID activado en este dispositivo')
  }

  return (
    <div className="space-y-5">
      <section aria-labelledby="seguridad-faceid-titulo">
        <h3 id="seguridad-faceid-titulo" className="mb-2 text-sm font-medium">Face ID</h3>
        {disponible ? (
          <div className="flex gap-2">
            <input
              className="form-input"
              type="text"
              id="seguridad-nombre"
              aria-label="Nombre del dispositivo"
              maxLength={40}
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
            />
            <button type="button" className="btn btn-accent btn-sm" onClick={agregar}>
              Agregar Face ID
            </button>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">Este dispositivo no soporta Face ID ni passkeys.</p>
        )}
        {passkeys && passkeys.length > 0 && (
          <ul className="mt-3 divide-y">
            {passkeys.map((p) => (
              <li className="flex items-center justify-between gap-3 py-2" key={p.id}>
                <span className="text-sm">
                  {p.nombre}
                  <span className="ml-2 text-xs text-muted-foreground">Último uso: {fechaCorta(p.ultimo_uso)}</span>
                </span>
                <button type="button" className="btn btn-dim btn-sm" onClick={() => void correr(() => borrarPasskey(p.id), 'Face ID eliminado')}>
                  Eliminar
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="seguridad-sesiones-titulo">
        <h3 id="seguridad-sesiones-titulo" className="mb-2 text-sm font-medium">Sesiones</h3>
        {sesiones && sesiones.length > 0 && (
          <ul className="divide-y">
            {sesiones.map((s) => (
              <li className="flex items-center justify-between gap-3 py-2" key={s.id}>
                <span className="min-w-0 text-xs text-muted-foreground">
                  <span className="text-sm text-foreground">{s.actual ? 'Esta sesión' : s.user_agent || 'Sesión'}</span>
                  <br />
                  {s.ip} · {s.metodo} · {fechaCorta(s.ultimo_uso)}
                </span>
                {!s.actual && (
                  <button type="button" className="btn btn-dim btn-sm" onClick={() => void correr(() => revocarSesion(s.id), 'Sesión revocada')}>
                    Revocar
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
        <button type="button" className="btn btn-danger btn-sm mt-3" onClick={() => void salir().catch((err: unknown) => setStatus({ cls: 'form-status err', msg: errMsg(err) }))}>
          Cerrar sesión
        </button>
      </section>

      <div className={status.cls} id="settings-seguridad-status" role={status.cls.includes('err') ? 'alert' : undefined}>
        {status.msg}
      </div>
    </div>
  )
}
