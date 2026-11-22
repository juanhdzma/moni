import { useCallback, useMemo } from 'react'
import { apiFetch } from '../lib/api'
import type { CrudEntity, CrudPayloads, WithId } from '../types'
import { useData } from './DataProvider'
import { useModal } from './ModalProvider'

export interface CrudOp {
  <E extends CrudEntity>(entity: E, action: 'add', payload: CrudPayloads[E]): Promise<void>
  <E extends CrudEntity>(entity: E, action: 'update', payload: CrudPayloads[E] & WithId): Promise<void>
  (entity: CrudEntity, action: 'delete', payload: WithId): Promise<void>
}

export interface Mutations {
  crudOp: CrudOp
  crudOpOrBanner: CrudOp
  apiAction: (path: string, payload?: unknown) => Promise<void>
}

export function useMutations(): Mutations {
  const { reload, showBanner } = useData()
  const { closeModal, pendingOpClave } = useModal()

  const crudOp = useCallback(
    async (entity: CrudEntity, action: 'add' | 'update' | 'delete', payload: object) => {
      const base = `/api/${entity}`
      if (action === 'add') {
        const op_clave = entity === 'tx' ? pendingOpClave() : null
        await apiFetch(base, { method: 'POST', body: op_clave ? { ...payload, op_clave } : payload })
      } else if (action === 'update') {
        const { _id, ...body } = payload as WithId
        await apiFetch(`${base}/${_id}`, { method: 'PUT', body })
      } else {
        await apiFetch(`${base}/${(payload as WithId)._id}`, { method: 'DELETE' })
      }
      closeModal()
      await reload()
    },
    [reload, closeModal, pendingOpClave],
  )

  const apiAction = useCallback(
    async (path: string, payload?: unknown) => {
      const op_clave = /\/(pago|rendimiento)$/.test(path) ? pendingOpClave() : null
      const body = op_clave && typeof payload === 'object' && payload !== null ? { ...payload, op_clave } : payload
      await apiFetch(path, { method: 'POST', body })
      closeModal()
      await reload()
    },
    [reload, closeModal, pendingOpClave],
  )

  const crudOpOrBanner = useCallback(
    async (entity: CrudEntity, action: 'add' | 'update' | 'delete', payload: object) => {
      try {
        await crudOp(entity, action, payload)
      } catch (err) {
        await reload()
        showBanner(err instanceof Error ? err.message : String(err))
      }
    },
    [crudOp, showBanner, reload],
  )

  return useMemo(
    () => ({ crudOp, crudOpOrBanner, apiAction }),
    [crudOp, crudOpOrBanner, apiAction],
  )
}
