import { beforeEach, describe, expect, it } from 'vitest'
import { META } from '@/test/meta'
import { mockFetch } from '@/test/mockFetch'
import { afectaAlBootstrap, DEPENDENCIAS_DE_VISTA, entidadesDeHeader, firmaDeVersiones, subirVersiones } from '@/shell/invalidacion'

const TODAS = META.entidades

beforeEach(() => void mockFetch())

describe('entidadesDeHeader', () => {
  it('parsea la lista separada por comas', async () => {
    expect(await entidadesDeHeader('transacciones,deudas')).toEqual(['transacciones', 'deudas'])
    expect(await entidadesDeHeader('opsOcultas')).toEqual(['opsOcultas'])
  })

  it('header ausente invalida todo, con la lista que manda /api/meta', async () => {
    expect(await entidadesDeHeader(null)).toEqual(TODAS)
  })

  it('header presente pero vacío no invalida nada', async () => {
    expect(await entidadesDeHeader('')).toEqual([])
  })

  it('un nombre desconocido invalida todo', async () => {
    expect(await entidadesDeHeader('transacciones,nada')).toEqual(TODAS)
  })
})

describe('afectaAlBootstrap', () => {
  it('solo las entidades que /api/meta declara del bootstrap lo refrescan', async () => {
    expect(await afectaAlBootstrap(['transacciones', 'deudas', 'opsOcultas'])).toBe(false)
    expect(await afectaAlBootstrap(['deudas', 'activos'])).toBe(true)
    expect(await afectaAlBootstrap([])).toBe(false)
  })
})

describe('versiones', () => {
  it('subir suma uno a las afectadas y la firma lee 0 en las que nunca se tocaron', () => {
    const v = subirVersiones(subirVersiones({}, ['deudas']), ['deudas', 'activos'])
    expect(firmaDeVersiones(v, ['deudas', 'activos', 'ajustes'])).toBe('2.1.0')
  })
})

describe('DEPENDENCIAS_DE_VISTA', () => {
  it('el listado de transacciones depende de categorias y de deudas (nombre de tarjeta)', () => {
    expect(DEPENDENCIAS_DE_VISTA.listadoTransacciones).toContain('categorias')
    expect(DEPENDENCIAS_DE_VISTA.listadoTransacciones).toContain('deudas')
  })

  it('proximas y opciones de tx ya no dependen de transacciones', () => {
    expect(DEPENDENCIAS_DE_VISTA.proximasOperaciones).not.toContain('transacciones')
    expect(DEPENDENCIAS_DE_VISTA.proximasOperaciones).toContain('opsOcultas')
    expect(DEPENDENCIAS_DE_VISTA.opcionesTransaccion).not.toContain('transacciones')
    expect(DEPENDENCIAS_DE_VISTA.opsOcultas).toContain('opsOcultas')
  })
})
