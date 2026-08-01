import test from 'node:test';
import assert from 'node:assert/strict';
import { loadMoni } from './harness.mjs';

const { escHtml, fmtMoneyInput, parseMoneyInput, normDate } = loadMoni(['services/format.js']);

// Stand-in del <input>: fmtMoneyInput solo usa value/selectionStart/setSelectionRange.
function input(value, caret = value.length) {
  return {
    value,
    selectionStart: caret,
    setSelectionRange(a) { this.selectionStart = a; },
  };
}

test('escHtml escapa también la comilla simple', () => {
  assert.equal(escHtml(`O'Brien`), 'O&#39;Brien');
  assert.equal(escHtml('<img src=x onerror=1>'), '&lt;img src=x onerror=1&gt;');
  assert.equal(escHtml('a & "b"'), 'a &amp; &quot;b&quot;');
  assert.equal(escHtml(null), '');
});

test('el monto se formatea con puntos de miles', () => {
  const el = input('1234567');
  fmtMoneyInput(el);
  assert.equal(el.value, '1.234.567');
});

test('el caret se queda donde estaba, no salta al final', () => {
  // Escribiendo un 9 en medio de "1.234": antes el caret volaba al final y
  // corregir un dígito obligaba a reescribir el monto entero.
  const el = input('1.2934', 4); // "1.29|34"
  fmtMoneyInput(el);
  assert.equal(el.value, '12.934');
  assert.equal(el.value.slice(0, el.selectionStart), '12.9');
});

test('el caret sobrevive a la aparición de un separador', () => {
  const el = input('1234', 4);
  fmtMoneyInput(el);
  assert.equal(el.value, '1.234');
  assert.equal(el.selectionStart, 5); // sigue después de los 4 dígitos
});

test('caret al principio se queda al principio', () => {
  const el = input('1234', 0);
  fmtMoneyInput(el);
  assert.equal(el.selectionStart, 0);
});

test('se ignora todo lo que no sea dígito', () => {
  const el = input('12a3$4');
  fmtMoneyInput(el);
  assert.equal(el.value, '1.234');
  assert.equal(parseMoneyInput(el), 1234);
});

test('normDate lleva los formatos sueltos a ISO', () => {
  assert.equal(normDate('2026-08-15'), '2026-08-15');
  assert.equal(normDate('15/08/2026'), '2026-08-15');
  assert.equal(normDate('2026-08-15T10:30:00'), '2026-08-15T10:30');
  assert.equal(normDate(''), '');
});
