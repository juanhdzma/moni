/// <reference types="node" />
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const css = readFileSync('src/styles/index.css', 'utf8')

function variables(bloque: string): Record<string, string> {
  return Object.fromEntries([...bloque.matchAll(/--([\w-]+):\s*(#[0-9a-f]{6})/gi)].map((m) => [m[1] as string, m[2] as string]))
}

const claro = variables(css.slice(css.indexOf(':root {'), css.indexOf('@media (prefers-color-scheme: dark)')))
const oscuro = { ...claro, ...variables(css.slice(css.indexOf('@media (prefers-color-scheme: dark)'), css.indexOf('@theme inline')) ) }

const luz = (hex: string): number => {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const v = parseInt(hex.slice(i, i + 2), 16) / 255
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
  }) as [number, number, number]
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

const contraste = (a: string, b: string): number => {
  const [claro_, oscuro_] = [luz(a), luz(b)].sort((x, y) => y - x) as [number, number]
  return (claro_ + 0.05) / (oscuro_ + 0.05)
}

describe('--ring (WCAG 1.4.11, 3:1 contra los fondos donde aparece)', () => {
  it.each([
    ['claro', claro],
    ['oscuro', oscuro],
  ])('modo %s', (_modo, v) => {
    for (const fondo of ['background', 'card', 'muted']) {
      expect(contraste(v.ring as string, v[fondo] as string)).toBeGreaterThanOrEqual(3)
    }
  })
})
