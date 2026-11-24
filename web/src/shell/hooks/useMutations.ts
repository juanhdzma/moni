import { useCallback, useMemo } from 'react'
import { apiFetch } from '@/lib/api'
import type { CrudEntity, CrudPayloads } from '@/types'
import { entidadesAfectadasPor, entidadesAfectadasPorRuta } from '@/shell/invalidacion'
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

export function useMutations(): Mutations {
  const { reload, conBanner } = useData()
  const { closeModal, pendingOpClave } = useModal()

  const crudOp = useCallback(
    async (entity: CrudEntity, action: 'add' | 'update' | 'delete', payload: object) => {
      const base = `/api/${entity}`
      let op_clave: string | null = null
      if (action === 'add') {
        op_clave = entity === 'tx' ? pendingOpClave() : null
        await apiFetch(base, { method: 'POST', body: op_clave ? { ...payload, op_clave } : payload })
      } else if (action === 'update') {
        const { id, ...body } = payload as Identificada
        await apiFetch(`${base}/${id}`, { method: 'PUT', body })
      } else {
        await apiFetch(`${base}/${(payload as Identificada).id}`, { method: 'DELETE' })
      }
      closeModal()
      await reload(entidadesAfectadasPor(entity, action, payload, op_clave))
    },
    [reload, closeModal, pendingOpClave],
  )

  const apiAction = useCallback(
    async (path: string, payload?: unknown) => {
      const op_clave = /\/(pago|rendimiento)$/.test(path) ? pendingOpClave() : null
      const body = op_clave && typeof payload === 'object' && payload !== null ? { ...payload, op_clave } : payload
      await apiFetch(path, { method: 'POST', body })
      closeModal()
      await reload(entidadesAfectadasPorRuta(path, payload, op_clave))
    },
    [reload, closeModal, pendingOpClave],
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
