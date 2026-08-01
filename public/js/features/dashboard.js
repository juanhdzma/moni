// ── CSS variable helper ───────────────────────────────────────────────────────
const cv = name => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

// ── Flujo de cartera ──────────────────────────────────────────────────────────
// Qué entra y sale de la plata disponible. Un gasto con tarjeta NO la toca (mueve
// el saldo de la deuda); un pago de deuda ('transfer') SÍ la toca aunque no sea
// un gasto. Esta es la única definición: los KPIs y la serie histórica del chart
// tienen que usarla igual o la curva no cierra con su propio punto final.
const esGastoCartera = t => t.tipo === 'gasto' && !t.tarjeta_id;

function flujoCartera(list) {
  return list.reduce((s, t) => {
    if (t.tipo === 'ingreso')   return s + t.monto;
    if (esGastoCartera(t))      return s - t.monto;
    if (t.tipo === 'transfer')  return s - t.monto;
    return s;
  }, 0);
}

// ── Flujo de patrimonio ───────────────────────────────────────────────────────
// Categorías que el backend asigna solo en las acciones compuestas: mueven plata
// de un bolsillo a otro, no cambian cuánto tenés. Un pago de deuda vacía la
// cartera pero cancela deuda por el mismo monto; un aporte sale de la cartera y
// entra a la inversión; un crédito recibido entra a la cartera y sube la deuda.
const CATEGORIAS_NEUTRAS_PATRIMONIO = new Set([
  'Pago deuda', 'Inversión', 'Compra activos',
  'Crédito recibido', 'Avance de tarjeta', 'Venta activos', 'Dividendos',
]);

// Lo que mueve el patrimonio, que NO es lo que mueve la cartera: un gasto con
// tarjeta no toca la cartera pero sube la deuda, así que acá sí resta. Es la
// serie con la que se camina hacia atrás la curva de evolución — con el flujo de
// cartera, cada pago de deuda se dibujaba como si el mes anterior hubieras
// tenido esa plata de más.
//
// Lo que esta serie no puede ver: las revalorizaciones de activos e inversiones
// variables no dejan transacción, así que la curva histórica las ignora y solo
// el punto final (netWorth) las tiene.
function flujoPatrimonio(list) {
  return list.reduce((s, t) => {
    if (CATEGORIAS_NEUTRAS_PATRIMONIO.has(t.categoria)) return s;
    if (t.tipo === 'ingreso') return s + t.monto;
    if (t.tipo === 'gasto')   return s - t.monto;
    return s;
  }, 0);
}

// Cartera + inversiones + activos − deudas. El chart de evolución arranca de acá
// y camina hacia atrás restando monthlyPatrimonio, así que ambos tienen que
// salir de la misma fórmula.
function netWorth() {
  return flujoCartera(S.transacciones)
       + S.inversiones.reduce((s, i) => s + i.valor_actual, 0)
       + S.activos.reduce((s, a) => s + a.valor_actual, 0)
       - S.deudas.reduce((s, d) => s + d.saldo_actual, 0);
}

function monthlySeries(count, flujo) {
  const now = new Date();
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (count - 1 - i), 1);
    const m = isoMonth(d);
    return flujo(S.transacciones.filter(t => txMonth(t) === m));
  });
}

function monthlyPatrimonio(count = 7) { return monthlySeries(count, flujoPatrimonio); }

