export interface Opcion {
  value: string
  label: string
}

export interface Meta {
  frecuencias: Opcion[]
  franquicias: Opcion[]
  tipos_transaccion: Opcion[]
  tipos_inversion: Opcion[]
  pagos_inversion: Opcion[]
  periodos: { gastos: Opcion[]; evolucion: Opcion[] }
}
