// ── Add / Edit form ───────────────────────────────────────────────────────────
function openActivoFormById(id) {
  openActivoForm(S.activos.find(a => a._id === id) || null);
}

function openActivoForm(activo = null) {
  const isEdit  = activo !== null;

  openModal(isEdit ? 'Editar activo' : 'Nuevo activo', `
    <div class="form-group">
      <label class="form-label">Nombre</label>
      <input class="form-input" type="text" id="m-nombre" maxlength="40" value="${escHtml(activo?.nombre||'')}" placeholder="Ej. Apartamento Bogotá" />
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
      <div class="form-group">
        <label class="form-label">${isEdit ? 'Valor inicial' : 'Precio de compra'} (COP)</label>
        <div class="money-wrap"><span class="money-pfx">$</span>
          <input class="form-input" type="text" inputmode="numeric" id="m-val-ini"
            value="${activo ? numToInput(activo.valor_inicial) : ''}" placeholder="0" oninput="fmtMoneyInput(this)" />
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Valor actual (COP)</label>
        <div class="money-wrap"><span class="money-pfx">$</span>
          <input class="form-input" type="text" inputmode="numeric" id="m-val-act"
            value="${activo ? numToInput(activo.valor_actual) : ''}" placeholder="Igual al inicial si no cambia" oninput="fmtMoneyInput(this)" />
        </div>
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">Fecha de adquisición</label>
      <input class="form-input" type="date" id="m-fecha-adq" value="${activo?.fecha_adquisicion?.split('T')[0]||todayStr()}" />
    </div>
    ${!isEdit ? advancedToggle() : ''}
    <div class="modal-footer">
      <button class="btn btn-accent" onclick="saveActivo(${isEdit ? activo._id : 'null'})">${isEdit ? 'Guardar cambios' : 'Agregar activo'}</button>
      ${isEdit ? `<button class="btn btn-danger" onclick="deleteActivo(${activo._id})">Eliminar</button>` : ''}
      <button class="btn btn-dim" style="margin-left:auto" onclick="closeModal()">Cancelar</button>
    </div>
    <div class="form-status" id="m-status" style="margin-top:8px"></div>
  `);
}

async function saveActivo(id) {
  const nombre   = document.getElementById('m-nombre').value.trim();
  const valIni   = parseMoneyInput(document.getElementById('m-val-ini'));
  const valAct   = parseMoneyInput(document.getElementById('m-val-act'));
  const fechaAdq = document.getElementById('m-fecha-adq').value;
  const esNueva  = document.getElementById('m-es-nueva')?.checked ?? true;

  if (!nombre) { setModalStatus('err', 'Nombre requerido'); return; }
  if (!valIni) { setModalStatus('err', 'Precio de compra requerido'); return; }

  const data = { nombre, valor_inicial: valIni,
    valor_actual: valAct || valIni, fecha_adquisicion: fechaAdq };

  setModalStatus('', 'Guardando...');
  try {
    if (id !== null) await crudOp('activo', 'update', { ...data, _id: id });
    else await crudOp('activo', 'add', { ...data, crear_tx: esNueva });
  } catch(err) { setModalStatus('err', '❌ ' + err.message); }
}

async function deleteActivo(id) {
  const a = S.activos.find(x => x._id === id);
  if (!confirm(`¿Eliminar "${a?.nombre}"?`)) return;
  await crudOp('activo', 'delete', { _id: id });
}

