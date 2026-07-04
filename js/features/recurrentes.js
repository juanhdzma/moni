const FRECUENCIAS = {
  semanal:    { label: 'Semanal',    factor: 52 / 12 },
  quincenal:  { label: 'Quincenal', factor: 2 },
  mensual:    { label: 'Mensual',   factor: 1 },
  bimestral:  { label: 'Bimestral', factor: 1 / 2 },
  trimestral: { label: 'Trimestral',factor: 1 / 3 },
  semestral:  { label: 'Semestral', factor: 1 / 6 },
  anual:      { label: 'Anual',     factor: 1 / 12 },
};

function toMensual(monto, frecuencia) {
  return monto * (FRECUENCIAS[frecuencia]?.factor ?? 1);
}

// ── Forms ─────────────────────────────────────────────────────────────────────
function openRecurrenteFormById(id) {
  openRecurrenteForm(S.recurrentes.find(r => r._id === id) || null);
}

function openRecurrenteForm(item = null) {
  const isEdit = item !== null;
  const tipo   = item?.tipo || 'suscripcion';
  const frecOpts = Object.entries(FRECUENCIAS).map(([k, v]) =>
    `<option value="${k}" ${(item?.frecuencia||'mensual')===k?'selected':''}>${v.label}</option>`).join('');

  openModal(isEdit ? 'Editar recurrente' : 'Nuevo recurrente', `
    <div class="form-group">
      <label class="form-label">Nombre</label>
      <input class="form-input" type="text" id="m-nombre" maxlength="40" value="${escHtml(item?.nombre||'')}" placeholder="Ej. Netflix" />
    </div>
    <div class="form-group">
      <label class="form-label">Tipo</label>
      <div class="tipo-toggle">
        <button type="button" id="rt-ingreso" class="tipo-btn ingreso ${tipo==='ingreso'?'sel':''}" onclick="setRecTipo('ingreso')">Ingreso</button>
        <button type="button" id="rt-gasto"   class="tipo-btn gasto   ${tipo==='gasto'  ?'sel':''}" onclick="setRecTipo('gasto')">Gasto</button>
      </div>
      <input type="hidden" id="m-rec-tipo" value="${tipo !== 'ingreso' ? 'gasto' : tipo}" />
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--sp-5)">
      <div class="form-group">
        <label class="form-label">Monto (COP)</label>
        <div class="money-wrap"><span class="money-pfx">$</span>
          <input class="form-input" type="text" inputmode="numeric" id="m-monto"
            value="${item ? numToInput(item.monto) : ''}" placeholder="0" oninput="fmtMoneyInput(this)" />
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Frecuencia</label>
        <select class="form-input" id="m-frecuencia">${frecOpts}</select>
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">Fecha inicio (opcional)</label>
      <input class="form-input" type="date" id="m-fecha" value="${item?.fecha_inicio?.split('T')[0]||''}" />
    </div>
    <div class="form-group">
      <label class="form-label" style="text-transform:none;letter-spacing:0;font-size:var(--text-sm);color:var(--text-secondary)">Notas (opcional)</label>
      <input class="form-input" type="text" id="m-notas" maxlength="30" value="${escHtml(item?.notas||'')}" placeholder="" />
    </div>
    <div class="modal-footer">
      <button class="btn btn-accent" onclick="saveRecurrente(${isEdit ? item._id : 'null'})">${isEdit ? 'Guardar cambios' : 'Agregar'}</button>
      ${isEdit ? `<button class="btn btn-danger" onclick="deleteRecurrente(${item._id})">Eliminar</button>` : ''}
      <button class="btn btn-dim" style="margin-left:auto" onclick="closeModal()">Cancelar</button>
    </div>
    <div class="form-status" id="m-status" style="margin-top:var(--sp-3)"></div>
  `);
}

function setRecTipo(tipo) {
  document.getElementById('m-rec-tipo').value = tipo;
  ['ingreso', 'gasto'].forEach(t => {
    document.getElementById('rt-' + t)?.classList.toggle('sel', t === tipo);
  });
}

function nextPaymentDate(fechaInicio, frecuencia) {
  if (!fechaInicio) return null;
  const start = new Date(fechaInicio);
  if (isNaN(start)) return null;
  const now = new Date(); now.setHours(0,0,0,0);

  if (frecuencia === 'semanal' || frecuencia === 'quincenal') {
    const days = frecuencia === 'semanal' ? 7 : 14;
    let next = new Date(start);
    while (next < now) next = new Date(next.getTime() + days * 86400000);
    return next;
  }
  const monthMap = { mensual:1, bimestral:2, trimestral:3, semestral:6, anual:12 };
  const months = monthMap[frecuencia];
  if (!months) return null;
  let next = new Date(start);
  while (next < now) { next = new Date(next); next.setMonth(next.getMonth() + months); }
  return next;
}

