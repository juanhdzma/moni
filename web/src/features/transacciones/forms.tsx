import { Plus } from 'lucide-react'
import { useState } from 'react'
import { FormFooter } from '../../controls/FormFooter'
import { MoneyInput } from '../../controls/MoneyInput'
import { Select } from '../../controls/Select'
import { cargarOpcionesTx } from '../../lib/api/transacciones'
import { numToInput, parseMoney } from '../../lib/format'
import { useCategorias } from '@/shell/providers/CategoriasProvider'
import { useVista } from '@/shell/hooks/useVista'
import type { OpenerCtx } from '@/shell/hooks/openers'
import { useMutations } from '@/shell/hooks/useMutations'
import type { OpcionesTx, Transaccion } from '../../types'
import { useGuardar } from '@/shell/hooks/useGuardar'
import { FechaField, NotasField } from '../../controls/FormFields'

const SIN_CATEGORIAS = 'Sin categorías — agregá una con +'

function TxForm({ tx }: { tx: Transaccion | null }) {
  const { data: opciones } = useVista(`tx-opciones:${tx?._id ?? 'nuevo'}`, () => cargarOpcionesTx(tx?._id))
  if (!opciones) return <p className="py-6 text-center text-sm text-muted-foreground">Cargando...</p>
  return <TxFormCampos tx={tx} opciones={opciones} />
}

function TxFormCampos({ tx, opciones }: { tx: Transaccion | null; opciones: OpcionesTx }) {
  const { addCategoria } = useCategorias()
  const guardar = useGuardar()
  const { crudOp, crudOpOrBanner } = useMutations()
  const isEdit = tx !== null
  const { tarjetas, inicial } = opciones

  const [tipo, setTipo] = useState(inicial.tipo)
  const [categoria, setCategoria] = useState(inicial.categoria)
  const [newCatOpen, setNewCatOpen] = useState(false)
  const [newCat, setNewCat] = useState('')
  const [descripcion, setDescripcion] = useState(tx?.descripcion || '')
  const [monto, setMonto] = useState(tx ? numToInput(tx.monto) : '')
  const [tarjeta, setTarjeta] = useState(inicial.tarjeta_id != null ? String(inicial.tarjeta_id) : '')
  const [fecha, setFecha] = useState(inicial.fecha)
  const [notas, setNotas] = useState(tx?.notas || '')

  const cats = opciones.categorias[tipo]

  const changeTipo = (t: 'ingreso' | 'gasto') => {
    setTipo(t)
    setCategoria(opciones.categoria_default[t])
    setNewCatOpen(false)
  }

  const saveNewCat = () => {
    const nombre = newCat.trim()
    if (!nombre) return
    void addCategoria(tipo, nombre).then((ok) => {
      if (ok) setCategoria(nombre)
    })
    setNewCatOpen(false)
    setNewCat('')
  }

  const save = async () => {
    const data = {
      fecha,
      tipo,
      categoria,
      descripcion: descripcion.trim(),
      monto: parseMoney(monto),
      notas: notas.trim(),
      tarjeta_id: tipo === 'gasto' && tarjeta ? Number(tarjeta) : null,
    }
    await guardar(async () => {
      if (tx) await crudOp('tx', 'update', { ...data, _id: tx._id })
      else await crudOp('tx', 'add', data)
    })
  }

  const remove = async () => {
    if (!tx || !confirm('¿Eliminar este movimiento?')) return
    await crudOpOrBanner('tx', 'delete', { _id: tx._id })
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
            options={[{ value: '', label: 'Efectivo / Débito' }, ...tarjetas.map((d) => ({ value: String(d.id), label: d.nombre }))]}
          />
        </div>
      )}
      <FechaField id="m-fecha" label="Fecha" value={fecha} onChange={setFecha} />
      <NotasField id="m-notas" placeholder="Notas adicionales" value={notas} onChange={setNotas} labelClassName="normal-case tracking-normal" />
      <FormFooter saveLabel={isEdit ? 'Guardar cambios' : 'Agregar'} onSave={() => void save()} onDelete={isEdit ? () => void remove() : undefined} cancelClassName="ml-auto" buttonType="button" />
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