// ── Dashboard main ────────────────────────────────────────────────────────────
function renderDashboard() {
  const now   = new Date();
  const curM  = isoMonth(now);
  const prevM = isoMonth(new Date(now.getFullYear(), now.getMonth() - 1, 1));

  const ofMonth = (m) => S.transacciones.filter(t => txMonth(t) === m);
  const cur  = ofMonth(curM);
  const prev = ofMonth(prevM);

  const sumTipo    = (list, tipo) => list.filter(t => t.tipo === tipo).reduce((s,t) => s+t.monto, 0);

  const ingresos  = sumTipo(cur, 'ingreso');
  const gastos    = cur.filter(esGastoCartera).reduce((s,t) => s+t.monto, 0);

  const totalDeuda   = S.deudas.reduce((s,d) => s + d.saldo_actual, 0);
  const totalInv     = S.inversiones.reduce((s,i) => s + i.valor_actual, 0);
  const totalActivos = S.activos.reduce((s,a) => s + a.valor_actual, 0);
  const efectivo     = flujoCartera(S.transacciones);
  const patrimonio   = netWorth();

  const statCard = (id, value, sub, colorVar) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.querySelector('.stat-value').innerHTML = `<span style="color:${colorVar}">${copShort(value)}</span>`;
    if (sub !== null) el.querySelector('.stat-sub').innerHTML = sub;
  };

  const ultimos12   = monthlyPatrimonio(12);
  const avgMonthly  = ultimos12.reduce((s,v) => s+v, 0) / ultimos12.length;
  const proyDelta   = avgMonthly * 12;
  const proySign    = proyDelta >= 0 ? '+' : '−';
  const proyStr     = `${proySign}${copShort(Math.abs(proyDelta))} proyectados próx. 12 meses`;

  const deudasActivas  = S.deudas.filter(tieneSaldo);
  const cuotaTotal     = deudasActivas.reduce((s,d) => s+d.cuota_mensual, 0);
  const totalInvertido = S.inversiones.reduce((s,i) => s + i.monto_invertido, 0);
  const gananciaInv    = totalInv - totalInvertido;
  const ganPct         = totalInvertido > 0 ? gananciaInv / totalInvertido * 100 : 0;
  const invStr         = totalInvertido > 0
    ? `${gananciaInv >= 0 ? '+' : ''}${copShort(gananciaInv)} (${signStr(ganPct)}${pct(Math.abs(ganPct))}%)`
    : `${S.inversiones.length} posición${S.inversiones.length!==1?'es':''}`;

  // Del mes, no de toda la vida: dividir la cartera acumulada por los ingresos
  // de este mes daba porcentajes de ahorro de tres cifras.
  const ahorroPct = ingresos > 0 ? flujoCartera(cur) / ingresos * 100 : 0;

  statCard('stat-networth',    patrimonio,   proyStr,                                                                                      patrimonio >= 0 ? 'var(--income)' : 'var(--expense)');
  statCard('stat-balance',     efectivo,     `↑${copShort(ingresos)} · ↓${copShort(gastos)} · ${signStr(ahorroPct)}${pct(Math.abs(ahorroPct))}% ahorro`, efectivo >= 0 ? 'var(--income)' : 'var(--expense)');
  statCard('stat-inversiones', totalInv,     invStr,                                                                                       'var(--inv)');
  statCard('stat-activos',     totalActivos, `${S.activos.length} activo${S.activos.length!==1?'s':''}`,                                  'var(--asset)');
  statCard('stat-deudas',      totalDeuda,   `${cop(cuotaTotal)}/mes · ${deudasActivas.length} deuda${deudasActivas.length!==1?'s':''}`,  'var(--red)');

  renderNetWorthChart();
  renderInversionesEvolChart();
  renderProximasOperaciones();
  renderRecentTransactions();
}

// ── Recent transactions ───────────────────────────────────────────────────────
function renderRecentTransactions() {
  const el = document.getElementById('recent-list');
  if (!el) return;
  const recent = [...S.transacciones]
    .sort((a,b) => b.fecha.localeCompare(a.fecha))
    .slice(0, 20);

  if (!recent.length) {
    el.innerHTML = '<div class="empty"><div class="empty-title">Sin transacciones</div></div>';
    return;
  }

  el.innerHTML = recent.map(t => {
    const color  = t.tipo === 'ingreso' ? 'var(--income)' : t.tipo === 'gasto' ? 'var(--expense)' : 'var(--transfer)';
    const prefix = t.tipo === 'ingreso' ? '+' : '−';
    return `
    <div class="recent-item">
      <div class="recent-left">
        <div class="recent-desc">${escHtml(t.descripcion || t.categoria)}</div>
        <div class="recent-meta">${fmtDateShort(t.fecha)} · ${escHtml(t.categoria)}</div>
      </div>
      <div class="recent-amount" style="color:${color}">${prefix}${cop(t.monto)}</div>
    </div>`;
  }).join('');
}

