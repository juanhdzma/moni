import { describe, expect, it } from 'vitest'
import { DEPENDENCIAS_DE_VISTA, entidadesAfectadasPor, entidadesAfectadasPorRuta, TODAS_LAS_ENTIDADES } from '../invalidacion'

describe('entidadesAfectadasPorRuta', () => {
  it('ops-ocultas invalida solo opsOcultas, con o sin query', () => {
    expect(entidadesAfectadasPorRuta('/api/ops-ocultas')).toEqual(['opsOcultas'])
    expect(entidadesAfectadasPorRuta('/api/ops-ocultas?clave=a')).toEqual(['opsOcultas'])
  })

  it('un pago con registrar_tx toca deudas y transacciones', () => {
    expect(entidadesAfectadasPorRuta('/api/deuda/1/pago', { registrar_tx: true })).toEqual(['deudas', 'transacciones'])
  })

  it('un pago sin registrar_tx solo toca deudas', () => {
    expect(entidadesAfectadasPorRuta('/api/deuda/1/pago', { registrar_tx: false })).toEqual(['deudas'])
  })

  it('con op_clave se marca opsOcultas', () => {
    expect(entidadesAfectadasPorRuta('/api/deuda/1/pago', { registrar_tx: true }, 'deuda:1:2026-08-20')).toEqual(['deudas', 'transacciones', 'opsOcultas'])
  })

  it('un rendimiento que capitaliza no escribe transacciones', () => {
    expect(entidadesAfectadasPorRuta('/api/inv/2/rendimiento', { registrar_tx: true, capitaliza: true })).toEqual(['inversiones'])
    expect(entidadesAfectadasPorRuta('/api/inv/2/rendimiento', { registrar_tx: true, capitaliza: false })).toEqual(['inversiones', 'transacciones'])
  })

  it.each([
    ['/api/inv/2/aporte', 'inversiones'],
    ['/api/inv/2/retiro', 'inversiones'],
    ['/api/activo/3/venta', 'activos'],
    ['/api/deuda/1/adelanto', 'deudas'],
  ])('%s escribe en %s y transacciones', (ruta, entidad) => {
    expect(entidadesAfectadasPorRuta(ruta, { registrar_tx: true })).toEqual([entidad, 'transacciones'])
  })

  it.each([
    ['/api/inv/2/valor', 'inversiones'],
    ['/api/activo/3/valor', 'activos'],
    ['/api/rec/4/pausar', 'recurrentes'],
  ])('%s solo toca %s', (ruta, entidad) => {
    expect(entidadesAfectadasPorRuta(ruta, {})).toEqual([entidad])
  })

  it('una ruta desconocida invalida todo', () => {
    expect(entidadesAfectadasPorRuta('/api/import')).toEqual(TODAS_LAS_ENTIDADES)
  })
})

describe('entidadesAfectadasPor', () => {
  it('una tx nueva sin tarjeta no toca deudas', () => {
    expect(entidadesAfectadasPor('tx', 'add', { tarjeta_id: null })).toEqual(['transacciones'])
  })

  it('una tx nueva con tarjeta toca deudas', () => {
    expect(entidadesAfectadasPor('tx', 'add', { tarjeta_id: 3 })).toEqual(['transacciones', 'deudas'])
  })

  it('editar o borrar una tx toca deudas porque la tarjeta anterior es desconocida', () => {
    expect(entidadesAfectadasPor('tx', 'update', { tarjeta_id: null })).toEqual(['transacciones', 'deudas'])
    expect(entidadesAfectadasPor('tx', 'delete', {})).toEqual(['transacciones', 'deudas'])
  })

  it('una tx con op_clave marca opsOcultas', () => {
    expect(entidadesAfectadasPor('tx', 'add', { tarjeta_id: null }, 'rec:1:2026-08-20')).toEqual(['transacciones', 'opsOcultas'])
  })

  it('crear deuda, inversion o activo toca transacciones solo con crear_tx', () => {
    expect(entidadesAfectadasPor('deuda', 'add', { crear_tx: true })).toEqual(['deudas', 'transacciones'])
    expect(entidadesAfectadasPor('inv', 'add', { crear_tx: false })).toEqual(['inversiones'])
    expect(entidadesAfectadasPor('activo', 'add', { crear_tx: true })).toEqual(['activos', 'transacciones'])
  })

  it('editar deuda, inversion o activo no toca transacciones', () => {
    expect(entidadesAfectadasPor('deuda', 'update', {})).toEqual(['deudas'])
    expect(entidadesAfectadasPor('inv', 'update', {})).toEqual(['inversiones'])
    expect(entidadesAfectadasPor('activo', 'delete', {})).toEqual(['activos'])
  })

  it('borrar una deuda toca transacciones porque anula tarjeta_id', () => {
    expect(entidadesAfectadasPor('deuda', 'delete', {})).toEqual(['deudas', 'transacciones'])
  })

  it('un recurrente solo toca recurrentes', () => {
    expect(entidadesAfectadasPor('rec', 'add', {})).toEqual(['recurrentes'])
  })
})

describe('DEPENDENCIAS_DE_VISTA', () => {
  it('el listado de transacciones depende de categorias', () => {
    expect(DEPENDENCIAS_DE_VISTA.listadoTransacciones).toContain('categorias')
  })

  it('proximas y opciones de tx ya no dependen de transacciones', () => {
    expect(DEPENDENCIAS_DE_VISTA.proximasOperaciones).not.toContain('transacciones')
    expect(DEPENDENCIAS_DE_VISTA.proximasOperaciones).toContain('opsOcultas')
    expect(DEPENDENCIAS_DE_VISTA.opcionesTransaccion).not.toContain('transacciones')
    expect(DEPENDENCIAS_DE_VISTA.opsOcultas).toContain('opsOcultas')
  })
})
