// ── Sort state ───────────────────────────────────────────────────────────────
const txSort = { col: 'fecha', dir: -1 }; // -1 desc, 1 asc

function setTxSort(col) {
  if (txSort.col === col) {
    txSort.dir *= -1;
  } else {
    txSort.col = col;
    txSort.dir = (col === 'fecha' || col === 'monto') ? -1 : 1;
  }
  document.querySelectorAll('.th-sort').forEach(th => {
    th.classList.remove('active', 'asc', 'desc');
    if (th.dataset.col === txSort.col) {
      th.classList.add('active', txSort.dir === 1 ? 'asc' : 'desc');
    }
  });
  renderTransacciones();
}

// ── Form (ingreso / gasto únicamente) ────────────────────────────────────────
function openTxFormById(id) {
  openTxForm(S.transacciones.find(t => t._id === id) || null);
}

function openTxForm(tx = null) {
  if (tx?.tipo === 'transfer') return; // los transfers son auto, no editables
  const isEdit = tx !== null;
  const tipo   = tx?.tipo || 'gasto';
  const cats   = CATEGORIES[tipo] || [];

  openModal(isEdit ? 'Editar movimiento' : 'Nuevo movimiento', `
    <div class="form-group">
      <label class="form-label">Tipo</label>
      <div class="tipo-toggle">
        <button type="button" class="tipo-btn ingreso ${tipo==='ingreso'?'sel':''}" onclick="txTipoChange('ingreso')">Ingreso</button>
        <button type="button" class="tipo-btn gasto ${tipo==='gasto'?'sel':''}"   onclick="txTipoChange('gasto')">Gasto</button>
      </div>
      <input type="hidden" id="m-tipo" value="${tipo}" />
    </div>
    <div class="form-group">
      <label class="form-label">Categoría</label>
      <div style="display:flex;gap:8px;align-items:center">
        <select class="form-input" id="m-cat" style="flex:1">
          ${cats.map(c => `<option ${tx?.categoria===c?'selected':''}>${escHtml(c)}</option>`).join('')}
        </select>
        <button type="button" class="btn btn-dim btn-sm" style="flex-shrink:0;font-size:var(--text-xl);padding:var(--sp-2) var(--sp-5)"
          onclick="toggleNewCat()" title="Agregar categoría">+</button>
      </div>
      <div id="new-cat-wrap" style="display:none;margin-top:8px">
        <div style="display:flex;gap:8px">
          <input class="form-input" type="text" id="new-cat-name" maxlength="25" placeholder="Nueva categoría"
            onkeydown="if(event.key==='Enter')saveTxNewCat()" />
          <button class="btn btn-accent btn-sm" onclick="saveTxNewCat()">Ok</button>
        </div>
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">Descripción</label>
      <input class="form-input" type="text" id="m-desc" maxlength="30" value="${escHtml(tx?.descripcion||'')}" placeholder="Ej. Mercado Éxito" />
    </div>
    <div class="form-group">
      <label class="form-label">Monto (COP)</label>
      <div class="money-wrap"><span class="money-pfx">$</span>
        <input class="form-input" type="text" inputmode="numeric" id="m-monto"
          value="${tx ? numToInput(tx.monto) : ''}" placeholder="0" oninput="fmtMoneyInput(this)" />
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">Fecha</label>
      <input class="form-input" type="datetime-local" id="m-fecha" value="${tx ? normDate(tx.fecha) : nowStr()}" />
    </div>
    <div class="form-group">
      <label class="form-label" style="text-transform:none;letter-spacing:0;font-size:var(--text-sm);color:var(--text-secondary)">Notas (opcional)</label>
      <input class="form-input" type="text" id="m-notas" maxlength="30" value="${escHtml(tx?.notas||'')}" placeholder="Notas adicionales" />
    </div>
    <div class="modal-footer">
      <button class="btn btn-accent" onclick="saveTx(${isEdit ? tx._id : 'null'})">${isEdit ? 'Guardar cambios' : 'Agregar'}</button>
      ${isEdit ? `<button class="btn btn-danger" onclick="deleteTx(${tx._id})">Eliminar</button>` : ''}
      <button class="btn btn-dim" style="margin-left:auto" onclick="closeModal()">Cancelar</button>
    </div>
    <div class="form-status" id="m-status" style="margin-top:8px"></div>
  `);
}