// ── Net worth evolution chart ─────────────────────────────────────────────────
function _periodMonths(period, extraDates = []) {
  if (period === '1M') return 2;
  if (period === '3M') return 3;
  if (period === '6M') return 6;
  if (period === '1Y') return 12;
  const dates = extraDates.filter(Boolean).sort();
  if (!dates.length) return 6;
  const earliest = new Date(dates[0]);
  const now = new Date();
  return Math.max((now.getFullYear() - earliest.getFullYear()) * 12 + (now.getMonth() - earliest.getMonth()) + 1, 2);
}

let _nwPeriod = '6M';

function setNwPeriod(p) {
  _nwPeriod = p;
  document.querySelectorAll('#nw-period-pills .period-btn')
    .forEach(b => b.classList.toggle('sel', b.dataset.period === p));
  renderNetWorthChart();
}

let chartEvol = null;
function renderNetWorthChart() {
  const canvas = document.getElementById('chart-evolution');
  if (!canvas) return;

  const patrimonio = netWorth();

  const count  = _periodMonths(_nwPeriod, S.transacciones.map(t => normDate(t.fecha).slice(0, 10)));
  const deltas = monthlyPatrimonio(count);
  const data = new Array(count);
  data[count - 1] = patrimonio;
  for (let i = count - 2; i >= 0; i--) data[i] = data[i + 1] - deltas[i + 1];

  const now    = new Date();
  const labels = Array.from({length: count}, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (count - 1 - i), 1);
    return d.toLocaleDateString('es-CO', { month: 'short' });
  });

  const border = cv('--border');
  const textM  = cv('--text-muted');
  const font   = cv('--font-mono').split(',')[0].replace(/['"]/g,'').trim();
  const isPos  = data[data.length - 1] >= 0;
  const lineColor = isPos ? cv('--green') : cv('--red');

  const containerH = canvas.parentElement.offsetHeight || 300;
  const gradient = canvas.getContext('2d').createLinearGradient(0, 0, 0, containerH);
  gradient.addColorStop(0, lineColor + '33');
  gradient.addColorStop(1, lineColor + '00');

  if (chartEvol) { chartEvol.destroy(); chartEvol = null; }

  chartEvol = new Chart(canvas, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        data,
        borderColor: lineColor,
        backgroundColor: gradient,
        fill: true, borderWidth: 2,
        pointRadius: 4, pointBackgroundColor: lineColor,
        pointHoverRadius: 6, tension: 0.35,
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      animation: { duration: 600 },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: cv('--bg-card'), borderColor: border, borderWidth: 1,
          titleColor: textM, bodyColor: cv('--text'), padding: 10, cornerRadius: 8,
          callbacks: { label: ctx => ` ${cop(ctx.parsed.y)}` },
        },
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: textM, font: { size: 11, family: font } },
          border: { display: false },
        },
        y: {
          grid: { color: border, drawBorder: false },
          ticks: { color: textM, font: { size: 11, family: font }, callback: v => copShort(v), maxTicksLimit: 5 },
          border: { display: false },
        },
      },
    },
  });
}

// ── Evolución de inversiones ──────────────────────────────────────────────────
let _invPeriod = '6M';

function setInvPeriod(p) {
  _invPeriod = p;
  document.querySelectorAll('#inv-period-pills .period-btn')
    .forEach(b => b.classList.toggle('sel', b.dataset.period === p));
  renderInversionesEvolChart();
}

