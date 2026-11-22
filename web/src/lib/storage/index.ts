export function leerStorage(clave: string): string | null {
  try {
    return localStorage.getItem(clave)
  } catch {
    return null
  }
}

export function escribirStorage(clave: string, valor: string): void {
  try {
    localStorage.setItem(clave, valor)
  } catch {
    return
  }
}

export function borrarStorage(clave: string): void {
  try {
    localStorage.removeItem(clave)
  } catch {
    return
  }
}
