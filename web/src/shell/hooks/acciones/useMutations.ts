import { useCallback, useMemo } from 'react'
import { apiFetch } from '@/lib/api'
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

interface Mutations {
  crudOp: CrudOp
  crudOpOrBanner: CrudOp
  apiAction: (path: string, payload?: unknown) => Promise<void>
  apiActionOrBanner: (path: string, payload?: unknown) => Promise<void>
}

const conOpClave = (payload: unknown, op_clave: string | null): unknown =>
  op_clave && typeof payload === 'object' && payload !== null ? { ...payload, op_clave } : payload

export function useMutations(): Mutations {
  const { mutar, conBanner } = useData()
  const { closeModal, pendingOpClave } = useModal()

  const crudOp = useCallback(
    async (entity: CrudEntity, action: 'add' | 'update' | 'delete', payload: object) => {
      const base = `/api/${entity}`
      await mutar((onAfectadas) => {
        if (action === 'add') return apiFetch(base, { method: 'POST', body: conOpClave(payload, pendingOpClave()), onAfectadas })
        const { id, ...body } = payload as Identificada
        const url = `${base}/${id}`
        return action === 'update' ? apiFetch(url, { method: 'PUT', body, onAfectadas }) : apiFetch(url, { method: 'DELETE', onAfectadas })
      }, closeModal)
    },
    [mutar, closeModal, pendingOpClave],
  )

  const apiAction = useCallback(
    async (path: string, payload?: unknown) => {
      const body = conOpClave(payload, pendingOpClave())
      await mutar((onAfectadas) => apiFetch(path, { method: 'POST', body, onAfectadas }), closeModal)
    },
    [mutar, closeModal, pendingOpClave],
  )

  const crudOpOrBanner = useCallback(
    async (entity: CrudEntity, action: 'add' | 'update' | 'delete', payload: object) => {
      await conBanner(() => crudOp(entity, action, payload), { recargar: true })
    },
    [crudOp, conBanner],
  )

  const apiActionOrBanner = useCallback(
    async (path: string, payload?: unknown) => {
      await conBanner(() => apiAction(path, payload), { recargar: true })
    },
    [apiAction, conBanner],
  )

  return useMemo(
    () => ({ crudOp, crudOpOrBanner, apiAction, apiActionOrBanner }),
    [crudOp, crudOpOrBanner, apiAction, apiActionOrBanner],
  )
}