function _invPeriodMonths() {
  return _periodMonths(_invPeriod, [
    ...S.transacciones.map(t => normDate(t.fecha).slice(0, 10)),
    ...S.inversiones.map(i => i.fecha_inicio ? normDate(i.fecha_inicio).slice(0, 10) : null),
  ]);
}

// Lo que mueve el valor del portafolio y además deja rastro en el ledger: los
// aportes suman, los retiros restan. Los rendimientos no entran acá: si te los
// pagan salieron de la inversión sin cambiarle el valor, y si capitalizan no
// dejan transacción — como las revalorizaciones, la curva no puede verlos y
// solo los tiene el punto final.
function monthlyInvDelta(count) {
  return monthlySeries(count, tx => tx.reduce((s, t) => {
    if (t.categoria === 'Inversión')  return s + t.monto;
    if (t.categoria === 'Dividendos') return s - t.monto;
    return s;
  }, 0));
}

let chartInvEvol = null;
function renderInversionesEvolChart() {
  const canvas = document.getElementById('chart-inversiones-evol');
  if (!canvas) return;

  const totalInv = S.inversiones.reduce((s, i) => s + i.valor_actual, 0);
  const count    = _invPeriodMonths();
  const deltas   = monthlyInvDelta(count);
  const data     = new Array(count);
  data[count - 1] = totalInv;
  for (let i = count - 2; i >= 0; i--) data[i] = data[i + 1] - deltas[i + 1];

  const now    = new Date();
  const labels = Array.from({ length: count }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (count - 1 - i), 1);
    return d.toLocaleDateString('es-CO', { month: 'short' });
  });

  const green  = cv('--green');
  const border = cv('--border');
  const textM  = cv('--text-muted');
  const font   = cv('--font-mono').split(',')[0].replace(/['"]/g, '').trim();

  const containerH = canvas.parentElement.offsetHeight || 300;
  const gradient = canvas.getContext('2d').createLinearGradient(0, 0, 0, containerH);
  gradient.addColorStop(0, green + '33');
  gradient.addColorStop(1, green + '00');

  if (chartInvEvol) { chartInvEvol.destroy(); chartInvEvol = null; }

  chartInvEvol = new Chart(canvas, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        data,
        borderColor: green,
        backgroundColor: gradient,
        fill: true, borderWidth: 2,
        pointRadius: 4, pointBackgroundColor: green,
        pointHoverRadius: 6, tension: 0.35,
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      animation: { duration: 400 },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: cv('--bg-card'), borderColor: border, borderWidth: 1,
          titleColor: textM, bodyColor: cv('--text'), padding: 10, cornerRadius: 8,
          callbacks: { label: ctx => ` ${cop(ctx.parsed.y)}` },
        },
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: textM, font: { size: 11, family: font } },
          border: { display: false },
        },
        y: {
          grid: { color: border, drawBorder: false },
          ticks: { color: textM, font: { size: 11, family: font }, callback: v => copShort(v), maxTicksLimit: 5 },
          border: { display: false },
        },
      },
    },
  });
}

// ── Próximas operaciones ──────────────────────────────────────────────────────
const PROX_OP_OVERDUE_DAYS = 10;
let _proxOpsIndex = {};
let _pendingProxOpKey = null;

function _loadSkippedOps() {
  try { return new Set(JSON.parse(localStorage.getItem('moni_skipped_ops') || '[]')); }
  catch (_) { return new Set(); }
}
function _saveSkippedOps(set) {
  try { localStorage.setItem('moni_skipped_ops', JSON.stringify([...set])); } catch (_) {}
}

function skipProximaOperacion(key) {
  const set = _loadSkippedOps();
  set.add(key);
  _saveSkippedOps(set);
  renderProximasOperaciones();
}

