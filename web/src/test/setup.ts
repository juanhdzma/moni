import '@testing-library/jest-dom/vitest'

if (Intl.DateTimeFormat().resolvedOptions().timeZone !== 'America/Bogota') {
  throw new Error('Los tests corren con TZ=America/Bogota')
}

// Node >= 25 define un localStorage global propio que tapa el de jsdom.
if (typeof localStorage === 'undefined' || typeof localStorage.clear !== 'function') {
  const store = new Map<string, string>()
  const fake: Storage = {
    get length() {
      return store.size
    },
    clear: () => store.clear(),
    getItem: (k) => store.get(k) ?? null,
    key: (i) => [...store.keys()][i] ?? null,
    removeItem: (k) => void store.delete(k),
    setItem: (k, v) => void store.set(k, String(v)),
  }
  Object.defineProperty(globalThis, 'localStorage', { value: fake, configurable: true })
}

// jsdom no calcula layout: offsetParent siempre es null y el focus trap del modal no vería nada.
Object.defineProperty(HTMLElement.prototype, 'offsetParent', {
  configurable: true,
  get(this: HTMLElement) {
    return this.parentElement
  },
})

// jsdom no trae ResizeObserver y el ResponsiveContainer de Recharts lo usa al montar.
if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
}