function nextPaymentStr(fechaInicio, frecuencia) {
  const next = nextPaymentDate(fechaInicio, frecuencia);
  if (!next) return null;
  const now = new Date(); now.setHours(0,0,0,0);
  const days = Math.round((next - now) / 86400000);
  if (days === 0) return 'hoy';
  return `en ${days}d`;
}

async function saveRecurrente(id) {
  const nombre    = document.getElementById('m-nombre').value.trim();
  const tipo      = document.getElementById('m-rec-tipo').value;
  const monto     = parseMoneyInput(document.getElementById('m-monto'));
  const frecuencia = document.getElementById('m-frecuencia').value;
  const fecha     = document.getElementById('m-fecha').value;
  const notas     = document.getElementById('m-notas').value.trim();

  if (!nombre) { setModalStatus('err', 'Nombre requerido'); return; }
  if (!monto)  { setModalStatus('err', 'Monto requerido'); return; }

  const activoActual = id !== null ? (S.recurrentes.find(r => r._id === id)?.activo ?? true) : true;
  const data = { nombre, tipo, monto, frecuencia, activo: activoActual, fecha_inicio: fecha, notas };

  setModalStatus('', 'Guardando...');
  try {
    if (id !== null) await crudOp('rec', 'update', { ...data, _id: id });
    else await crudOp('rec', 'add', data);
  } catch(err) { setModalStatus('err', '❌ ' + err.message); }
}

async function deleteRecurrente(id) {
  const r = S.recurrentes.find(x => x._id === id);
  if (!confirm(`¿Eliminar "${r?.nombre}"?`)) return;
  await crudOp('rec', 'delete', { _id: id });
}

function toggleRecurrente(id) {
  const idx = S.recurrentes.findIndex(r => r._id === id);
  if (idx < 0) return;
  S.recurrentes[idx] = { ...S.recurrentes[idx], activo: !S.recurrentes[idx].activo };
  renderRecurrentes();
  crudOp('rec', 'update', { ...S.recurrentes[idx], _id: id });
}

// ── Materializar (desde próximas operaciones) ────────────────────────────────
function openRecurrenteMaterializeFormById(id, dateISO) {
  const r = S.recurrentes.find(x => x._id === id);
  if (!r) return;
  const isIng    = r.tipo === 'ingreso';
  const cats     = CATEGORIES[isIng ? 'ingreso' : 'gasto'] || [];
  const catGuess = cats.includes(r.nombre) ? r.nombre : cats[cats.length - 1];

  openModal(`Registrar · ${r.nombre}`, `
    <div class="form-group">
      <label class="form-label">Categoría</label>
      <select class="form-input" id="m-cat">
        ${cats.map(c => `<option ${c === catGuess ? 'selected' : ''}>${escHtml(c)}</option>`).join('')}
      </select>
    </div>
    <div class="form-group">
      <label class="form-label">Descripción</label>
      <input class="form-input" type="text" id="m-desc" maxlength="30" value="${escHtml(r.nombre)}" />
    </div>
    <div class="form-group">
      <label class="form-label">Monto (COP)</label>
      <div class="money-wrap"><span class="money-pfx">$</span>
        <input class="form-input" type="text" inputmode="numeric" id="m-monto"
          value="${numToInput(r.monto)}" placeholder="0" oninput="fmtMoneyInput(this)" />
      </div>
      <div style="font-size:var(--text-xs);color:var(--text-secondary);margin-top:5px">Pre-llenado con el monto recurrente — ajustá si difiere.</div>
    </div>
    <div class="form-group">
      <label class="form-label">Fecha</label>
      <input class="form-input" type="date" id="m-fecha" value="${dateISO}" />
    </div>
    <div class="form-group">
      <label class="form-label" style="text-transform:none;letter-spacing:0;font-size:var(--text-sm);color:var(--text-secondary)">Notas (opcional)</label>
      <input class="form-input" type="text" id="m-notas" maxlength="30" placeholder="" />
    </div>
    <div class="modal-footer">
      <button class="btn btn-accent" onclick="saveRecurrenteMaterialize(${id})">Registrar</button>
      <button class="btn btn-dim" style="margin-left:auto" onclick="closeModal()">Cancelar</button>
    </div>
    <div class="form-status" id="m-status" style="margin-top:8px"></div>
  `);
}

async function saveRecurrenteMaterialize(id) {
  const r = S.recurrentes.find(x => x._id === id);
  if (!r) return;

  const categoria   = document.getElementById('m-cat').value;
  const descripcion = document.getElementById('m-desc').value.trim();
  const monto       = parseMoneyInput(document.getElementById('m-monto'));
  const fechaDate   = document.getElementById('m-fecha').value;
  const notas       = document.getElementById('m-notas').value.trim();

  if (!monto || monto <= 0) { setModalStatus('err', 'Ingresá un monto válido'); return; }
  if (!fechaDate)           { setModalStatus('err', 'Fecha requerida'); return; }

  const fecha = `${fechaDate}T00:00`;
  await crudOp('tx', 'add', { fecha, tipo: r.tipo === 'ingreso' ? 'ingreso' : 'gasto', categoria, descripcion, monto, notas });
}