function materializeProximaOperacion(key) {
  const op = _proxOpsIndex[key];
  if (!op) return;
  _pendingProxOpKey = key;
  if (op.type === 'deuda') openDeudaPayFormById(op.sourceId);
  else if (op.type === 'inversion') openInvYieldFormById(op.sourceId);
  else if (op.type === 'recurrente') openRecurrenteMaterializeFormById(op.sourceId, op.dateISO);
}

// Called by crudOp/apiAction right after a save succeeds, and by closeModal
// on cancel — only marks the op as done if it was actually registered.
function resolvePendingProxOp() {
  if (!_pendingProxOpKey) return;
  skipProximaOperacion(_pendingProxOpKey);
  _pendingProxOpKey = null;
}

function renderProximasOperaciones() {
  const el = document.getElementById('dash-upcoming');
  if (!el) return;

  const now   = new Date(); now.setHours(0,0,0,0);
  const past  = new Date(now.getTime() - PROX_OP_OVERDUE_DAYS * 86400000);
  const limit = new Date(now.getTime() + 45 * 86400000);
  let events = [];

  // Deudas — proxima_cuota
  S.deudas.filter(d => tieneSaldo(d) && d.proxima_cuota).forEach(d => {
    const date = new Date(d.proxima_cuota.split('T')[0] + 'T12:00:00'); date.setHours(0,0,0,0);
    if (date >= past && date <= limit)
      events.push({ date, label: d.nombre, sub: 'Cuota deuda', monto: -d.cuota_mensual, color: 'var(--red)', type: 'deuda', sourceId: d._id });
  });

  // Inversiones fijas con pago mensual
  S.inversiones.filter(i => i.tipo === 'fija' && i.pago === 'mensual' && i.dia_pago && i.tasa_ea).forEach(inv => {
    let next = new Date(now.getFullYear(), now.getMonth(), inv.dia_pago);
    if (next < now) next = new Date(now.getFullYear(), now.getMonth() + 1, inv.dia_pago);
    if (next <= limit) {
      const mv = ((1 + inv.tasa_ea / 100) ** (1/12) - 1) * 100;
      const rend = Math.round(inv.monto_invertido * mv / 100);
      events.push({ date: next, label: inv.nombre, sub: 'Rendimiento', monto: rend, color: 'var(--green)', type: 'inversion', sourceId: inv._id });
    }
  });

  // Recurrentes activos
  if (typeof nextPaymentDate === 'function' && typeof FRECUENCIAS !== 'undefined') {
    S.recurrentes.filter(r => r.activo && r.fecha_inicio).forEach(r => {
      const next = nextPaymentDate(r.fecha_inicio, r.frecuencia);
      if (next && next >= past && next <= limit) {
        const isIng = r.tipo === 'ingreso';
        const frecLabel = FRECUENCIAS[r.frecuencia]?.label || r.frecuencia;
        events.push({ date: next, label: r.nombre, sub: frecLabel, monto: isIng ? r.monto : -r.monto, color: isIng ? 'var(--green)' : 'var(--red)', type: 'recurrente', sourceId: r._id });
      }
    });
  }

  events.sort((a,b) => a.date - b.date);
  events.forEach(e => {
    e.dateISO = e.date.toISOString().slice(0, 10);
    e.key = `${e.type}:${e.sourceId}:${e.dateISO}`;
  });

  const candidateKeys = new Set(events.map(e => e.key));
  const skipped = _loadSkippedOps();
  let prunedSkip = false;
  [...skipped].forEach(k => { if (!candidateKeys.has(k)) { skipped.delete(k); prunedSkip = true; } });
  if (prunedSkip) _saveSkippedOps(skipped);
  events = events.filter(e => !skipped.has(e.key));

  _proxOpsIndex = {};
  events.forEach(e => { _proxOpsIndex[e.key] = e; });

  if (!events.length) {
    el.innerHTML = `<div style="font-size:var(--text-base);color:var(--text-muted);padding:var(--sp-4) 0">Sin operaciones en los próximos 45 días.</div>`;
    return;
  }

  el.innerHTML = events.slice(0, 20).map(e => {
    const days      = Math.round((e.date - now) / 86400000);
    const overdue   = days < 0;
    const daysStr   = days === 0 ? 'hoy' : days === 1 ? 'mañana' : overdue ? `vencido ${Math.abs(days)}d` : `en ${days}d`;
    const daysColor = overdue ? 'var(--red)' : 'var(--text-muted)';
    const prefix    = e.monto >= 0 ? '+' : '−';
    return `
    <div class="prox-op-row" style="display:flex;align-items:center;justify-content:space-between;padding:var(--sp-4) 0;border-bottom:1px solid var(--border);gap:var(--sp-3)">
      <div class="prox-op-main" style="display:flex;flex-direction:column;gap:var(--sp-1);min-width:0;flex:1">
        <div style="font-size:var(--text-base);font-weight:600;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escHtml(e.label)}</div>
        <div style="font-size:var(--text-xs);color:var(--text-muted)">${e.sub}</div>
      </div>
      <div style="display:flex;flex-direction:column;align-items:flex-end;gap:var(--sp-1);flex-shrink:0">
        <div style="font-size:var(--text-base);font-weight:700;color:${e.color};white-space:nowrap;font-family:var(--font-mono)">${prefix}${cop(Math.abs(e.monto))}</div>
        <div style="font-size:var(--text-xs);font-weight:700;color:${daysColor};white-space:nowrap">${daysStr}</div>
      </div>
      <div class="prox-op-actions" style="display:flex;gap:var(--sp-2);flex-shrink:0;margin-left:var(--sp-3)">
        <button class="btn btn-dim btn-sm" style="color:var(--red)" onclick="skipProximaOperacion('${e.key}')" title="No tomar esta vez">✕</button>
        <button class="btn btn-accent btn-sm" onclick="materializeProximaOperacion('${e.key}')" title="Registrar">✓</button>
      </div>
    </div>`;
  }).join('');
  el.lastElementChild.style.borderBottom = 'none';
}

