export interface OperacionProxima {
  clave: string
  tipo: 'deuda' | 'inversion' | 'recurrente'
  fuente_id: number
  fecha: string
  dia: number
  mes_corto: string
  etiqueta: string
  sub: string
  monto: number
  dias: number
  texto_dias: string
  vencida: boolean
}

export interface ProximasOperaciones {
  hoy: string
  items: OperacionProxima[]
  vencidas: number
  salen_total: number
}

export interface OpOculta {
  clave: string
  tipo: string
  fuente_id: number
  fecha: string
  etiqueta: string | null
}

export interface OpsOcultas {
  items: OpOculta[]
}
