import {
  browserSupportsWebAuthn,
  platformAuthenticatorIsAvailable,
  startAuthentication,
  startRegistration,
  type PublicKeyCredentialCreationOptionsJSON,
  type PublicKeyCredentialRequestOptionsJSON,
} from '@simplewebauthn/browser'
import { apiFetch } from '@/lib/api'
import { escribirStorage, leerStorage } from '@/lib/storage'

const CLAVE_DISPOSITIVO = 'moni_faceid_dispositivo'
const CLAVE_OFERTA = 'moni_faceid_oferta'

export function esCancelacion(err: unknown): boolean {
  if (!(err instanceof Error)) return false
  const code = (err as { code?: unknown }).code
  return err.name === 'NotAllowedError' || err.name === 'AbortError' || code === 'ERROR_CEREMONY_ABORTED'
}

export const dispositivoTienePasskey = (): boolean => leerStorage(CLAVE_DISPOSITIVO) === '1'

export const ofertaYaMostrada = (): boolean => leerStorage(CLAVE_OFERTA) === '1'
export const marcarOfertaMostrada = (): void => escribirStorage(CLAVE_OFERTA, '1')

export async function passkeysDisponibles(): Promise<boolean> {
  try {
    return browserSupportsWebAuthn() && (await platformAuthenticatorIsAvailable())
  } catch {
    return false
  }
}

export function nombreDeDispositivo(): string {
  const ua = navigator.userAgent
  if (/iPhone/.test(ua)) return 'iPhone'
  if (/iPad/.test(ua)) return 'iPad'
  if (/Android/.test(ua)) return 'Android'
  if (/Macintosh/.test(ua)) return 'Mac'
  if (/Windows/.test(ua)) return 'Windows'
  return 'Este dispositivo'
}

export async function loginConPasskey(): Promise<void> {
  const optionsJSON = await apiFetch<PublicKeyCredentialRequestOptionsJSON>('/api/auth/passkey/login/opciones', { method: 'POST' })
  const credencial = await startAuthentication({ optionsJSON })
  await apiFetch<{ ok: boolean }>('/api/auth/passkey/login/verificar', { method: 'POST', body: credencial })
}

export async function registrarPasskey(nombre: string, clave: string): Promise<number> {
  const optionsJSON = await apiFetch<PublicKeyCredentialCreationOptionsJSON>('/api/auth/passkey/registro/opciones', {
    method: 'POST',
    body: { clave },
  })
  const credencial = await startRegistration({ optionsJSON })
  const { id } = await apiFetch<{ ok: boolean; id: number }>('/api/auth/passkey/registro/verificar', {
    method: 'POST',
    body: { ...credencial, nombre },
  })
  escribirStorage(CLAVE_DISPOSITIVO, '1')
  return id
}
