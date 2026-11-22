import { Plus } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { useCategorias } from '@/shell/providers/CategoriasProvider'

interface Props {
  tipo: 'ingreso' | 'gasto'
  onCreada: (nombre: string) => void
  children: ReactNode
}

export function NuevaCategoria({ tipo, onCreada, children }: Props) {
  const { addCategoria } = useCategorias()
  const [abierta, setAbierta] = useState(false)
  const [nombre, setNombre] = useState('')

  const guardar = () => {
    const limpio = nombre.trim()
    if (!limpio) return
    void addCategoria(tipo, limpio).then((ok) => {
      if (ok) onCreada(limpio)
    })
    setAbierta(false)
    setNombre('')
  }

  return (
    <>
      <div className="flex items-center gap-2">
        {children}
        <button type="button" className="btn btn-dim btn-sm shrink-0" title="Agregar categoría" aria-label="Agregar categoría" onClick={() => setAbierta((o) => !o)}>
          <Plus className="size-4" aria-hidden="true" />
        </button>
      </div>
      {abierta && (
        <div id="new-cat-wrap" className="mt-2">
          <div className="flex gap-2">
            <input
              className="form-input"
              type="text"
              id="new-cat-name"
              maxLength={25}
              placeholder="Nueva categoría"
              autoFocus
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') guardar()
              }}
            />
            <button type="button" className="btn btn-accent btn-sm" onClick={guardar}>
              Ok
            </button>
          </div>
        </div>
      )}
    </>
  )
}
