import { within } from '@testing-library/react'
import type { EsteMes, Frase, Evolucion, GastosPeriodo, Movimientos, ProximasOperaciones, ResumenDashboard } from '../../../types'

export const frase = (...partes: (string | [string, 'positivo' | 'negativo' | 'fuerte'])[]): Frase => {
  const items = partes.map((p) => (typeof p === 'string' ? { texto: p, tono: null } : { texto: p[0], tono: p[1] }))
  return { texto: items.map((i) => i.texto).join(''), partes: items }
}

const FRASE_QUEDO = { tipo: 'quedo' as const, pct: 80, ...frase('Te quedó el ', ['80,0%', 'positivo'], ' de lo que entró.') }

export const PERIODOS = {
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
} as const

export const RESUMEN: ResumenDashboard = {
  patrimonio: 1320000,
  efectivo: 670000,
  total_deuda: 150000,
  total_inv: 500000,
  total_activos: 300000,
  ingresos_mes: 1000000,
  gastos_mes: 200000,
  quedo_mes: 800000,
  ahorro_pct: 80,
  proy_delta: 720000,
  cuota_total: 20000,
  deudas_activas: 1,
  total_invertido: 400000,
  ganancia_inv: 100000,
  ganancia_inv_pct: 25,
  partes: [
    { id: 'activos', nombre: 'Activos', valor: 300000, negativo: false, detalle: '1 activo' },
    { id: 'inversiones', nombre: 'Inversiones', valor: 500000, negativo: false, detalle: '+$100k (+25,0%)' },
    { id: 'balance', nombre: 'Cartera', valor: 670000, negativo: false, detalle: 'Efectivo y cuentas' },
    { id: 'deudas', nombre: 'Deudas', valor: 150000, negativo: true, detalle: '$20.000/mes · 1 deuda' },
  ],
  total_barra: 1620000,
  frase_mes: FRASE_QUEDO,
}

export const EVOLUCION: Evolucion = {
  serie: 'patrimonio',
  periodo: '6M',
  meses: 6,
  puntos: [
    { mes: 'mar', valor: 600000 },
    { mes: 'ago', valor: 1320000 },
  ],
  desde: 600000,
  hasta: 1320000,
  cambio: 720000,
  verbo: 'Subiste',
  sujeto: '',
  mes_desde: 'mar',
  nombre_serie: 'Patrimonio',
  frase: frase('Subiste ', ['+$720k', 'positivo'], ' desde fin de mar: de $600k a ', ['$1,3M', 'fuerte'], '.'),
}

export const ESTE_MES: EsteMes = {
  ingresos: 1000000,
  gastos: 200000,
  quedo: 800000,
  ahorro_pct: 80,
  frase: FRASE_QUEDO,
  descripcion_grafico: 'Entró y salió por mes, últimos 6 meses',
  meses: [
    { mes: 'jul', entro: 0, salio: 30000 },
    { mes: 'ago', entro: 1000000, salio: 200000 },
  ],
}

export const GASTOS: GastosPeriodo = {
  periodo: '1M',
  nombre_periodo: 'el último mes',
  total: 250000,
  max: 200000,
  top: { categoria: 'Comida', valor: 200000, pct: 80 },
  frase: frase(['Comida', 'fuerte'], ' se lleva el ', ['80%', 'fuerte'], ' de lo que gastaste en el último mes.'),
  categorias: [
    { categoria: 'Comida', valor: 200000, n: 8, detalle: [{ id: 2, fecha: '2026-08-05', descripcion: 'Almuerzo', categoria: 'Comida', monto: 200000 }], restantes: 2, restantes_texto: 'y 2 más en Transacciones' },
    { categoria: 'Mercado', valor: 50000, n: 1, detalle: [{ id: 3, fecha: '2026-08-06', descripcion: '', categoria: 'Mercado', monto: 50000 }], restantes: 0, restantes_texto: null },
  ],
}

export const MOVIMIENTOS: Movimientos = {
  items: [
    { id: 4, fecha: '2026-08-07', tipo: 'transfer', categoria: 'Pago deuda', descripcion: '', monto: 100000 },
    { id: 3, fecha: '2026-08-06', tipo: 'gasto', categoria: 'Mercado', descripcion: '', monto: 50000 },
    { id: 1, fecha: '2026-08-01', tipo: 'ingreso', categoria: 'Salario', descripcion: '', monto: 1000000 },
  ],
}

export const PROXIMAS: ProximasOperaciones = {
  hoy: '2026-08-15',
  vencidas: 0,
  extra: [],
  texto_ver_todas: null,
  visibles: 5,
  frase: frase(['$70.000', 'fuerte'], ' por pagar en los próximos 45 días.'),
  texto_vacio: 'Sin operaciones en los próximos 45 días.',
  items: [
    { clave: 'recurrente:3:2026-08-17', tipo: 'recurrente', fuente_id: 3, fecha: '2026-08-17', dia: 17, mes_corto: 'ago', etiqueta: 'Gym', sub: 'Mensual', monto: -50000, dias: 2, texto_dias: 'en 2d', vencida: false },
    { clave: 'deuda:1:2026-08-20', tipo: 'deuda', fuente_id: 1, fecha: '2026-08-20', dia: 20, mes_corto: 'ago', etiqueta: 'Banco', sub: 'Cuota deuda', monto: -20000, dias: 5, texto_dias: 'en 5d', vencida: false },
    { clave: 'inversion:2:2026-08-20', tipo: 'inversion', fuente_id: 2, fecha: '2026-08-20', dia: 20, mes_corto: 'ago', etiqueta: 'CDT', sub: 'Rendimiento', monto: 3800, dias: 5, texto_dias: 'en 5d', vencida: false },
  ],
}

export const rutas = (extra: Record<string, unknown> = {}) => ({
  'GET /api/dashboard/resumen': RESUMEN,
  'GET /api/dashboard/evolucion': EVOLUCION,
  'GET /api/dashboard/este-mes': ESTE_MES,
  'GET /api/dashboard/gastos': GASTOS,
  'GET /api/dashboard/periodos': PERIODOS,
  'GET /api/dashboard/movimientos': MOVIMIENTOS,
  'GET /api/proximas-operaciones': PROXIMAS,
  ...extra,
})

export const stat = (id: string) => document.getElementById(id) as HTMLElement
export const gastoRows = () => Array.from(document.querySelectorAll('#gastos-categorias > li'))
export const pill = (groupId: string, label: string) => within(document.getElementById(groupId) as HTMLElement).getByText(label)
export const list = () => document.getElementById('dash-upcoming') as HTMLElement
