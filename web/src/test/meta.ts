import type { Meta } from '@/types'

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
    { value: 'ingreso', label: 'Ingresos', tono: 'ingreso' },
    { value: 'gasto', label: 'Gastos', tono: 'gasto' },
    { value: 'transfer', label: 'Transferencias', tono: 'transfer' },
  ],
  tipos_inversion: [
    { value: 'fija', label: 'Fija', tono: 'ingreso', campos: ['tasa', 'pago'] },
    { value: 'variable', label: 'Variable', tono: 'gasto', campos: [] },
  ],
  tipos_tasa: [
    { value: 'ea', label: 'EA' },
    { value: 'mv', label: 'MV' },
  ],
  pagos_inversion: [
    { value: 'mensual', label: 'Mensual', tono: 'ingreso', requiere_dia: true },
    { value: 'vencimiento', label: 'Al vencimiento', requiere_dia: false },
  ],
  clases_deuda: [
    { value: 'prestamo', label: 'Préstamo', es_tarjeta: false },
    { value: 'tarjeta', label: 'Tarjeta', es_tarjeta: true },
  ],
  modos_pago: [
    { value: 'cuota', label: 'Pagar cuota', placeholder_notas: 'Ej. Cuota #14' },
    { value: 'abono', label: 'Abonar', placeholder_notas: 'Ej. Abono extraordinario' },
    { value: 'liquidar', label: 'Liquidar', placeholder_notas: 'Liquidar la deuda' },
  ],
  tipos_retiro: [
    { value: 'total', label: 'Total', tono: 'ingreso' },
    { value: 'parcial', label: 'Parcial' },
  ],
  destinos_rendimiento: [
    { value: 'cuenta', label: 'Me lo pagan', tono: 'ingreso', hint: 'Entra como ingreso a tu cartera. El valor de la inversión no cambia.' },
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
    { value: 'patrimonio', label: 'Patrimonio', tono: 'cartera' },
    { value: 'inversiones', label: 'Inversiones', tono: 'inversiones' },
  ],
  columnas_transaccion: [
    { col: 'fecha', label: 'Fecha', dir_defecto: -1, ordenable: true, oculta_en_movil: false },
    { col: 'tipo', label: 'Tipo', dir_defecto: 1, ordenable: true, oculta_en_movil: true },
    { col: 'categoria', label: 'Categoría', dir_defecto: 1, ordenable: true, oculta_en_movil: true },
    { col: 'descripcion', label: 'Descripción', dir_defecto: 1, ordenable: true, oculta_en_movil: false },
    { col: 'monto', label: 'Monto', dir_defecto: -1, ordenable: true, oculta_en_movil: false },
    { col: 'metodo_pago', label: 'Método de pago', dir_defecto: 1, ordenable: false, oculta_en_movil: false },
  ],

  defaults: {
    frecuencia_recurrente: 'mensual',
    tipo_inversion: 'fija',
    pago_inversion: 'vencimiento',
    tipo_tasa: 'ea',
    clase_deuda: 'prestamo',
    franquicia: 'Visa',
    tipo_retiro: 'total',
    periodo_gastos: '1M',
    periodo_evolucion: '6M',
    serie_evolucion: 'patrimonio',
    orden_tx: { col: 'fecha', dir: -1 },
    etiqueta_efectivo: 'Efectivo / Débito',
  },
  categoria_largo_max: 25,
  limites: { nombre: 40, descripcion: 120, notas: 200, dia_pago_max: 31 },
  truncate: {
    palabra: 'BORRAR',
    texto:
      'Esto borra permanentemente todas las deudas, inversiones, activos, recurrentes, transacciones, categorías y operaciones ocultas. Se conservan los ajustes y las suscripciones push.',
    entidades: ['deudas', 'inversiones', 'activos', 'recurrentes', 'transacciones', 'categorías', 'operaciones ocultas'],
  },
  entidades: ['transacciones', 'deudas', 'inversiones', 'activos', 'recurrentes', 'categorias', 'ajustes', 'opsOcultas'],
  entidades_del_bootstrap: ['activos', 'inversiones', 'ajustes', 'categorias'],
  push: { hora: '8:00', frase: 'Aviso diario a las 8:00 de las cuotas, rendimientos y recurrentes que vencen hoy o mañana.' },
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
