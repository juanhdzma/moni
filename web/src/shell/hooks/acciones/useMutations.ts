import { useCallback, useMemo } from 'react'
import { actualizarEntidad, borrarEntidad, crearEntidad, type OpcionesMutacion } from '@/lib/api'
import type { CrudEntity, CrudPayloads } from '@/types'
import { useData } from '@/shell/providers/DataProvider'
import { useModal } from '@/shell/providers/ModalProvider'

interface Identificada {
  id: number
}

interface CrudOp {
  <E extends CrudEntity>(entity: E, action: 'add', payload: CrudPayloads[E]): Promise<void>
  <E extends CrudEntity>(entity: E, action: 'update', payload: CrudPayloads[E] & Identificada): Promise<void>
  (entity: CrudEntity, action: 'delete', payload: Identificada): Promise<void>
}

export type Llamada = (opciones: OpcionesMutacion) => Promise<unknown>

interface Mutations {
  crudOp: CrudOp
  crudOpOrBanner: CrudOp
  accion: (llamar: Llamada) => Promise<void>
  accionOrBanner: (llamar: Llamada) => Promise<void>
}

export function useMutations(): Mutations {
  const { mutar, conBanner } = useData()
  const { closeModal, pendingOpClave } = useModal()

  const accion = useCallback(
    async (llamar: Llamada) => {
      const opClave = pendingOpClave()
      await mutar((onAfectadas) => llamar({ onAfectadas, opClave }), closeModal)
    },
    [mutar, closeModal, pendingOpClave],
  )

  const crudOp = useCallback(
    async (entity: CrudEntity, action: 'add' | 'update' | 'delete', payload: object) => {
      await accion((o) => {
        if (action === 'add') return crearEntidad(entity, payload as CrudPayloads[CrudEntity], o)
        const { id, ...body } = payload as Identificada
        return action === 'update' ? actualizarEntidad(entity, id, body as CrudPayloads[CrudEntity], o) : borrarEntidad(entity, id, o)
      })
    },
    [accion],
  )

  const crudOpOrBanner = useCallback(
    async (entity: CrudEntity, action: 'add' | 'update' | 'delete', payload: object) => {
      await conBanner(() => crudOp(entity, action, payload), { recargar: true })
    },
    [crudOp, conBanner],
  )

  const accionOrBanner = useCallback(
    async (llamar: Llamada) => {
      await conBanner(() => accion(llamar), { recargar: true })
    },
    [accion, conBanner],
  )

  return useMemo(() => ({ crudOp, crudOpOrBanner, accion, accionOrBanner }), [crudOp, crudOpOrBanner, accion, accionOrBanner])
}
