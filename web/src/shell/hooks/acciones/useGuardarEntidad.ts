import type { CrudEntity, CrudPayloads } from '@/types'
import { useConfirmDelete } from '@/shell/hooks/acciones/useConfirmDelete'
import { useGuardar } from '@/shell/hooks/acciones/useGuardar'
import { useMutations } from '@/shell/hooks/acciones/useMutations'

interface Options<E extends CrudEntity> {
  item: { id: number; nombre?: string } | null
  mensajeEliminar?: string
  conNuevo?: (data: CrudPayloads[E]) => CrudPayloads[E]
}

interface GuardarEntidad<E extends CrudEntity> {
  guardar: (data: CrudPayloads[E]) => Promise<void>
  eliminar: (() => void) | undefined
  esEdicion: boolean
  etiquetaGuardar: (agregar?: string) => string
}

export function useGuardarEntidad<E extends CrudEntity>(entidad: E, { item, mensajeEliminar, conNuevo }: Options<E>): GuardarEntidad<E> {
  const conEstado = useGuardar()
  const { crudOp } = useMutations()
  const eliminar = useConfirmDelete(entidad, item, mensajeEliminar ?? `¿Eliminar "${item?.nombre}"?`)

  const guardar = (data: CrudPayloads[E]) =>
    conEstado(() => (item ? crudOp(entidad, 'update', { ...data, id: item.id }) : crudOp(entidad, 'add', conNuevo ? conNuevo(data) : data)))

  return {
    guardar,
    eliminar,
    esEdicion: item !== null,
    etiquetaGuardar: (agregar = 'Agregar') => (item ? 'Guardar cambios' : agregar),
  }
}
