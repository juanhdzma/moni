import { apiFetch } from './api'

export const pushSoportado = (): boolean =>
  'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window

function claveABytes(b64: string) {
  const relleno = '='.repeat((4 - (b64.length % 4)) % 4)
  const raw = atob((b64 + relleno).replace(/-/g, '+').replace(/_/g, '/'))
  return Uint8Array.from(raw, (c) => c.charCodeAt(0))
}

export async function suscripcionActual(): Promise<PushSubscription | null> {
  const reg = await navigator.serviceWorker.getRegistration()
  return reg ? reg.pushManager.getSubscription() : null
}

export async function activarPush(): Promise<void> {
  if ((await Notification.requestPermission()) !== 'granted') throw new Error('Permiso de notificaciones denegado')
  await navigator.serviceWorker.register('/sw.js')
  const reg = await navigator.serviceWorker.ready
  const { key } = await apiFetch<{ key: string }>('/api/push/key')
  const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: claveABytes(key) })
  await apiFetch('/api/push/subscribe', { method: 'POST', body: sub.toJSON() })
}

export async function desactivarPush(): Promise<void> {
  const sub = await suscripcionActual()
  if (!sub) return
  await apiFetch('/api/push/unsubscribe', { method: 'POST', body: { endpoint: sub.endpoint } })
  await sub.unsubscribe()
}

export const probarPush = (): Promise<{ enviadas: number }> =>
  apiFetch<{ enviadas: number }>('/api/push/test', { method: 'POST' })