// ── Gastos treemap ────────────────────────────────────────────────────────────
let _chartGastos  = null;
let _gastosPeriod = '1M';

function setGastosPeriod(p) {
  _gastosPeriod = p;
  document.querySelectorAll('#gastos-period-pills .period-btn')
    .forEach(b => b.classList.toggle('sel', b.dataset.period === p));
  renderGastosBar();
}

function _gastosTxInPeriod() {
  const now  = new Date(); now.setHours(23, 59, 59, 999);
  const from = new Date(now);
  if      (_gastosPeriod === '1W') from.setDate(from.getDate() - 7);
  else if (_gastosPeriod === '1M') from.setMonth(from.getMonth() - 1);
  else if (_gastosPeriod === '3M') from.setMonth(from.getMonth() - 3);
  else if (_gastosPeriod === '6M') from.setMonth(from.getMonth() - 6);
  else if (_gastosPeriod === '1Y') from.setFullYear(from.getFullYear() - 1);
  else return S.transacciones.filter(t => t.tipo === 'gasto');
  from.setHours(0, 0, 0, 0);
  return S.transacciones.filter(t => t.tipo === 'gasto' && new Date(normDate(t.fecha)) >= from);
}

function _redHeat(t) {
  return `hsl(7, 64%, ${86 - t * 56}%)`;
}

