import { Plus } from 'lucide-react'
import { useState } from 'react'
import { DatePicker } from '../../controls/DatePicker'
import { FormStatus } from '../../controls/FormStatus'
import { MoneyInput } from '../../controls/MoneyInput'
import { Select } from '../../controls/Select'
import { nowStr, normDate, numToInput, parseMoney } from '../../lib/format'
import { useCategorias } from '../../shell/CategoriasProvider'
import { useData } from '../../shell/DataProvider'
import { useModal } from '../../shell/ModalProvider'
import type { OpenerCtx } from '../../shell/openers'
import { useMutations } from '../../shell/useMutations'
import type { Transaccion } from '../../types'

const SIN_CATEGORIAS = 'Sin categorías — agregá una con +'

function initialFecha(tx: Transaccion | null): string {
  if (!tx) return nowStr()
  const f = normDate(tx.fecha)
  if (/^\d{4}-\d{2}-\d{2}$/.test(f)) return `${f}T00:00`
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(f) ? f : ''
}

function TxForm({ tx }: { tx: Transaccion | null }) {
  const { estado, showBanner } = useData()
  const { categorias, addCategoria } = useCategorias()
  const { setModalStatus, closeModal } = useModal()
  const { crudOp } = useMutations()
  const isEdit = tx !== null
  const tarjetas = estado.deudas.filter((d) => d.es_tarjeta)

  const [tipo, setTipo] = useState<'ingreso' | 'gasto'>(tx?.tipo === 'ingreso' ? 'ingreso' : 'gasto')
  const [categoria, setCategoria] = useState(() => {
    const cats = categorias[tx?.tipo === 'ingreso' ? 'ingreso' : 'gasto'] || []
    return tx?.categoria || (cats[0] ?? '')
  })
  const [newCatOpen, setNewCatOpen] = useState(false)
  const [newCat, setNewCat] = useState('')
  const [descripcion, setDescripcion] = useState(tx?.descripcion || '')
  const [monto, setMonto] = useState(tx ? numToInput(tx.monto) : '')
  const [tarjeta, setTarjeta] = useState(() =>
    tx?.tarjeta_id != null && tarjetas.some((d) => d._id === tx.tarjeta_id) ? String(tx.tarjeta_id) : '',
  )
  const [fecha, setFecha] = useState(() => initialFecha(tx))
  const [notas, setNotas] = useState(tx?.notas || '')

  const baseCats = categorias[tipo] || []
  const tipoOriginal = tx?.tipo === 'ingreso' ? 'ingreso' : 'gasto'
  const cats = tx?.categoria && tipo === tipoOriginal && !baseCats.includes(tx.categoria) ? [...baseCats, tx.categoria] : baseCats

  const changeTipo = (t: 'ingreso' | 'gasto') => {
    setTipo(t)
    setCategoria((categorias[t] || [])[0] ?? '')
    setNewCatOpen(false)
  }

  const saveNewCat = () => {
    const nombre = newCat.trim()
    if (!nombre) return
    if (addCategoria(tipo, nombre)) setCategoria(nombre)
    setNewCatOpen(false)
    setNewCat('')
  }

  const save = async () => {
    const montoNum = parseMoney(monto)
    const tarjeta_id = tipo === 'gasto' && tarjeta ? Number(tarjeta) : null

    if (!categoria) {
      setModalStatus('err', 'Agregá una categoría con el botón +')
      return
    }
    if (!montoNum || montoNum <= 0) {
      setModalStatus('err', 'Ingresá un monto válido')
      return
    }
    if (!fecha) {
      setModalStatus('err', 'Fecha requerida')
      return
    }

    const data = {
      fecha: fecha.includes('T') ? fecha : `${fecha}T00:00`,
      tipo,
      categoria,
      descripcion: descripcion.trim(),
      monto: montoNum,
      notas: notas.trim(),
      tarjeta_id,
    }

    setModalStatus('', 'Guardando...')
    try {
      if (tx) await crudOp('tx', 'update', { ...data, _id: tx._id })
      else await crudOp('tx', 'add', data)
    } catch (err) {
      setModalStatus('err', (err instanceof Error ? err.message : String(err)))
    }
  }

  const remove = async () => {
    if (!tx || !confirm('¿Eliminar este movimiento?')) return
    try {
      await crudOp('tx', 'delete', { _id: tx._id })
    } catch (err) {
      showBanner(err instanceof Error ? err.message : String(err))
    }
  }

  return (
    <>
      <div className="form-group">
        <div className="form-label" id="lbl-grp-1">Tipo</div>
        <div className="tipo-toggle" role="group" aria-labelledby="lbl-grp-1">
          <button type="button" className={'tipo-btn ingreso' + (tipo === 'ingreso' ? ' sel' : '')} onClick={() => changeTipo('ingreso')}>
            Ingreso
          </button>
          <button type="button" className={'tipo-btn gasto' + (tipo === 'gasto' ? ' sel' : '')} onClick={() => changeTipo('gasto')}>
            Gasto
          </button>
        </div>
      </div>
      <div className="form-group">
        <label className="form-label" htmlFor="m-cat">Categoría</label>
        <div className="flex items-center gap-2">
          <Select
            id="m-cat"
            style={{ flex: 1 }}
            value={categoria}
            onChange={setCategoria}
            ariaLabel="Categoría"
            options={cats.length ? cats.map((c) => ({ value: c, label: c })) : [{ value: '', label: SIN_CATEGORIAS }]}
          />
          <button
            type="button"
            className="btn btn-dim btn-sm shrink-0"
            title="Agregar categoría"
            aria-label="Agregar categoría"
            onClick={() => setNewCatOpen((o) => !o)}
          >
            <Plus className="size-4" aria-hidden="true" />
          </button>
        </div>
        {newCatOpen && (
          <div id="new-cat-wrap" className="mt-2">
            <div className="flex gap-2">
              <input
                className="form-input"
                type="text"
                id="new-cat-name"
                maxLength={25}
                placeholder="Nueva categoría"
                autoFocus
                value={newCat}
                onChange={(e) => setNewCat(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') saveNewCat()
                }}
              />
              <button type="button" className="btn btn-accent btn-sm" onClick={saveNewCat}>
                Ok
              </button>
            </div>
          </div>
        )}
      </div>
      <div className="form-group">
        <label className="form-label" htmlFor="m-desc">Descripción</label>
        <input
          className="form-input"
          type="text"
          id="m-desc"
          maxLength={30}
          value={descripcion}
          placeholder="Ej. Mercado Éxito"
          onChange={(e) => setDescripcion(e.target.value)}
        />
      </div>
      <div className="form-group">
        <label className="form-label" htmlFor="m-monto">Monto (COP)</label>
        <MoneyInput id="m-monto" value={monto} onChange={setMonto} ariaLabel="Monto (COP)" />
      </div>
      {tipo === 'gasto' && (
        <div className="form-group" id="wrap-tarjeta">
          <label className="form-label" htmlFor="m-tarjeta">Pagado con</label>
          <Select
            id="m-tarjeta"
            value={tarjeta}
            onChange={setTarjeta}
            ariaLabel="Pagado con"
            options={[{ value: '', label: 'Efectivo / Débito' }, ...tarjetas.map((d) => ({ value: String(d._id), label: d.nombre }))]}
          />
        </div>
      )}
      <div className="form-group">
        <label className="form-label" htmlFor="m-fecha">Fecha</label>
        <DatePicker id="m-fecha" type="datetime-local" value={fecha} onChange={setFecha} />
      </div>
      <div className="form-group">
        <label
          className="form-label normal-case tracking-normal"
          htmlFor="m-notas"
        >
          Notas (opcional)
        </label>
        <input
          className="form-input"
          type="text"
          id="m-notas"
          maxLength={30}
          value={notas}
          placeholder="Notas adicionales"
          onChange={(e) => setNotas(e.target.value)}
        />
      </div>
      <div className="modal-footer">
        <button type="button" className="btn btn-accent" onClick={() => void save()}>
          {isEdit ? 'Guardar cambios' : 'Agregar'}
        </button>
        {isEdit && (
          <button type="button" className="btn btn-danger" onClick={() => void remove()}>
            Eliminar
          </button>
        )}
        <button type="button" className="btn btn-dim ml-auto" onClick={closeModal}>
          Cancelar
        </button>
      </div>
      <FormStatus />
    </>
  )
}

export function openTxForm(ctx: OpenerCtx, tx: Transaccion | null = null): void {
  if (tx?.tipo === 'transfer') return
  ctx.openModal(tx ? 'Editar movimiento' : 'Nuevo movimiento', <TxForm tx={tx} />)
}

export function openTxFormById(ctx: OpenerCtx, id: number): void {
  openTxForm(ctx, ctx.estado.transacciones.find((t) => t._id === id) ?? null)
}
