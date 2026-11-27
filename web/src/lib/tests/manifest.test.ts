import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

interface Icono {
  src: string
  sizes: string
  purpose?: string
}

const PUBLIC = resolve(__dirname, '../../../public')
const manifest = JSON.parse(readFileSync(resolve(PUBLIC, 'manifest.webmanifest'), 'utf8')) as { icons: Icono[] }

describe('manifest.webmanifest', () => {
  it('trae los PNG 192 y 512 y uno maskable para instalar como PWA', () => {
    const png = manifest.icons.filter((i) => i.src.endsWith('.png'))
    expect(png.map((i) => i.sizes)).toEqual(expect.arrayContaining(['192x192', '512x512']))
    expect(manifest.icons.some((i) => i.purpose === 'maskable' && i.sizes === '512x512')).toBe(true)
  })

  it('todos los iconos existen en public', () => {
    for (const { src } of manifest.icons) expect(() => readFileSync(resolve(PUBLIC, src.slice(1)))).not.toThrow()
  })
})