function renderGastosBar() {
  const canvas = document.getElementById('chart-gastos-bar');
  if (!canvas) return;
  if (_chartGastos) { _chartGastos.destroy(); _chartGastos = null; }

  const grouped   = {};
  const groupedTx = {};
  _gastosTxInPeriod().forEach(t => {
    const k = t.categoria || 'Otros';
    grouped[k] = (grouped[k] || 0) + t.monto;
    (groupedTx[k] ||= []).push(t);
  });
  const entries = Object.entries(grouped).sort((a, b) => b[1] - a[1]);
  const values  = entries.map(([, v]) => v);
  const vMin    = Math.min(...values);
  const vMax    = Math.max(...values);

  const wrap = document.getElementById('gastos-bar-wrap');
  if (!entries.length) {
    canvas.style.display = 'none';
    const existing = wrap.querySelector('.gastos-empty');
    if (!existing) {
      const msg = document.createElement('div');
      msg.className = 'gastos-empty';
      msg.style.cssText = 'position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:var(--text-base);color:var(--text-muted)';
      msg.textContent = 'Sin gastos para este período';
      wrap.appendChild(msg);
    }
    return;
  }
  canvas.style.display = '';
  wrap.querySelector('.gastos-empty')?.remove();

  const font = cv('--font-mono').split(',')[0].replace(/['"]/g, '').trim();

  _chartGastos = new Chart(canvas, {
    type: 'treemap',
    data: {
      datasets: [{
        tree: entries.map(([cat, v]) => ({ cat, v })),
        key: 'v',
        groups: ['cat'],
        spacing: 2,
        borderWidth: 0,
        borderRadius: 4,
        backgroundColor: (ctx) => {
          if (!ctx.raw) return 'transparent';
          const t = vMax > vMin ? (ctx.raw.v - vMin) / (vMax - vMin) : 0.5;
          return _redHeat(t);
        },
        labels: {
          display: true,
          formatter: (ctx) => ctx.raw.g ? [ctx.raw.g, copShort(ctx.raw.v)] : '',
          color: (ctx) => {
            if (!ctx.raw) return '#ffffff';
            const t = vMax > vMin ? (ctx.raw.v - vMin) / (vMax - vMin) : 0.5;
            return (86 - t * 56) > 60 ? ['#5c2318', 'rgba(92,35,24,0.7)'] : ['#ffffff', 'rgba(255,255,255,0.75)'];
          },
          font: [{ size: 12, weight: '700', family: font }, { size: 10, family: font }],
          overflow: 'fit',
        },
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      animation: { duration: 400 },
      plugins: {
        legend: { display: false },
        tooltip: {
          enabled: false,
          external: (context) => {
            const el = document.getElementById('gastos-tooltip');
            if (!el) return;
            const { tooltip } = context;
            if (tooltip.opacity === 0) { el.style.opacity = 0; return; }

            const raw = tooltip.dataPoints?.[0]?.raw;
            if (!raw?.g) { el.style.opacity = 0; return; }

            const MAX   = 8;
            const all   = (groupedTx[raw.g] || []).slice().sort((a, b) => b.fecha.localeCompare(a.fecha));
            const shown = all.slice(0, MAX);
            const rows  = shown.map(t => {
              const d = new Date(normDate(t.fecha).split('T')[0] + 'T12:00:00');
              const dateStr = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
              return `
              <div class="tt-row">
                <span class="tt-date">${dateStr}</span>
                <span class="tt-desc">${escHtml(t.descripcion || t.categoria)}</span>
                <span class="tt-amt">${cop(t.monto)}</span>
              </div>`;
            }).join('');
            const more  = all.length > MAX ? `<div class="tt-more">+${all.length - MAX} más</div>` : '';

            el.innerHTML = `<div class="tt-title">${escHtml(raw.g)} · ${cop(raw.v)}</div>${rows}${more}`;

            const wrap   = el.parentElement;
            const maxLeft = Math.max(8, wrap.clientWidth  - el.offsetWidth  - 8);
            const maxTop  = Math.max(8, wrap.clientHeight - el.offsetHeight - 8);
            el.style.left = Math.max(8, Math.min(tooltip.caretX + 14, maxLeft)) + 'px';
            el.style.top  = Math.max(8, Math.min(tooltip.caretY + 14, maxTop))  + 'px';
            el.style.opacity = 1;
          },
        },
      },
    },
  });
}
