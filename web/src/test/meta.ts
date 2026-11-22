import type { Meta } from '../types'

export const META: Meta = {
  frecuencias: [
    { value: 'semanal', label: 'Semanal' },
    { value: 'quincenal', label: 'Quincenal' },
    { value: 'mensual', label: 'Mensual' },
    { value: 'bimestral', label: 'Bimestral' },
    { value: 'trimestral', label: 'Trimestral' },
    { value: 'semestral', label: 'Semestral' },
    { value: 'anual', label: 'Anual' },
  ],
  franquicias: [
    { value: 'Visa', label: 'Visa' },
    { value: 'Mastercard', label: 'Mastercard' },
    { value: 'Amex', label: 'Amex' },
    { value: 'Otra', label: 'Otra' },
    { value: '', label: 'Ninguna' },
  ],
  tipos_transaccion: [
    { value: 'ingreso', label: 'Ingreso' },
    { value: 'gasto', label: 'Gasto' },
    { value: 'transfer', label: 'Auto' },
  ],
  tipos_inversion: [
    { value: 'fija', label: 'Fija' },
    { value: 'variable', label: 'Variable' },
  ],
  pagos_inversion: [
    { value: 'mensual', label: 'Mensual' },
    { value: 'vencimiento', label: 'Al vencimiento' },
  ],
  periodos: {
    gastos: [
      { value: '1W', label: '1S' },
      { value: '1M', label: '1M' },
      { value: '3M', label: '3M' },
      { value: '6M', label: '6M' },
      { value: '1Y', label: '1A' },
      { value: 'ALL', label: 'Todo' },
    ],
    evolucion: [
      { value: '3M', label: '3M' },
      { value: '6M', label: '6M' },
      { value: '1Y', label: '1A' },
      { value: 'ALL', label: 'Todo' },
    ],
  },
}
