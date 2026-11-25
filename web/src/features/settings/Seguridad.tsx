import { useEffect, useState } from 'react'
import { StatusMessage } from '@/controls/FormStatus'
import { borrarPasskey, cargarPasskeys, cargarSesiones, revocarSesion, type Passkey, type Sesion } from '@/lib/seguridad/auth'
import { nombreDeDispositivo, passkeysDisponibles, registrarPasskey } from '@/lib/seguridad/passkeys'
import { useMeta } from '@/shell/hooks/useMeta'
import { useStatus } from '@/shell/hooks/useStatus'
import { useVista } from '@/shell/hooks/useVista'
import { useAuth } from '@/shell/providers/AuthProvider'
import { useModal } from '@/shell/providers/ModalProvider'
import { ConfirmarClave } from './ConfirmarClave'

interface Cuenta {
  passkeys: Passkey[]
  sesiones: Sesion[]
}

const cargarCuenta = async (): Promise<Cuenta> => {
  const [passkeys, sesiones] = await Promise.all([cargarPasskeys(), cargarSesiones()])
  return { passkeys, sesiones }
}

export function Seguridad() {
  const { salir } = useAuth()
  const { openModal } = useModal()
  const limiteNombre = useMeta()?.limites.nombre
  const [refresco, setRefresco] = useState(0)
  const [disponible, setDisponible] = useState(false)
  const [nombre, setNombre] = useState(nombreDeDispositivo)
  const { cls, msg, ok: estadoOk, err: estadoErr } = useStatus()
  const { data } = useVista(`seguridad:${refresco}`, cargarCuenta, [])
  const [cuenta, setCuenta] = useState<Cuenta | null>(null)
  if (data && data !== cuenta) setCuenta(data)

  useEffect(() => {
    let vigente = true
    void passkeysDisponibles().then((ok) => {
      if (vigente) setDisponible(ok)
    })
    return () => {
      vigente = false
    }
  }, [])

  const correr = async (fn: () => Promise<unknown>, ok: string) => {
    try {
      await fn()
      estadoOk(ok)
      setRefresco((n) => n + 1)
    } catch (err) {
      estadoErr(err)
    }
  }

  const agregar = () => {
    const limpio = nombre.trim()
    if (!limpio) return
    openModal(
      'Agregar passkey',
      <ConfirmarClave
        etiqueta="Agregar passkey"
        descripcion={`Confirmá con tu clave para activar la passkey en «${limpio}».`}
        onConfirmar={async (clave) => {
          await registrarPasskey(limpio, clave)
          estadoOk('Passkey activada en este dispositivo')
          setRefresco((n) => n + 1)
        }}
      />,
    )
  }

  return (
    <div className="space-y-5">
      <section aria-labelledby="seguridad-passkey-titulo">
        <h3 id="seguridad-passkey-titulo" className="mb-2 text-sm font-medium">Passkey</h3>
        {disponible ? (
          <div className="flex gap-2">
            <input
              className="form-input"
              type="text"
              id="seguridad-nombre"
              aria-label="Nombre del dispositivo"
              maxLength={limiteNombre}
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
            />
            <button type="button" className="btn btn-accent btn-sm" onClick={agregar}>
              Agregar passkey
            </button>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">Este dispositivo no soporta passkeys.</p>
        )}
        {cuenta && cuenta.passkeys.length > 0 && (
          <ul className="mt-3 divide-y">
            {cuenta.passkeys.map((p) => (
              <li className="flex items-center justify-between gap-3 py-2" key={p.id}>
                <span className="text-sm">
                  {p.nombre}
                  <span className="ml-2 text-xs text-muted-foreground">Último uso: {p.ultimo_uso_texto}</span>
                </span>
                <button type="button" className="btn btn-dim btn-sm" onClick={() => void correr(() => borrarPasskey(p.id), 'Passkey eliminada')}>
                  Eliminar
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="seguridad-sesiones-titulo">
        <h3 id="seguridad-sesiones-titulo" className="mb-2 text-sm font-medium">Sesiones</h3>
        {cuenta && cuenta.sesiones.length > 0 && (
          <ul className="divide-y">
            {cuenta.sesiones.map((s) => (
              <li className="flex items-center justify-between gap-3 py-2" key={s.id}>
                <span className="min-w-0 text-xs text-muted-foreground">
                  <span className="text-sm text-foreground">{s.actual ? 'Esta sesión' : s.user_agent || 'Sesión'}</span>
                  <br />
                  {s.ip} · {s.metodo} · {s.ultimo_uso_texto}
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
        <button type="button" className="btn btn-danger btn-sm mt-3" onClick={() => void salir().catch((err: unknown) => estadoErr(err))}>
          Cerrar sesión
        </button>
      </section>

      <StatusMessage cls={cls} msg={msg} id="settings-seguridad-status" />
    </div>
  )
}
