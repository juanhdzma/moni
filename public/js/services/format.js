// Cacheado: cop() se llama cientos de veces por render y localStorage es síncrono.
// setCurrencySymbol() invalida con clearCurrencySymbolCache().
let _currencySymbol = null;
function getCurrencySymbol() {
  if (_currencySymbol !== null) return _currencySymbol;
  try { _currencySymbol = localStorage.getItem('moni_currency_symbol') || '$'; }
  catch (_) { _currencySymbol = '$'; }
  return _currencySymbol;
}
function clearCurrencySymbolCache() { _currencySymbol = null; }
function cop(n) {
  return getCurrencySymbol() + new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 }).format(n || 0);
}
function copShort(n) {
  const abs = Math.abs(n), s = n < 0 ? '−' : '';
  const sym = getCurrencySymbol();
  if (abs >= 1e9) return s + sym + (abs / 1e9).toFixed(1).replace('.', ',') + 'B';
  if (abs >= 1e6) return s + sym + (abs / 1e6).toFixed(1).replace('.', ',') + 'M';
  if (abs >= 1e3) return s + sym + Math.round(abs / 1e3) + 'k';
  return s + cop(abs);
}
function pct(n, d = 1) {
  return new Intl.NumberFormat('es-CO', { minimumFractionDigits: d, maximumFractionDigits: d }).format(n || 0);
}
const signStr = n => n >= 0 ? '+' : '−';

function normDate(s) {
  if (!s) return '';
  s = String(s).trim();
  if (/^\d{4}-\d{2}-\d{2}[T ]/.test(s)) return s.slice(0, 10) + 'T' + s.slice(11, 16);
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})(?:[\s,]+(\d{1,2}:\d{2}))?/);
  if (m) {
    const iso = `${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`;
    return m[4] ? `${iso}T${m[4].padStart(5,'0')}` : iso;
  }
  return s;
}
function fmtDate(s) {
  if (!s) return '—';
  const d = new Date(normDate(s).split('T')[0] + 'T12:00:00');
  return isNaN(d) ? s : d.toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' });
}
function fmtDateShort(s) {
  if (!s) return '—';
  const d = new Date(normDate(s).split('T')[0] + 'T12:00:00');
  return isNaN(d) ? '—' : d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short' });
}
function isoMonth(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}
function txMonth(t) {
  return normDate(t.fecha).split('T')[0].slice(0, 7);
}
function todayStr() {
  return new Date().toISOString().split('T')[0];
}
function isStale(dateStr, days = 30) {
  if (!dateStr) return false;
  const d = new Date(normDate(dateStr).split('T')[0] + 'T12:00:00');
  if (isNaN(d)) return false;
  return (Date.now() - d.getTime()) / 86400000 >= days;
}
function nowStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}T${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
}
function fmtDateTime(s) {
  if (!s) return '—';
  const norm = normDate(s);
  const [datePart, timePart] = norm.split('T');
  const d = new Date(datePart + 'T12:00:00');
  if (isNaN(d)) return s;
  const dateStr = d.toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' });
  return timePart ? `${dateStr} ${timePart}` : dateStr;
}

function fmtMoneyInput(el) {
  // Los dígitos a la izquierda del caret son lo único estable: los puntos de
  // miles se insertan y se borran solos al reformatear. Contando caracteres, el
  // caret se iba al final en cada tecla y no se podía corregir un dígito del
  // medio sin volver a escribir el monto entero.
  const digitosAntes = el.value.slice(0, el.selectionStart ?? el.value.length).replace(/\D/g, '').length;

  let raw = el.value.replace(/[^\d,]/g, '');
  const parts = raw.split(',');
  if (parts.length > 2) raw = parts[0] + ',' + parts.slice(1).join('');
  el.value = (raw.split(',')[0] || '').replace(/\B(?=(\d{3})+(?!\d))/g, '.');

  let pos = 0;
  for (let vistos = 0; pos < el.value.length && vistos < digitosAntes; pos++) {
    if (el.value[pos] >= '0' && el.value[pos] <= '9') vistos++;
  }
  el.setSelectionRange(pos, pos);
}
function parseMoneyInput(el) {
  return parseFloat(el.value.replace(/\./g, '').replace(',', '.')) || 0;
}
function numToInput(n) {
  return new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 }).format(n || 0);
}
// La comilla simple también: el HTML se arma con template literals y hay
// atributos delimitados con ' (los onclick generados), así que sin escaparla el
// escape solo servía para la mitad de los casos.
function escHtml(s) {
  return String(s || '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
