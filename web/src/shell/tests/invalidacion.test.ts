import { describe, expect, it } from 'vitest'
import { DEPENDENCIAS_DE_VISTA, entidadesAfectadasPorRuta } from '../invalidacion'

describe('invalidacion', () => {
  it('ops-ocultas invalida solo opsOcultas, con o sin query', () => {
    expect(entidadesAfectadasPorRuta('/api/ops-ocultas')).toEqual(['opsOcultas'])
    expect(entidadesAfectadasPorRuta('/api/ops-ocultas?clave=a')).toEqual(['opsOcultas'])
  })

  it('opsOcultas depende de transacciones', () => {
    expect(DEPENDENCIAS_DE_VISTA.opsOcultas).toContain('transacciones')
  })

  it('el listado de transacciones depende de categorias', () => {
    expect(DEPENDENCIAS_DE_VISTA.listadoTransacciones).toContain('categorias')
  })
})
