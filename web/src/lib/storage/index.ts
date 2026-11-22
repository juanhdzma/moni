function enStorage<T>(accion: (storage: Storage) => T, porDefecto: T): T {
  try {
    return accion(localStorage)
  } catch {
    return porDefecto
  }
}

export const leerStorage = (clave: string): string | null => enStorage((s) => s.getItem(clave), null)
export const escribirStorage = (clave: string, valor: string): void => enStorage((s) => s.setItem(clave, valor), undefined)
export const borrarStorage = (clave: string): void => enStorage((s) => s.removeItem(clave), undefined)
