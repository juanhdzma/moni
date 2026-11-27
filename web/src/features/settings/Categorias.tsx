import { X } from 'lucide-react'
import { Panel } from '@/components/Panel'
import { claseDeTono } from '@/components/tono'
import { IconButton } from '@/controls/forms/IconButton'
import { useCategorias } from '@/shell/hooks/datos/useCategorias'
import { CategoriaInput } from '@/features/transacciones'
import { useMeta } from '@/shell/hooks/datos/useMeta'
import type { TipoTx } from '@/types'

function CategoriaGroup({ tipo, label, tono }: { tipo: TipoTx; label: string; tono: string }) {
  const { categorias, addCategoria, removeCategoria } = useCategorias()
  const cats = categorias[tipo]

  return (
    <div>
      <div className="mb-2 flex items-center gap-2 text-sm font-medium">
        <span className={`size-2 rounded-full ${claseDeTono(tono).fondo}`} aria-hidden="true"></span>
        {label}
      </div>
      <div className="mb-3 flex flex-wrap gap-1.5">
        {cats.map((c) => (
          <span className="inline-flex items-center gap-1 rounded-full border bg-muted px-2.5 py-0.5 text-xs" key={c.nombre}>
            {c.nombre}
            {c.sistema ? null : (
              <IconButton label={`Eliminar ${c.nombre}`} className="relative size-6 rounded-full after:absolute after:-inset-3 sm:size-5" onClick={() => void removeCategoria(tipo, c.nombre)}>
                <X className="size-3" aria-hidden="true" />
              </IconButton>
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
  const { categorias } = useCategorias()
  const esTipo = (valor: string): valor is TipoTx => valor in categorias
  return (
    <Panel id="settings-categorias-card" titulo="Categorías">
      <div id="settings-categorias" className="grid gap-5 md:grid-cols-3">
        {meta?.tipos_categoria.map(({ value, label, tono }) =>
          esTipo(value) ? <CategoriaGroup key={value} tipo={value} label={label} tono={tono ?? 'neutro'} /> : null,
        )}
      </div>
    </Panel>
  )
}
