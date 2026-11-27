import { within } from '@testing-library/react'
import type { EsteMes, Frase, Evolucion, GastosPeriodo, Movimientos, ProximasOperaciones, ResumenDashboard } from '@/types'

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
  patrimonio_tono: 'positivo',
  patrimonio_signo: '+',
  proy_delta: 720000,
  proy_delta_tono: 'positivo',
  proy_delta_signo: '+',
  texto_proyeccion: 'proyectados en 12 meses',
  partes: [
    { id: 'activos', nombre: 'Activos', valor: 300000, negativo: false, valor_firmado: 300000, valor_signo: '+', proporcion: 18.51851851851852, detalle: '1 activo', tono: 'activos' },
    { id: 'inversiones', nombre: 'Inversiones', valor: 500000, negativo: false, valor_firmado: 500000, valor_signo: '+', proporcion: 30.864197530864196, detalle: '+$100k (+25,0%)', tono: 'inversiones' },
    { id: 'balance', nombre: 'Cartera', valor: 670000, negativo: false, valor_firmado: 670000, valor_signo: '+', proporcion: 41.358024691358025, detalle: 'Efectivo y cuentas', tono: 'cartera' },
    { id: 'deudas', nombre: 'Deudas', valor: 150000, negativo: true, valor_firmado: -150000, valor_signo: '−', proporcion: 9.25925925925926, detalle: '$20.000/mes · 1 deuda', tono: 'deudas' },
  ],
  total_barra: 1620000,
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
  cambio: 720000,
  nombre_serie: 'Patrimonio',
  tono: 'cartera',
  descripcion_grafico: 'Evolución mensual de patrimonio',
  frase: frase('Subiste ', ['+$720k', 'positivo'], ' desde fin de mar: de $600k a ', ['$1,3M', 'fuerte'], '.'),
}

export const ESTE_MES: EsteMes = {
  ingresos: 1000000,
  gastos: 200000,
  gastos_firmado: -200000,
  quedo: 800000,
  tono_ingresos: 'positivo',
  tono_gastos: 'deudas',
  signo_ingresos: '+', signo_gastos: '−', signo_quedo: '+', titulo: 'Este mes en tu cartera', etiqueta_ingresos: 'Entró', etiqueta_gastos: 'Salió', tono_quedo: 'positivo',
  titulo_quedo: 'Te quedó',
  texto_tarjeta: 'Lo pagado con tarjeta no sale de la cartera.',
  frase: FRASE_QUEDO,
  descripcion_grafico: 'Entró y salió por mes, últimos 6 meses',
  meses: [
    { mes: 'jul', entro: 0, salio: 30000 },
    { mes: 'ago', entro: 1000000, salio: 200000 },
  ],
}

export const GASTOS: GastosPeriodo = {
  periodo: '1M',
  total: 250000,
  max: 200000,
  texto_vacio: 'Sin gastos para este período',
  texto_total: 'Total gastado, con tarjetas',
  top: { categoria: 'Comida', valor: 200000, pct: 80 },
  frase: frase(['Comida', 'fuerte'], ' se lleva el ', ['80%', 'fuerte'], ' de lo que gastaste en el último mes.'),
  categorias: [
    { categoria: 'Comida', valor: 200000, n: 8, detalle: [{ id: 2, fecha: '2026-08-05', descripcion: 'Almuerzo', categoria: 'Comida', monto: 200000 }], restantes_texto: 'y 2 más en Transacciones', pct: 100 },
    { categoria: 'Mercado', valor: 50000, n: 1, detalle: [{ id: 3, fecha: '2026-08-06', descripcion: '', categoria: 'Mercado', monto: 50000 }], restantes_texto: null, pct: 25 },
  ],
}

export const MOVIMIENTOS: Movimientos = {
  items: [
    { id: 4, fecha: '2026-08-07', tipo: 'transfer', categoria: 'Pago deuda', descripcion: '', monto: 100000, monto_firmado: -100000, monto_signo: '−', editable: false, tono: 'neutro', icono_metodo: 'efectivo', icono_url: '/assets/icons/efectivo.svg' },
    { id: 3, fecha: '2026-08-06', tipo: 'gasto', categoria: 'Mercado', descripcion: '', monto: 50000, monto_firmado: -50000, monto_signo: '−', editable: true, tono: 'gasto', icono_metodo: 'efectivo', icono_url: '/assets/icons/efectivo.svg' },
    { id: 1, fecha: '2026-08-01', tipo: 'ingreso', categoria: 'Salario', descripcion: '', monto: 1000000, monto_firmado: 1000000, monto_signo: '+', editable: true, tono: 'ingreso', icono_metodo: 'efectivo', icono_url: '/assets/icons/efectivo.svg' },
  ],
  texto_vacio: { titulo: 'Sin transacciones', texto: 'Registrá un ingreso o gasto y aparece acá.' },
}

export const PROXIMAS: ProximasOperaciones = {
  extra: [],
  texto_ver_todas: null,
  texto_ver_menos: null,
  frase: frase(['$70.000', 'fuerte'], ' por pagar en los próximos 45 días.'),
  texto_vacio: 'Sin operaciones en los próximos 45 días.',
  items: [
    { clave: 'recurrente:3:2026-08-17', tipo: 'recurrente', fuente_id: 3, fecha: '2026-08-17', dia: 17, mes_corto: 'ago', etiqueta: 'Gym', sub: 'Mensual', monto: -50000, monto_tono: 'negativo', monto_signo: '−', sin_monto: false, texto_dias: 'en 2d', vencida: false },
    { clave: 'deuda:1:2026-08-20', tipo: 'deuda', fuente_id: 1, fecha: '2026-08-20', dia: 20, mes_corto: 'ago', etiqueta: 'Banco', sub: 'Cuota deuda', monto: -20000, monto_tono: 'negativo', monto_signo: '−', sin_monto: false, texto_dias: 'en 5d', vencida: false },
    { clave: 'inversion:2:2026-08-20', tipo: 'inversion', fuente_id: 2, fecha: '2026-08-20', dia: 20, mes_corto: 'ago', etiqueta: 'CDT', sub: 'Rendimiento', monto: 3800, monto_tono: 'positivo', monto_signo: '+', sin_monto: false, texto_dias: 'en 5d', vencida: false },
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
