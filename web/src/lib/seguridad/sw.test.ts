import fuente from '../../../public/sw.js?raw'
import { describe, expect, it } from 'vitest'

function cargarSw() {
  const listeners: Record<string, (e: unknown) => void> = {}
  const abiertas: string[] = []
  const self = {
    location: { origin: 'https://moni.test' },
    addEventListener: (n: string, f: (e: unknown) => void) => {
      listeners[n] = f
    },
    clients: { matchAll: () => Promise.resolve([]), openWindow: (u: string) => abiertas.push(u) },
  }
  /* eslint-disable @typescript-eslint/no-implied-eval, @typescript-eslint/no-unsafe-call */
  new Function('self', fuente)(self)
  /* eslint-enable @typescript-eslint/no-implied-eval, @typescript-eslint/no-unsafe-call */
  const click = async (url: string) => {
    let p: Promise<unknown> = Promise.resolve()
    listeners.notificationclick?.({ notification: { close: () => undefined, data: { url } }, waitUntil: (x: Promise<unknown>) => (p = x) })
    await p
  }
  return { abiertas, click }
}

describe('sw notificationclick', () => {
  it('nunca abre otra origin', async () => {
    const { abiertas, click } = cargarSw()
    await click('/\t/evil.com')
    await click('//evil.com')
    await click('/ok?x=1')
    expect(abiertas).toEqual(['https://moni.test/', 'https://moni.test/', 'https://moni.test/ok?x=1'])
  })
})