function txTipoChange(tipo) {
  document.getElementById('m-tipo').value = tipo;
  document.querySelectorAll('.tipo-toggle .tipo-btn').forEach(b => b.classList.remove('sel'));
  document.querySelector(`.tipo-btn.${tipo}`)?.classList.add('sel');
  document.getElementById('m-cat').innerHTML =
    (CATEGORIES[tipo] || []).map(c => `<option>${escHtml(c)}</option>`).join('');
  const wrap = document.getElementById('new-cat-wrap');
  if (wrap) wrap.style.display = 'none';
}

function toggleNewCat() {
  const wrap = document.getElementById('new-cat-wrap');
  if (!wrap) return;
  const open = wrap.style.display === 'none';
  wrap.style.display = open ? 'block' : 'none';
  if (open) document.getElementById('new-cat-name')?.focus();
}

function saveTxNewCat() {
  const input  = document.getElementById('new-cat-name');
  const tipo   = document.getElementById('m-tipo').value;
  const nombre = input?.value.trim();
  if (!nombre) return;
  if (addCustomCategory(tipo, nombre)) {
    const sel = document.getElementById('m-cat');
    const opt = document.createElement('option');
    opt.textContent = nombre;
    opt.selected = true;
    sel.appendChild(opt);
  }
  document.getElementById('new-cat-wrap').style.display = 'none';
  if (input) input.value = '';
}

async function saveTx(id) {
  const tipo        = document.getElementById('m-tipo').value;
  const categoria   = document.getElementById('m-cat').value;
  const descripcion = document.getElementById('m-desc').value.trim();
  const monto       = parseMoneyInput(document.getElementById('m-monto'));
  const fechaDate   = document.getElementById('m-fecha').value;
  const notas       = document.getElementById('m-notas').value.trim();

  if (!monto || monto <= 0) { setModalStatus('err', 'Ingresá un monto válido'); return; }
  if (!fechaDate)           { setModalStatus('err', 'Fecha requerida'); return; }

  const fecha = fechaDate.includes('T') ? fechaDate : `${fechaDate}T00:00`;

  const data = { fecha, tipo, categoria, descripcion, monto, notas };

  setModalStatus('', 'Guardando...');
  try {
    if (id !== null) await crudOp('tx', 'update', { ...data, _id: id });
    else await crudOp('tx', 'add', data);
  } catch (err) { setModalStatus('err', '❌ ' + err.message); }
}

async function deleteTx(id) {
  if (!confirm('¿Eliminar este movimiento?')) return;
  try {
    await crudOp('tx', 'delete', { _id: id });
  } catch (err) { showBanner(err.message); }
}

