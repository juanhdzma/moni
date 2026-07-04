function cop(n) {
  return '$' + new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 }).format(n || 0);
}
function copShort(n) {
  const abs = Math.abs(n), s = n < 0 ? '−' : '';
  if (abs >= 1e9) return s + '$' + (abs / 1e9).toFixed(1).replace('.', ',') + 'B';
  if (abs >= 1e6) return s + '$' + (abs / 1e6).toFixed(1).replace('.', ',') + 'M';
  if (abs >= 1e3) return s + '$' + Math.round(abs / 1e3) + 'k';
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
  let raw = el.value.replace(/[^\d,]/g, '');
  const parts = raw.split(',');
  if (parts.length > 2) raw = parts[0] + ',' + parts.slice(1).join('');
  const intStr = (raw.split(',')[0] || '').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  el.value = intStr;
  const len = el.value.length;
  el.setSelectionRange(len, len);
}
function parseMoneyInput(el) {
  return parseFloat(el.value.replace(/\./g, '').replace(',', '.')) || 0;
}
function numToInput(n) {
  return new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 }).format(n || 0);
}
function escHtml(s) {
  return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
