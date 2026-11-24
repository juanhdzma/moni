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
  tipos_manuales: [
    { value: 'ingreso', label: 'Ingreso' },
    { value: 'gasto', label: 'Gasto' },
  ],
  tipos_categoria: [
    { value: 'ingreso', label: 'Ingresos' },
    { value: 'gasto', label: 'Gastos' },
    { value: 'transfer', label: 'Transferencias' },
  ],
  tipos_inversion: [
    { value: 'fija', label: 'Fija' },
    { value: 'variable', label: 'Variable' },
  ],
  pagos_inversion: [
    { value: 'mensual', label: 'Mensual' },
    { value: 'vencimiento', label: 'Al vencimiento' },
  ],
  clases_deuda: [
    { value: 'prestamo', label: 'Préstamo' },
    { value: 'tarjeta', label: 'Tarjeta' },
  ],
  tipos_retiro: [
    { value: 'total', label: 'Total' },
    { value: 'parcial', label: 'Parcial' },
  ],
  destinos_rendimiento: [
    { value: 'cuenta', label: 'Me lo pagan', hint: 'Entra como ingreso a tu cartera. El valor de la inversión no cambia.' },
    { value: 'capitaliza', label: 'Capitaliza', hint: 'Sube el valor de la inversión. No entra plata a tu cartera.' },
  ],
  monedas: [
    { value: '$', label: 'Peso colombiano ($)' },
    { value: 'US$', label: 'Dólar (US$)' },
    { value: '€', label: 'Euro (€)' },
    { value: 'MX$', label: 'Peso mexicano (MX$)' },
    { value: '£', label: 'Libra esterlina (£)' },
  ],
  series_evolucion: [
    { value: 'patrimonio', label: 'Patrimonio' },
    { value: 'inversiones', label: 'Inversiones' },
  ],
  columnas_transaccion: [
    { col: 'fecha', label: 'Fecha', dir_defecto: -1 },
    { col: 'tipo', label: 'Tipo', dir_defecto: 1 },
    { col: 'categoria', label: 'Categoría', dir_defecto: 1 },
    { col: 'descripcion', label: 'Descripción', dir_defecto: 1 },
    { col: 'monto', label: 'Monto', dir_defecto: -1 },
  ],
  defaults: { frecuencia_recurrente: 'mensual', tipo_inversion: 'fija', pago_inversion: 'vencimiento' },
  push: { hora: '8:00', texto: 'hoy o mañana' },
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