// ── Date grouping ─────────────────────────────────────────────────────────────
function _startOfWeek(d) {
  const day  = d.getDay(); // 0=Dom, 1=Lun, ...
  const diff = day === 0 ? 6 : day - 1; // días desde el lunes
  const monday = new Date(d);
  monday.setDate(d.getDate() - diff);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

function txDateBucket(fecha, now) {
  const d      = new Date(normDate(fecha).split('T')[0] + 'T12:00:00');
  const today  = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dOnly  = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diffDays = Math.round((today - dOnly) / 86400000);

  if (diffDays === 0) return 'Hoy';
  if (diffDays === 1) return 'Ayer';
  if (dOnly >= _startOfWeek(today)) return 'Esta semana';
  if (d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()) return 'Este mes';

  const mes = d.toLocaleDateString('es-CO', { month: 'long' });
  return `${mes.charAt(0).toUpperCase()}${mes.slice(1)} - ${d.getFullYear()}`;
}

// ── Render ────────────────────────────────────────────────────────────────────
function txRow(t) {
  const label     = t.tipo === 'ingreso' ? 'Ingreso' : t.tipo === 'gasto' ? 'Gasto' : 'Auto';
  const color     = t.tipo === 'ingreso' ? 'var(--positive)' : t.tipo === 'gasto' ? 'var(--negative)' : 'var(--transfer)';
  const prefix    = t.tipo === 'ingreso' ? '+' : '−';
  const clickAttr = t.tipo === 'transfer' ? '' : `onclick="openTxFormById(${t._id})" style="cursor:pointer"`;
  return `
    <tr ${clickAttr}>
      <td data-label="Fecha">${fmtDate(t.fecha)}</td>
      <td data-label="Tipo"><span class="badge badge-${t.tipo}">${label}</span></td>
      <td data-label="Categoría">${escHtml(t.categoria)}</td>
      <td data-label="Descripción">${escHtml(t.descripcion) || '—'}</td>
      <td data-label="Monto" style="font-weight:600;color:${color}">${prefix}${cop(t.monto)}</td>
    </tr>`;
}

function renderTransacciones() {
  const tipo = document.getElementById('f-tipo-filter')?.value || '';
  const mes  = document.getElementById('f-mes-filter')?.value  || '';
  const cat  = document.getElementById('f-cat-filter')?.value  || '';

  let list = S.transacciones
    .filter(t => t.tipo !== 'transfer')
    .sort((a, b) => {
      const av = a[txSort.col], bv = b[txSort.col];
      if (txSort.col === 'monto') return (av - bv) * txSort.dir;
      return String(av ?? '').localeCompare(String(bv ?? '')) * txSort.dir;
    });
  if (tipo) list = list.filter(t => t.tipo === tipo);
  if (mes)  list = list.filter(t => txMonth(t) === mes);
  if (cat)  list = list.filter(t => t.categoria === cat);

  const tbody = document.getElementById('tx-tbody');
  if (!tbody) return;

  if (!list.length) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;color:var(--text-secondary);padding:56px">
      <div style="font-size:var(--text-4xl);margin-bottom:10px;opacity:.3">📋</div>
      <div style="font-size:var(--text-md);font-weight:600;margin-bottom:4px">Sin movimientos</div>
      <div style="font-size:var(--text-sm)">Agregá un ingreso o gasto con el botón de arriba.</div>
    </td></tr>`;
    return;
  }

  if (txSort.col !== 'fecha') {
    tbody.innerHTML = list.map(txRow).join('');
    return;
  }

  const now = new Date();
  let lastBucket = null;
  const rows = [];
  list.forEach(t => {
    const bucket = txDateBucket(t.fecha, now);
    if (bucket !== lastBucket) {
      rows.push(`<tr class="tx-group-row"><td class="tx-group-label" colspan="5">${bucket}</td></tr>`);
      lastBucket = bucket;
    }
    rows.push(txRow(t));
  });
  tbody.innerHTML = rows.join('');
}

function buildTxFilters() {
  const meses = [...new Set(S.transacciones.map(t => txMonth(t)))].sort().reverse();
  const mesEl = document.getElementById('f-mes-filter');
  if (mesEl) {
    const cur = mesEl.value;
    mesEl.innerHTML = '<option value="">Todos los meses</option>' +
      meses.map(m => {
        const [y, mo] = m.split('-');
        const label = new Date(+y, +mo - 1, 1).toLocaleDateString('es-CO', { month: 'long', year: 'numeric' });
        return `<option value="${m}" ${cur === m ? 'selected' : ''}>${label}</option>`;
      }).join('');
  }
  const cats = [...new Set(S.transacciones.map(t => t.categoria))].sort();
  const catEl = document.getElementById('f-cat-filter');
  if (catEl) {
    const cur = catEl.value;
    catEl.innerHTML = '<option value="">Todas las categorías</option>' +
      cats.map(c => `<option value="${escHtml(c)}" ${cur === c ? 'selected' : ''}>${escHtml(c)}</option>`).join('');
  }
}

function initTransacciones() { buildTxFilters(); renderTransacciones(); }
