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
  const { closeModal, resolvePendingProxOp } = useModal()

  const crudOp = useCallback(
    async (entity: CrudEntity, action: 'add' | 'update' | 'delete', payload: object) => {
      const base = `/api/${entity}`
      if (action === 'add') {
        await apiFetch(base, { method: 'POST', body: payload })
      } else if (action === 'update') {
        const { _id, ...body } = payload as WithId
        await apiFetch(`${base}/${_id}`, { method: 'PUT', body })
      } else {
        await apiFetch(`${base}/${(payload as WithId)._id}`, { method: 'DELETE' })
      }
      resolvePendingProxOp()
      closeModal()
      await reload()
    },
    [reload, closeModal, resolvePendingProxOp],
  )

  const apiAction = useCallback(
    async (path: string, payload?: unknown) => {
      await apiFetch(path, { method: 'POST', body: payload })
      resolvePendingProxOp()
      closeModal()
      await reload()
    },
    [reload, closeModal, resolvePendingProxOp],
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
