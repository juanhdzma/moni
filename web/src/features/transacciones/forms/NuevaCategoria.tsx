import { Plus } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import type { TipoRec } from '../../../types'
import { CategoriaInput } from './CategoriaInput'
import { useCategorias } from '@/shell/hooks/useCategorias'

interface Props {
  tipo: TipoRec
  onCreada: (nombre: string) => void
  children: ReactNode
}

export function NuevaCategoria({ tipo, onCreada, children }: Props) {
  const { addCategoria } = useCategorias()
  const [abierta, setAbierta] = useState(false)

  const guardar = (nombre: string) => {
    void addCategoria(tipo, nombre).then((ok) => {
      if (ok) onCreada(nombre)
    })
    setAbierta(false)
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
          <CategoriaInput id="new-cat-name" etiqueta="Ok" autoFocus botonClassName="btn-accent btn-sm" onAgregar={guardar} />
        </div>
      )}
    </>
  )
}
