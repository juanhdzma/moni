import test from 'node:test';
import assert from 'node:assert/strict';
import { loadMoni, MONEY_FILES } from './harness.mjs';

const iso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

function conHoy(hoy) {
  return loadMoni(MONEY_FILES, { now: hoy });
}

test('el pago que cae hoy es hoy, no el período siguiente', () => {
  // new Date('2026-08-01') es medianoche UTC = 31/07 19:00 en GMT-5, así que el
  // pago de hoy se leía como vencido y saltaba un mes entero.
  const { nextPaymentDate } = conHoy('2026-08-01');
  assert.equal(iso(nextPaymentDate('2026-08-01', 'mensual')), '2026-08-01');
});

test('la fecha resultante es medianoche local, no las 19:00 del día anterior', () => {
  const { nextPaymentDate } = conHoy('2026-08-01');
  const next = nextPaymentDate('2026-01-15', 'mensual');
  assert.equal(iso(next), '2026-08-15');
  assert.equal(next.getHours(), 0);
});

test('el día del mes se mantiene: 31 de enero no se desborda a marzo', () => {
  const { nextPaymentDate } = conHoy('2026-02-05');
  // setMonth(+1) sobre el 31 de enero daba "31 de febrero" → 3 de marzo, y de
  // ahí en adelante el recurrente quedaba corrido para siempre.
  assert.equal(iso(nextPaymentDate('2026-01-31', 'mensual')), '2026-02-28');
  assert.equal(iso(nextPaymentDate('2026-01-31', 'mensual')), '2026-02-28');
});

test('meses cortos recortan el día pero no lo pierden', () => {
  const { nextPaymentDate } = conHoy('2026-03-01');
  assert.equal(iso(nextPaymentDate('2026-01-31', 'mensual')), '2026-03-31');
});

test('un inicio a futuro devuelve el inicio, no un período extra', () => {
  const { nextPaymentDate } = conHoy('2026-08-01');
  assert.equal(iso(nextPaymentDate('2026-12-10', 'mensual')), '2026-12-10');
});

test('semanal y quincenal caen en el mismo día de la semana', () => {
  const { nextPaymentDate } = conHoy('2026-08-01');
  assert.equal(iso(nextPaymentDate('2026-07-28', 'semanal')), '2026-08-04');
  assert.equal(iso(nextPaymentDate('2026-08-01', 'semanal')), '2026-08-01');
  assert.equal(iso(nextPaymentDate('2026-07-20', 'quincenal')), '2026-08-03');
});

test('anual salta al año siguiente cuando ya pasó', () => {
  const { nextPaymentDate } = conHoy('2026-08-01');
  assert.equal(iso(nextPaymentDate('2025-03-10', 'anual')), '2027-03-10');
  assert.equal(iso(nextPaymentDate('2025-10-10', 'anual')), '2026-10-10');
});

test('el resultado nunca queda en el pasado', () => {
  const { nextPaymentDate } = conHoy('2026-08-01');
  const hoy = new Date(2026, 7, 1);
  for (const frec of ['semanal', 'quincenal', 'mensual', 'bimestral', 'trimestral', 'semestral', 'anual']) {
    for (const inicio of ['2020-01-01', '2024-02-29', '2026-07-31', '2026-08-01']) {
      const next = nextPaymentDate(inicio, frec);
      assert.ok(next >= hoy, `${frec} desde ${inicio} devolvió ${iso(next)}`);
    }
  }
});

test('frecuencia desconocida o fecha vacía devuelven null', () => {
  const { nextPaymentDate } = conHoy('2026-08-01');
  assert.equal(nextPaymentDate('', 'mensual'), null);
  assert.equal(nextPaymentDate('2026-08-01', 'cada rato'), null);
});

test('toMensual normaliza cada frecuencia a un mes', () => {
  const { toMensual } = conHoy('2026-08-01');
  assert.equal(toMensual(100, 'mensual'), 100);
  assert.equal(toMensual(100, 'quincenal'), 200);
  assert.equal(toMensual(1200, 'anual'), 100);
  assert.equal(toMensual(100, 'loquesea'), 100);
});