// ── Actualizar valor ──────────────────────────────────────────────────────────
function openActivoUpdateFormById(id) {
  const a = S.activos.find(x => x._id === id);
  if (!a) return;
  const cambio    = a.valor_actual - a.valor_inicial;
  const cambioPct = a.valor_inicial > 0 ? cambio / a.valor_inicial * 100 : 0;

  openModal(`Actualizar valor · ${a.nombre}`, `
    <div style="background:var(--bg);border-radius:var(--radius-sm);padding:14px 16px;margin-bottom:18px;display:flex;justify-content:space-between;align-items:center">
      <div>
        <div style="font-size:var(--text-xs);font-weight:700;color:var(--text-secondary);text-transform:uppercase;letter-spacing:.05em;margin-bottom:3px">Valor actual</div>
        <div style="font-size:var(--text-2xl);font-weight:700">${cop(a.valor_actual)}</div>
      </div>
      <div style="text-align:right">
        <div style="font-size:var(--text-xs);color:var(--text-secondary);margin-bottom:3px">Vs. precio inicial</div>
        <div style="font-size:var(--text-md);font-weight:700;color:${cambio>=0?'var(--income-mid)':'var(--expense-mid)'}">
          ${signStr(cambio)}${cop(Math.abs(cambio))} <span style="font-size:var(--text-xs);font-weight:500">(${signStr(cambioPct)}${pct(Math.abs(cambioPct))}%)</span>
        </div>
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">Nuevo valor (COP)</label>
      <div class="money-wrap"><span class="money-pfx">$</span>
        <input class="form-input" type="text" inputmode="numeric" id="m-nuevo-valor"
          placeholder="0" oninput="fmtMoneyInput(this);calcActivoUpdate(${a.valor_actual},${a.valor_inicial})" />
      </div>
    </div>
    <div id="activo-update-preview" style="display:none;border-radius:var(--radius-sm);border:1px solid var(--border);overflow:hidden;margin-bottom:14px">
      <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 14px;border-bottom:1px solid var(--border)">
        <span style="font-size:var(--text-sm);color:var(--text-secondary)">Cambio desde último</span>
        <span style="font-size:var(--text-md);font-weight:700" id="activo-delta">—</span>
      </div>
      <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 14px">
        <span style="font-size:var(--text-sm);color:var(--text-secondary)">Variación vs precio inicial</span>
        <span style="font-size:var(--text-md);font-weight:700" id="activo-total">—</span>
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">Fecha de valoración</label>
      <input class="form-input" type="datetime-local" id="m-fecha" value="${nowStr()}" />
    </div>
    <div class="modal-footer">
      <button class="btn btn-accent" onclick="saveActivoUpdate(${a._id})">Actualizar</button>
      <button class="btn btn-dim" onclick="closeModal();openActivoFormById(${a._id})">Editar activo</button>
      <button class="btn btn-dim" style="margin-left:auto" onclick="closeModal()">Cancelar</button>
    </div>
    <div class="form-status" id="m-status" style="margin-top:8px"></div>
  `);
}

function calcActivoUpdate(valorAnterior, valorInicial) {
  const nuevo   = parseMoneyInput(document.getElementById('m-nuevo-valor'));
  const preview = document.getElementById('activo-update-preview');
  if (!nuevo) { preview.style.display = 'none'; return; }
  const delta    = nuevo - valorAnterior;
  const total    = nuevo - valorInicial;
  const totalPct = valorInicial > 0 ? total / valorInicial * 100 : 0;
  preview.style.display = 'block';
  document.getElementById('activo-delta').innerHTML =
    `<span style="color:${delta>=0?'var(--income-mid)':'var(--expense-mid)'}">${signStr(delta)}${cop(Math.abs(delta))}</span>`;
  document.getElementById('activo-total').innerHTML =
    `<span style="color:${total>=0?'var(--income-mid)':'var(--expense-mid)'}">${signStr(total)}${cop(Math.abs(total))} <span style="font-size:var(--text-xs);font-weight:500">(${signStr(totalPct)}${pct(Math.abs(totalPct))}%)</span></span>`;
}

async function saveActivoUpdate(id) {
  const nuevo = parseMoneyInput(document.getElementById('m-nuevo-valor'));
  const a     = S.activos.find(x => x._id === id);
  if (!nuevo || nuevo <= 0) { setModalStatus('err', 'Valor inválido'); return; }
  if (!a) return;
  setModalStatus('', 'Guardando...');
  try {
    await crudOp('activo', 'update', { ...a, valor_actual: nuevo, _id: id });
  } catch(err) { setModalStatus('err', '❌ ' + err.message); }
}