// ── Render ────────────────────────────────────────────────────────────────────
function renderRecurrentes() {
  const sumEl  = document.getElementById('rec-total');
  const secIng = document.getElementById('rec-ingresos');
  const secGas = document.getElementById('rec-gastos');
  if (!sumEl) return;

  const activos  = S.recurrentes.filter(r => r.activo);
  const totalGas = activos.filter(r => r.tipo !== 'ingreso').reduce((s,r) => s + toMensual(r.monto, r.frecuencia), 0);
  const totalIng = activos.filter(r => r.tipo === 'ingreso').reduce((s,r) => s + toMensual(r.monto, r.frecuencia), 0);
  const neto     = totalIng - totalGas;

  sumEl.innerHTML = `
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr">
      <div style="padding:0 var(--sp-9);border-right:1px solid var(--border);text-align:center">
        <div class="stat-label">Ingresos/mes</div>
        <div class="stat-value" style="color:var(--green)">${cop(totalIng)}</div>
        <div class="stat-sub">recurrentes activos</div>
      </div>
      <div style="padding:0 var(--sp-9);border-right:1px solid var(--border);text-align:center">
        <div class="stat-label">Gastos/mes</div>
        <div class="stat-value" style="color:var(--red)">${cop(totalGas)}</div>
        <div class="stat-sub">recurrentes activos</div>
      </div>
      <div style="padding:0 var(--sp-9);text-align:center">
        <div class="stat-label">Neto mensual</div>
        <div class="stat-value" style="color:${neto>=0?'var(--green)':'var(--red)'}">${signStr(neto)}${cop(Math.abs(neto))}</div>
        <div class="stat-sub">ingresos − gastos</div>
      </div>
    </div>`;

  const recCard = (r) => {
    const mensual   = toMensual(r.monto, r.frecuencia);
    const frecLabel = FRECUENCIAS[r.frecuencia]?.label || r.frecuencia;
    const isIng    = r.tipo === 'ingreso';
    const valColor = isIng ? 'var(--green)' : 'var(--red)';
    const nextStr   = r.activo ? nextPaymentStr(r.fecha_inicio, r.frecuencia) : null;
    return `
    <div style="display:flex;justify-content:space-between;align-items:center;padding:var(--sp-5) var(--sp-7);background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius);box-shadow:var(--shadow-xs);opacity:${r.activo?1:0.45};transition:opacity 0.2s">
      <div style="min-width:0;flex:1">
        <div style="font-size:var(--text-md);font-weight:700;color:var(--text);margin-bottom:var(--sp-1)">${escHtml(r.nombre)}</div>
        <div style="display:flex;align-items:center;gap:var(--sp-3)">
          <span style="font-size:var(--text-xs);color:var(--text-muted)">${frecLabel} · ${cop(r.monto)}</span>
          ${nextStr ? `<span style="font-size:var(--text-xs);color:var(--text-secondary);font-weight:600">${nextStr}</span>` : ''}
        </div>
        ${r.notas ? `<div style="font-size:var(--text-xs);color:var(--text-muted);margin-top:var(--sp-1);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escHtml(r.notas)}</div>` : ''}
      </div>
      <div style="display:flex;align-items:center;gap:var(--sp-5);flex-shrink:0;margin-left:var(--sp-5)">
        <div style="text-align:right">
          <div style="font-size:var(--text-xl);font-weight:700;color:${valColor};font-family:var(--font-mono)">${cop(mensual)}</div>
          <div style="font-size:var(--text-xs);color:var(--text-muted)">por mes</div>
        </div>
        <div style="display:flex;gap:var(--sp-2)">
          <button class="btn btn-dim btn-sm" onclick="toggleRecurrente(${r._id})" title="${r.activo?'Pausar':'Activar'}">${r.activo ? '⏸' : '▶'}</button>
          <button class="btn btn-dim btn-sm" onclick="openRecurrenteFormById(${r._id})">Editar</button>
        </div>
      </div>
    </div>`;
  };

  const renderSection = (el, items, emptyMsg) => {
    if (!el) return;
    el.innerHTML = items.length
      ? items.sort((a,b) => toMensual(b.monto,b.frecuencia) - toMensual(a.monto,a.frecuencia)).map(recCard).join('')
      : `<div style="font-size:var(--text-base);color:var(--text-muted);padding:var(--sp-5) 0">${emptyMsg}</div>`;
  };

  renderSection(secIng, S.recurrentes.filter(r => r.tipo === 'ingreso'), 'Sin ingresos recurrentes.');
  renderSection(secGas, S.recurrentes.filter(r => r.tipo !== 'ingreso'), 'Sin gastos recurrentes.');
}
