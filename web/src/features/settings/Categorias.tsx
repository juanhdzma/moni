import { X } from 'lucide-react'
import { Panel } from '@/components/panel'
import { useCategorias } from '@/shell/hooks/useCategorias'
import { CategoriaInput } from '../transacciones'
import { useMeta } from '@/shell/hooks/useMeta'
import type { TipoTx } from '../../types'

const DOT: Record<TipoTx, string> = { ingreso: 'bg-inversiones', gasto: 'bg-deudas', transfer: 'bg-muted-foreground' }

function CategoriaGroup({ tipo, label }: { tipo: TipoTx; label: string }) {
  const { categorias, addCategoria, removeCategoria } = useCategorias()
  const cats = categorias[tipo]


  return (
    <div>
      <div className="mb-2 flex items-center gap-2 text-sm font-medium">
        <span className={`size-2 rounded-full ${DOT[tipo]}`}></span>
        {label}
      </div>
      <div className="mb-3 flex flex-wrap gap-1.5">
        {cats.map((c) => (
          <span className="inline-flex items-center gap-1 rounded-full border bg-muted px-2.5 py-0.5 text-xs" key={c.nombre}>
            {c.nombre}
            {c.sistema ? null : (
              <button type="button" className="rounded-full p-0.5 text-muted-foreground hover:text-foreground" onClick={() => void removeCategoria(tipo, c.nombre)} aria-label={`Eliminar ${c.nombre}`}>
                <X className="size-3" aria-hidden="true" />
              </button>
            )}
          </span>
        ))}
        {!cats.length && <span className="text-xs text-muted-foreground">Sin categorías todavía</span>}
      </div>
      <CategoriaInput id={`settings-new-cat-${tipo}`} etiqueta="Agregar" onAgregar={(nombre) => void addCategoria(tipo, nombre)} />
    </div>
  )
}

export function Categorias() {
  const meta = useMeta()
  return (
    <Panel id="settings-categorias-card" titulo="Categorías">
      <div id="settings-categorias" className="grid gap-5 md:grid-cols-3">
        {meta?.tipos_categoria.map(({ value, label }) => (
          <CategoriaGroup key={value} tipo={value} label={label} />
        ))}
      </div>
    </Panel>
  )
}
