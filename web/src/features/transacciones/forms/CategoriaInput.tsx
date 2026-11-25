import { useState } from 'react'
import { useMeta } from '@/shell/hooks/datos/useMeta'
import { cn } from '@/lib/utils'

interface Props {
  id: string
  etiqueta: string
  onAgregar: (nombre: string) => void
  autoFocus?: boolean
  botonClassName?: string
}

export function CategoriaInput({ id, etiqueta, onAgregar, autoFocus, botonClassName }: Props) {
  const meta = useMeta()
  const [nombre, setNombre] = useState('')

  const agregar = () => {
    const limpio = nombre.trim()
    if (!limpio) return
    onAgregar(limpio)
    setNombre('')
  }

  return (
    <div className="flex gap-2">
      <input
        className="form-input"
        type="text"
        id={id}
        maxLength={meta?.categoria_largo_max}
        placeholder="Nueva categoría"
        autoFocus={autoFocus}
        value={nombre}
        onChange={(e) => setNombre(e.target.value)}
        onKeyDown={(e) => {
          if (e.key !== 'Enter') return
          e.preventDefault()
          agregar()
        }}
      />
      <button type="button" className={cn('btn btn-dim', botonClassName)} onClick={agregar}>
        {etiqueta}
      </button>
    </div>
  )
}
