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

  it('recorta espacios y descarta los huecos entre comas', async () => {
    expect(await entidadesDeHeader(' deudas , activos ')).toEqual(['deudas', 'activos'])
    expect(await entidadesDeHeader('deudas,,activos,')).toEqual(['deudas', 'activos'])
    expect(await entidadesDeHeader(',,')).toEqual([])
    expect(await entidadesDeHeader('   ')).toEqual([])
  })

  it('no normaliza mayúsculas: Deudas es desconocido y recarga todo', async () => {
    expect(await entidadesDeHeader('Deudas')).toEqual(TODAS)
  })

  it('un nombre desconocido en cualquier posición invalida todo', async () => {
    expect(await entidadesDeHeader('nada,deudas')).toEqual(TODAS)
    expect(await entidadesDeHeader('deudas,nada,activos')).toEqual(TODAS)
  })

  it('todas las entidades de /api/meta se aceptan una por una', async () => {
    for (const e of TODAS) expect(await entidadesDeHeader(e)).toEqual([e])
    expect(await entidadesDeHeader(TODAS.join(','))).toEqual(TODAS)
  })
})

describe('afectaAlBootstrap', () => {
  it('solo las entidades que /api/meta declara del bootstrap lo refrescan', async () => {
    expect(await afectaAlBootstrap(['transacciones', 'deudas', 'opsOcultas'])).toBe(false)
    expect(await afectaAlBootstrap(['deudas', 'activos'])).toBe(true)
    expect(await afectaAlBootstrap([])).toBe(false)
  })

  it('coincide entidad por entidad con entidades_del_bootstrap de /api/meta', async () => {
    for (const e of TODAS) expect(await afectaAlBootstrap([e])).toBe(META.entidades_del_bootstrap.includes(e))
  })

  it('basta una entidad del bootstrap entre varias, en cualquier posición', async () => {
    const del = META.entidades_del_bootstrap[0]
    const fuera = TODAS.filter((e) => !META.entidades_del_bootstrap.includes(e))
    expect(del).toBeDefined()
    if (del) {
      expect(await afectaAlBootstrap([...fuera, del])).toBe(true)
      expect(await afectaAlBootstrap([del, ...fuera])).toBe(true)
    }
    expect(await afectaAlBootstrap(fuera)).toBe(false)
  })
})

describe('versiones', () => {
  it('subir suma uno a las afectadas y la firma lee 0 en las que nunca se tocaron', () => {
    const v = subirVersiones(subirVersiones({}, ['deudas']), ['deudas', 'activos'])
    expect(firmaDeVersiones(v, ['deudas', 'activos', 'ajustes'])).toBe('2.1.0')
  })

  it('subir no muta el objeto anterior y sin afectadas devuelve una copia igual', () => {
    const antes = { deudas: 1 }
    const despues = subirVersiones(antes, ['deudas'])
    expect(antes).toEqual({ deudas: 1 })
    expect(despues).toEqual({ deudas: 2 })
    expect(subirVersiones(antes, [])).toEqual(antes)
    expect(subirVersiones(antes, [])).not.toBe(antes)
  })

  it('una entidad repetida en la misma subida suma dos veces', () => {
    expect(subirVersiones({}, ['deudas', 'deudas'])).toEqual({ deudas: 2 })
  })

  it('la firma respeta el orden de las entidades pedidas y vacía es cadena vacía', () => {
    const v = { deudas: 3, activos: 5 }
    expect(firmaDeVersiones(v, ['activos', 'deudas'])).toBe('5.3')
    expect(firmaDeVersiones(v, ['deudas', 'activos'])).toBe('3.5')
    expect(firmaDeVersiones(v, [])).toBe('')
  })
})

describe('DEPENDENCIAS_DE_VISTA', () => {
  it('el mapa completo de qué entidades refrescan cada vista', () => {
    expect(DEPENDENCIAS_DE_VISTA).toEqual({
      resumenDashboard: ['transacciones', 'deudas', 'inversiones', 'activos', 'ajustes'],
      evolucion: ['transacciones', 'deudas', 'inversiones', 'activos', 'ajustes'],
      esteMes: ['transacciones'],
      gastos: ['transacciones'],
      movimientos: ['transacciones'],
      proximasOperaciones: ['deudas', 'inversiones', 'recurrentes', 'opsOcultas', 'ajustes'],
      opsOcultas: ['opsOcultas', 'deudas', 'inversiones', 'recurrentes'],
      listadoTransacciones: ['transacciones', 'deudas', 'categorias', 'ajustes'],
      opcionesTransaccion: ['deudas', 'categorias'],
      resumenDeudas: ['deudas', 'ajustes'],
      resumenInversiones: ['inversiones', 'ajustes'],
      resumenActivos: ['activos', 'ajustes'],
      resumenRecurrentes: ['recurrentes', 'categorias', 'ajustes'],
    })
  })

  it('toda dependencia es una entidad que /api/meta conoce y ninguna se repite en una vista', () => {
    for (const deps of Object.values(DEPENDENCIAS_DE_VISTA)) {
      for (const e of deps) expect(TODAS).toContain(e)
      expect(new Set(deps).size).toBe(deps.length)
    }
  })

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
