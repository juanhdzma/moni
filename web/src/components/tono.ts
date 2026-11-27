export interface ClaseTono {
  texto: string
  fondo: string
  chip: string
}

const positivo: ClaseTono = { texto: 'text-inversiones-text', fondo: 'bg-inversiones', chip: 'bg-inversiones/15 text-inversiones-text' }
const negativo: ClaseTono = { texto: 'text-deudas', fondo: 'bg-deudas', chip: 'bg-deudas/15 text-deudas' }
const neutro: ClaseTono = { texto: 'text-muted-foreground', fondo: 'bg-muted-foreground', chip: 'bg-muted text-muted-foreground' }

const TONO_A_CLASE = {
  positivo,
  ingreso: positivo,
  inversiones: positivo,
  negativo,
  deudas: negativo,
  alerta: { texto: 'text-alerta-text', fondo: 'bg-alerta', chip: 'bg-alerta/15 text-alerta-text' },
  neutro,
  transfer: neutro,
  gasto: { texto: 'text-foreground', fondo: 'bg-foreground', chip: 'bg-muted text-foreground' },
  cartera: { texto: 'text-cartera', fondo: 'bg-cartera', chip: 'bg-cartera/15 text-cartera' },
  activos: { texto: 'text-activos-text', fondo: 'bg-activos', chip: 'bg-activos/15 text-activos-text' },
} satisfies Record<string, ClaseTono>

export const claseDeTono = (tono: string): ClaseTono => (TONO_A_CLASE as Record<string, ClaseTono>)[tono] ?? neutro