// ── Vender activo ─────────────────────────────────────────────────────────────
function openActivoSellFormById(id) {
  const a = S.activos.find(x => x._id === id);
  if (!a) return;
  openModal(`Vender · ${a.nombre}`, `
    <div style="background:var(--bg);border-radius:var(--radius-sm);padding:14px 16px;margin-bottom:18px;display:flex;justify-content:space-between;align-items:center">
      <div>
        <div style="font-size:var(--text-xs);font-weight:700;color:var(--text-secondary);text-transform:uppercase;letter-spacing:.05em;margin-bottom:3px">Valor actual</div>
        <div style="font-size:var(--text-2xl);font-weight:700">${cop(a.valor_actual)}</div>
      </div>
      <div style="text-align:right">
        <div style="font-size:var(--text-xs);color:var(--text-secondary);margin-bottom:3px">Precio inicial</div>
        <div style="font-size:var(--text-lg);font-weight:600">${cop(a.valor_inicial)}</div>
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">Precio de venta (COP)</label>
      <div class="money-wrap"><span class="money-pfx">$</span>
        <input class="form-input" type="text" inputmode="numeric" id="m-precio"
          value="${numToInput(a.valor_actual)}" placeholder="0"
          oninput="fmtMoneyInput(this);calcActivoSell(${a.valor_inicial},${a.valor_actual})" />
      </div>
    </div>
    <div id="activo-sell-preview" style="display:none;border-radius:var(--radius-sm);border:1px solid var(--border);overflow:hidden;margin-bottom:14px">
      <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 14px;border-bottom:1px solid var(--border)">
        <span style="font-size:var(--text-sm);color:var(--text-secondary)">Ganancia vs precio inicial</span>
        <span style="font-size:var(--text-md);font-weight:700" id="sell-gain-ini">—</span>
      </div>
      <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 14px">
        <span style="font-size:var(--text-sm);color:var(--text-secondary)">Diferencia vs último valor</span>
        <span style="font-size:var(--text-md);font-weight:700" id="sell-gain-act">—</span>
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">Fecha de venta</label>
      <input class="form-input" type="datetime-local" id="m-fecha" value="${nowStr()}" />
    </div>
    <div class="form-group">
      <label class="form-label" style="text-transform:none;letter-spacing:0;font-size:var(--text-sm);color:var(--text-secondary)">Notas (opcional)</label>
      <input class="form-input" type="text" id="m-notas" maxlength="30" placeholder="Ej. Vendido a tercero" />
    </div>
    ${advancedToggle('Registrar en transacciones', 'Desactivá si ya lo registraste en otra parte.')}
    <div class="modal-footer">
      <button class="btn btn-accent" onclick="saveActivoSell(${a._id})">Confirmar venta</button>
      <button class="btn btn-dim" style="margin-left:auto" onclick="closeModal()">Cancelar</button>
    </div>
    <div class="form-status" id="m-status" style="margin-top:8px"></div>
  `);
  calcActivoSell(a.valor_inicial, a.valor_actual);
}

function calcActivoSell(valIni, valAct) {
  const precio  = parseMoneyInput(document.getElementById('m-precio'));
  const preview = document.getElementById('activo-sell-preview');
  if (!precio) { preview.style.display = 'none'; return; }
  const vsIni = precio - valIni;
  const vsAct = precio - valAct;
  preview.style.display = 'block';
  document.getElementById('sell-gain-ini').innerHTML =
    `<span style="color:${vsIni>=0?'var(--income-mid)':'var(--expense-mid)'}">${signStr(vsIni)}${cop(Math.abs(vsIni))}</span>`;
  document.getElementById('sell-gain-act').innerHTML =
    `<span style="color:${vsAct>=0?'var(--income-mid)':'var(--expense-mid)'}">${signStr(vsAct)}${cop(Math.abs(vsAct))}</span>`;
}

async function saveActivoSell(id) {
  const precio = parseMoneyInput(document.getElementById('m-precio'));
  const fecha  = document.getElementById('m-fecha').value;
  const notas  = document.getElementById('m-notas').value.trim();
  const registrarTx = document.getElementById('m-es-nueva')?.checked ?? true;
  const a      = S.activos.find(x => x._id === id);
  if (!precio || precio <= 0) { setModalStatus('err', 'Precio de venta inválido'); return; }
  if (!a) return;

  setModalStatus('', 'Guardando...');
  try {
    await apiAction(`/api/activo/${id}/venta`, { precio, fecha, notas, registrar_tx: registrarTx });
  } catch(err) { setModalStatus('err', '❌ ' + err.message); }
}

