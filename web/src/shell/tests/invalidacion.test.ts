import { describe, expect, it } from 'vitest'
import { afectaAlBootstrap, DEPENDENCIAS_DE_VISTA, entidadesDeHeader, TODAS_LAS_ENTIDADES } from '../invalidacion'

describe('entidadesDeHeader', () => {
  it('parsea la lista separada por comas', () => {
    expect(entidadesDeHeader('transacciones,deudas')).toEqual(['transacciones', 'deudas'])
    expect(entidadesDeHeader('opsOcultas')).toEqual(['opsOcultas'])
  })

  it.each([[null], [''], ['transacciones,nada']])('%s invalida todo', (valor) => {
    expect(entidadesDeHeader(valor)).toEqual(TODAS_LAS_ENTIDADES)
  })
})

describe('afectaAlBootstrap', () => {
  it('solo activos, inversiones, ajustes y categorias refrescan el bootstrap', () => {
    expect(afectaAlBootstrap(['transacciones', 'deudas', 'opsOcultas'])).toBe(false)
    expect(afectaAlBootstrap(['deudas', 'activos'])).toBe(true)
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
