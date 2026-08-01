import test from 'node:test';
import assert from 'node:assert/strict';
import { loadMoni, MONEY_FILES } from './harness.mjs';

const tx = (tipo, categoria, monto, extra = {}) => ({ tipo, categoria, monto, fecha: '2026-08-01', ...extra });

function conTx(transacciones) {
  return loadMoni(MONEY_FILES, { now: '2026-08-15', state: { transacciones } });
}

test('la cartera ignora los gastos con tarjeta y descuenta los transfers', () => {
  const { flujoCartera } = conTx([]);
  const lista = [
    tx('ingreso', 'Salario', 5_000_000),
    tx('gasto', 'Mercado', 300_000),
    tx('gasto', 'Ropa', 200_000, { tarjeta_id: 1 }),
    tx('transfer', 'Pago deuda', 1_000_000),
  ];
  assert.equal(flujoCartera(lista), 5_000_000 - 300_000 - 1_000_000);
});

test('el patrimonio sí descuenta el gasto con tarjeta: sube la deuda', () => {
  const { flujoPatrimonio } = conTx([]);
  assert.equal(flujoPatrimonio([tx('gasto', 'Ropa', 200_000, { tarjeta_id: 1 })]), -200_000);
});

test('pagar una deuda no cambia el patrimonio', () => {
  // Sale de la cartera y cancela deuda por el mismo monto. Con el flujo de
  // cartera, la curva mostraba el mes anterior 1M más arriba.
  const { flujoPatrimonio } = conTx([]);
  assert.equal(flujoPatrimonio([tx('transfer', 'Pago deuda', 1_000_000)]), 0);
});

test('mover plata entre bolsillos no cambia el patrimonio', () => {
  const { flujoPatrimonio } = conTx([]);
  const neutras = [
    tx('gasto', 'Inversión', 500_000),
    tx('gasto', 'Compra activos', 900_000),
    tx('ingreso', 'Crédito recibido', 2_000_000),
    tx('ingreso', 'Avance de tarjeta', 300_000),
    tx('ingreso', 'Venta activos', 900_000),
    tx('ingreso', 'Dividendos', 100_000),
  ];
  assert.equal(flujoPatrimonio(neutras), 0);
  for (const t of neutras) assert.equal(flujoPatrimonio([t]), 0, t.categoria);
});

test('ingresos y gastos normales sí mueven el patrimonio', () => {
  const { flujoPatrimonio } = conTx([]);
  assert.equal(flujoPatrimonio([tx('ingreso', 'Salario', 5_000_000), tx('gasto', 'Mercado', 300_000)]), 4_700_000);
});

test('la curva de evolución cierra en el patrimonio actual', () => {
  // El chart arranca de netWorth() y camina hacia atrás restando la serie: si
  // las dos fórmulas se separan, el último punto deja de ser el de hoy.
  const ctx = conTx([
    tx('ingreso', 'Salario', 5_000_000, { fecha: '2026-07-10' }),
    tx('gasto', 'Mercado', 300_000, { fecha: '2026-08-02' }),
    tx('transfer', 'Pago deuda', 1_000_000, { fecha: '2026-08-05' }),
  ]);
  ctx.S.deudas = [{ saldo_actual: 2_000_000 }];
  ctx.S.inversiones = [{ valor_actual: 1_500_000 }];
  ctx.S.activos = [];

  const patrimonio = ctx.netWorth();
  const deltas = ctx.monthlyPatrimonio(3);
  const data = new Array(3);
  data[2] = patrimonio;
  for (let i = 1; i >= 0; i--) data[i] = data[i + 1] - deltas[i + 1];

  assert.equal(data[2], patrimonio);
  // Agosto: solo el gasto de 300k mueve el patrimonio; el pago de deuda no.
  assert.equal(deltas[2], -300_000);
  assert.equal(data[1], patrimonio + 300_000);
  assert.equal(data[0], patrimonio + 300_000 - 5_000_000);
});

test('la serie mensual respeta la ventana de meses', () => {
  const ctx = conTx([
    tx('ingreso', 'Salario', 1_000, { fecha: '2026-08-03' }),
    tx('ingreso', 'Salario', 2_000, { fecha: '2026-07-03' }),
    tx('ingreso', 'Salario', 4_000, { fecha: '2026-05-03' }),
  ]);
  // El spread saca el array del realm del vm: deepStrictEqual compara prototipos.
  assert.deepEqual([...ctx.monthlyPatrimonio(3)], [0, 2_000, 1_000]);
});

test('un residuo flotante no mantiene viva una deuda pagada', () => {
  // saldo_actual es REAL en SQLite y las cuentas del backend dejan fracciones;
  // con "> 0" una deuda saldada seguía contando como activa para siempre.
  const { tieneSaldo } = conTx([]);
  assert.equal(tieneSaldo({ saldo_actual: 1.16e-10 }), false);
  assert.equal(tieneSaldo({ saldo_actual: 0 }), false);
  assert.equal(tieneSaldo({ saldo_actual: 0.4 }), false);
  assert.equal(tieneSaldo({ saldo_actual: 1 }), true);
  assert.equal(tieneSaldo({ saldo_actual: 250_000 }), true);
});