// ── Render ────────────────────────────────────────────────────────────────────
function renderActivos() {
  const grid  = document.getElementById('activos-grid');
  const sumEl = document.getElementById('activos-total');
  if (!grid) return;

  const totalIni  = S.activos.reduce((s,a) => s + a.valor_inicial, 0);
  const totalAct  = S.activos.reduce((s,a) => s + a.valor_actual, 0);
  const variacion = totalAct - totalIni;
  const varPct    = totalIni > 0 ? variacion / totalIni * 100 : 0;

  if (sumEl) sumEl.innerHTML = `
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr">
      <div style="padding:0 20px;border-right:1px solid var(--border);text-align:center">
        <div class="stat-label">Valor actual</div>
        <div class="stat-value" style="color:var(--asset-mid)">${cop(totalAct)}</div>
        <div class="stat-sub">${S.activos.length} activo${S.activos.length!==1?'s':''}</div>
      </div>
      <div style="padding:0 20px;border-right:1px solid var(--border);text-align:center">
        <div class="stat-label">Costo inicial</div>
        <div class="stat-value">${cop(totalIni)}</div>
        <div class="stat-sub">invertido</div>
      </div>
      <div style="padding:0 20px;text-align:center">
        <div class="stat-label">Variación</div>
        <div class="stat-value" style="color:${variacion>=0?'var(--income-mid)':'var(--expense-mid)'}">${signStr(variacion)}${cop(Math.abs(variacion))}</div>
        <div class="stat-sub"><span class="gain-badge ${variacion>=0?'gain-pos':'gain-neg'}">${signStr(varPct)}${pct(Math.abs(varPct))}%</span></div>
      </div>
    </div>`;

  if (!S.activos.length) {
    grid.innerHTML = `<div class="empty" style="grid-column:1/-1">
      <div class="empty-icon">🏠</div><div class="empty-title">Sin activos</div>
      <div class="empty-text">Registrá propiedades, vehículos u otros bienes con el botón + de arriba.</div></div>`; return;
  }

  grid.innerHTML = S.activos.map(a => {
    const cambio    = a.valor_actual - a.valor_inicial;
    const cambioPct = a.valor_inicial > 0 ? cambio / a.valor_inicial * 100 : 0;
    return `
    <div class="asset-card">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px">
        <div class="inv-name">${escHtml(a.nombre)}</div>
        <span class="gain-badge ${cambio>=0?'gain-pos':'gain-neg'}" style="margin-left:8px;flex-shrink:0">${signStr(cambioPct)}${pct(Math.abs(cambioPct))}%</span>
      </div>
      <div style="font-size:var(--text-3xl);font-weight:700;color:var(--asset-mid);letter-spacing:-0.02em;line-height:1;font-family:var(--font-mono)">${cop(a.valor_actual)}</div>
      <div style="display:flex;justify-content:space-between;align-items:center;margin-top:6px">
        <div style="font-size:var(--text-sm);color:var(--text-secondary)">Compra ${cop(a.valor_inicial)}</div>
        <div style="font-size:var(--text-base);font-weight:600;color:${cambio>=0?'var(--income)':'var(--expense)'}">${signStr(cambio)}${cop(Math.abs(cambio))}</div>
      </div>
      ${a.fecha_adquisicion ? `<div style="font-size:var(--text-xs);color:var(--text-muted);margin-top:4px">Adquirido ${fmtDate(a.fecha_adquisicion)}</div>` : ''}
      <div style="display:flex;gap:6px;margin-top:14px;padding-top:14px;border-top:1px solid var(--border)">
        <button class="btn btn-accent btn-sm" style="flex:1" onclick="openActivoUpdateFormById(${a._id})">Actualizar valor</button>
        <button class="btn btn-dim btn-sm" style="color:var(--expense)" onclick="openActivoSellFormById(${a._id})">Vender</button>
        <button class="btn btn-dim btn-sm" onclick="openActivoFormById(${a._id})">Editar</button>
      </div>
    </div>`;
  }).join('');
}
