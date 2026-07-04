// ── Add / Edit form ───────────────────────────────────────────────────────────
function openDeudaFormById(id) {
  openDeudaForm(S.deudas.find(d => d._id === id) || null);
}

function openDeudaForm(d = null) {
  const isEdit = d !== null;
  openModal(isEdit ? 'Editar deuda' : 'Nueva deuda', `
    <div class="form-group">
      <label class="form-label">Nombre</label>
      <input class="form-input" type="text" id="m-nombre" maxlength="40" value="${escHtml(d?.nombre||'')}" placeholder="Ej. Crédito de consumo" />
    </div>
    <div class="form-group">
      <label class="form-label">${isEdit ? 'Monto inicial' : 'Monto del crédito'} (COP)</label>
      <div class="money-wrap"><span class="money-pfx">$</span>
        <input class="form-input" type="text" inputmode="numeric" id="m-monto-ini"
          value="${d ? numToInput(d.monto_inicial) : ''}" placeholder="0" oninput="fmtMoneyInput(this)" />
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">Saldo actual (COP)</label>
      <div class="money-wrap"><span class="money-pfx">$</span>
        <input class="form-input" type="text" inputmode="numeric" id="m-saldo"
          value="${d ? numToInput(d.saldo_actual) : ''}" placeholder="0" oninput="fmtMoneyInput(this)" />
      </div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
      <div class="form-group">
        <label class="form-label">Tasa EA (%)</label>
        <input class="form-input" type="number" step="0.01" id="m-tasa" value="${d?.tasa_ea||''}" placeholder="24" />
      </div>
      <div class="form-group">
        <label class="form-label">Cuota mensual</label>
        <div class="money-wrap"><span class="money-pfx">$</span>
          <input class="form-input" type="text" inputmode="numeric" id="m-cuota"
            value="${d ? numToInput(d.cuota_mensual) : ''}" placeholder="0" oninput="fmtMoneyInput(this)" />
        </div>
      </div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
      <div class="form-group">
        <label class="form-label">Fecha inicio</label>
        <input class="form-input" type="date" id="m-fecha-ini" value="${d?.fecha_inicio?.split('T')[0]||''}" />
      </div>
      <div class="form-group">
        <label class="form-label">Próxima cuota</label>
        <input class="form-input" type="date" id="m-proxima" value="${d?.proxima_cuota?.split('T')[0]||''}" />
      </div>
    </div>
    ${!isEdit ? advancedToggle() : ''}
    <div class="modal-footer">
      <button class="btn btn-accent" onclick="saveDeuda(${isEdit ? d._id : 'null'})">${isEdit ? 'Guardar cambios' : 'Agregar deuda'}</button>
      ${isEdit ? `<button class="btn btn-danger" onclick="deleteDeuda(${d._id})">Eliminar</button>` : ''}
      <button class="btn btn-dim" style="margin-left:auto" onclick="closeModal()">Cancelar</button>
    </div>
    <div class="form-status" id="m-status" style="margin-top:8px"></div>
  `);
}

async function saveDeuda(id) {
  const nombre    = document.getElementById('m-nombre').value.trim();
  const monto_ini = parseMoneyInput(document.getElementById('m-monto-ini'));
  const saldo     = parseMoneyInput(document.getElementById('m-saldo'));
  const tasa      = parseFloat(document.getElementById('m-tasa').value) || 0;
  const cuota     = parseMoneyInput(document.getElementById('m-cuota'));
  const fecha_ini = document.getElementById('m-fecha-ini').value;
  const proxima   = document.getElementById('m-proxima').value;
  const esNueva   = document.getElementById('m-es-nueva')?.checked ?? true;

  if (!nombre) { setModalStatus('err', 'Nombre requerido'); return; }
  if (!saldo)  { setModalStatus('err', 'Saldo requerido'); return; }

  const data = { nombre, monto_inicial: monto_ini, saldo_actual: saldo,
    tasa_ea: tasa, cuota_mensual: cuota, fecha_inicio: fecha_ini, proxima_cuota: proxima };

  setModalStatus('', 'Guardando...');
  try {
    if (id !== null) await crudOp('deuda', 'update', { ...data, _id: id });
    else await crudOp('deuda', 'add', { ...data, crear_tx: esNueva });
  } catch(err) { setModalStatus('err', '❌ ' + err.message); }
}

async function deleteDeuda(id) {
  const d = S.deudas.find(x => x._id === id);
  if (!confirm(`¿Eliminar "${d?.nombre}"?`)) return;
  await crudOp('deuda', 'delete', { _id: id });
}

// ── Pago de cuota / Liquidar ──────────────────────────────────────────────────
function openDeudaPayFormById(id, liquidar = false) {
  const d = S.deudas.find(x => x._id === id);
  if (!d) return;
  const title       = liquidar ? `Abonar · ${d.nombre}` : `Pagar cuota · ${d.nombre}`;
  const montoPreFill = liquidar ? numToInput(d.saldo_actual) : numToInput(d.cuota_mensual);
  const saldoPreFill = liquidar ? '0' : '';
  const hint         = liquidar
    ? 'Ajustá si el banco cobra intereses adicionales al cancelar.'
    : 'Pre-llenado con la cuota mensual — ajustá si aplica.';

  openModal(title, `
    <div style="background:var(--bg);border-radius:var(--radius-sm);padding:14px 16px;margin-bottom:18px;display:flex;justify-content:space-between;align-items:center">
      <div>
        <div style="font-size:var(--text-xs);font-weight:700;color:var(--text-secondary);text-transform:uppercase;letter-spacing:.05em;margin-bottom:3px">Saldo pendiente</div>
        <div style="font-size:var(--text-3xl);font-weight:700;color:var(--debt-mid)">${cop(d.saldo_actual)}</div>
      </div>
      <div style="text-align:right">
        <div style="font-size:var(--text-xs);color:var(--text-secondary);margin-bottom:3px">Cuota mensual</div>
        <div style="font-size:var(--text-lg);font-weight:600">${cop(d.cuota_mensual)}</div>
      </div>
    </div>
    <input type="hidden" id="m-saldo-anterior" value="${d.saldo_actual}" />
    <div class="form-group">
      <label class="form-label">Monto total pagado (COP)</label>
      <div class="money-wrap"><span class="money-pfx">$</span>
        <input class="form-input" type="text" inputmode="numeric" id="m-monto"
          value="${montoPreFill}" placeholder="0"
          oninput="fmtMoneyInput(this);calcDeudaPay()" />
      </div>
      <div style="font-size:var(--text-xs);color:var(--text-secondary);margin-top:5px">${hint}</div>
    </div>
    <div class="form-group">
      <label class="form-label">Saldo capital después del pago</label>
      <div class="money-wrap"><span class="money-pfx">$</span>
        <input class="form-input" type="text" inputmode="numeric" id="m-saldo-nuevo"
          value="${saldoPreFill}" placeholder="Lo que muestra tu banco después"
          oninput="fmtMoneyInput(this);calcDeudaPay()" />
      </div>
    </div>
    <div id="pay-breakdown" style="display:none;border-radius:var(--radius-sm);border:1px solid var(--border);overflow:hidden;margin-bottom:14px">
      <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 14px;border-bottom:1px solid var(--border)">
        <span style="font-size:var(--text-sm);color:var(--text-secondary)">→ A capital</span>
        <span style="font-size:var(--text-md);font-weight:700;color:var(--accent)" id="pay-capital">—</span>
      </div>
      <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 14px">
        <span style="font-size:var(--text-sm);color:var(--text-secondary)">→ A intereses</span>
        <span style="font-size:var(--text-md);font-weight:700;color:var(--red)" id="pay-intereses">—</span>
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">Fecha del pago</label>
      <input class="form-input" type="datetime-local" id="m-fecha" value="${nowStr()}" />
    </div>
    <div class="form-group">
      <label class="form-label" style="text-transform:none;letter-spacing:0;font-size:var(--text-sm);color:var(--text-secondary)">Notas (opcional)</label>
      <input class="form-input" type="text" id="m-notas" maxlength="30" placeholder="${liquidar ? 'Abonar a la deuda' : 'Ej. Cuota #14'}" />
    </div>
    ${advancedToggle('Registrar en transacciones', 'Desactivá si ya lo registraste en otra parte.')}
    <div class="modal-footer">
      <button class="btn btn-accent" onclick="saveDeudaPay(${d._id})">${liquidar ? 'Abonar' : 'Registrar pago'}</button>
      <button class="btn btn-dim" onclick="closeModal();openDeudaFormById(${d._id})">Editar deuda</button>
      <button class="btn btn-dim" style="margin-left:auto" onclick="closeModal()">Cancelar</button>
    </div>
    <div class="form-status" id="m-status" style="margin-top:8px"></div>
  `);
  if (liquidar) calcDeudaPay();
}

function calcDeudaPay() {
  const saldoAnterior = parseMoneyInput(document.getElementById('m-saldo-anterior'));
  const total         = parseMoneyInput(document.getElementById('m-monto'));
  const saldoNuevoEl  = document.getElementById('m-saldo-nuevo');
  const breakdown     = document.getElementById('pay-breakdown');
  if (!total || !saldoNuevoEl?.value.trim()) { breakdown.style.display = 'none'; return; }
  const saldoNuevo = parseMoneyInput(saldoNuevoEl);
  const capital    = Math.max(0, saldoAnterior - saldoNuevo);
  const intereses  = Math.max(0, total - capital);
  breakdown.style.display = 'block';
  document.getElementById('pay-capital').textContent   = cop(capital);
  document.getElementById('pay-intereses').textContent = cop(intereses);
}

async function saveDeudaPay(id) {
  const saldoAnterior = parseMoneyInput(document.getElementById('m-saldo-anterior'));
  const total         = parseMoneyInput(document.getElementById('m-monto'));
  const saldoNuevo    = parseMoneyInput(document.getElementById('m-saldo-nuevo'));
  const fecha         = document.getElementById('m-fecha').value;
  const notas         = document.getElementById('m-notas').value.trim();
  const registrarTx   = document.getElementById('m-es-nueva')?.checked ?? true;
  const d             = S.deudas.find(x => x._id === id);

  if (!total || total <= 0)
    { setModalStatus('err', 'Ingresá el monto total pagado'); return; }
  if (!document.getElementById('m-saldo-nuevo').value.trim())
    { setModalStatus('err', 'Ingresá el saldo capital después del pago'); return; }
  if (saldoNuevo > saldoAnterior)
    { setModalStatus('err', 'El saldo nuevo no puede superar el saldo anterior'); return; }
  if (!d) return;

  const capital   = Math.max(0, saldoAnterior - saldoNuevo);
  const intereses = Math.max(0, total - capital);
  const desc      = `Cuota · ${d.nombre} (capital ${cop(capital)}, intereses ${cop(intereses)})`;

  setModalStatus('', 'Guardando...');
  try {
    await apiAction(`/api/deuda/${id}/pago`, {
      nuevo_saldo: saldoNuevo, total_pagado: total, fecha, notas, descripcion: desc, registrar_tx: registrarTx,
    });
  } catch(err) { setModalStatus('err', '❌ ' + err.message); }
}

function estimarInteresesPagados(montoInicial, saldoActual, tasaEA, cuotaMensual) {
  if (!tasaEA || !cuotaMensual || !montoInicial || saldoActual >= montoInicial) return null;
  const tasaMV = Math.pow(1 + tasaEA / 100, 1 / 12) - 1;
  let saldo = montoInicial;
  let totalIntereses = 0;
  for (let i = 0; i < 600 && saldo > saldoActual + 1; i++) {
    const interesMes = saldo * tasaMV;
    const capitalMes = cuotaMensual - interesMes;
    if (capitalMes <= 0) break;
    totalIntereses += interesMes;
    saldo -= capitalMes;
  }
  return Math.round(totalIntereses);
}

// ── Render ────────────────────────────────────────────────────────────────────
function renderDeudas() {
  const grid  = document.getElementById('deudas-grid');
  const sumEl = document.getElementById('deudas-total');
  if (!grid) return;

  const activas     = S.deudas.filter(d => d.saldo_actual > 0);
  const terminadas  = S.deudas.filter(d => d.saldo_actual <= 0);
  const total       = activas.reduce((s,d) => s + d.saldo_actual, 0);
  const totalCuotas = activas.reduce((s,d) => s + d.cuota_mensual, 0);
  const totalIntereses = S.deudas.reduce((s,d) => {
    const i = estimarInteresesPagados(d.monto_inicial, d.saldo_actual, d.tasa_ea, d.cuota_mensual);
    return s + (i || 0);
  }, 0);

  if (sumEl) sumEl.innerHTML = `
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr">
      <div style="padding:0 20px;border-right:1px solid var(--border);text-align:center">
        <div class="stat-label">Saldo pendiente</div>
        <div class="stat-value" style="color:var(--red)">${cop(total)}</div>
        <div class="stat-sub">pendiente</div>
      </div>
      <div style="padding:0 20px;border-right:1px solid var(--border);text-align:center">
        <div class="stat-label">Cuota mensual</div>
        <div class="stat-value">${cop(totalCuotas)}</div>
        <div class="stat-sub">total/mes</div>
      </div>
      <div style="padding:0 20px;border-right:1px solid var(--border);text-align:center">
        <div class="stat-label">Activas</div>
        <div class="stat-value">${activas.length}</div>
        <div class="stat-sub">${terminadas.length} terminada${terminadas.length!==1?'s':''}</div>
      </div>
      <div style="padding:0 20px;text-align:center">
        <div class="stat-label">Intereses pagados</div>
        <div class="stat-value" style="color:var(--expense)">~${cop(totalIntereses)}</div>
        <div class="stat-sub">costo del crédito</div>
      </div>
    </div>`;

  const terminadosEl = document.getElementById('deudas-terminados');

  if (!S.deudas.length) {
    grid.innerHTML = `<div class="empty" style="grid-column:1/-1">
      <div class="empty-icon">🎉</div><div class="empty-title">Sin deudas</div>
      <div class="empty-text">Agregá una deuda con el botón + de arriba.</div></div>`;
    if (terminadosEl) terminadosEl.innerHTML = '';
    return;
  }

  if (!activas.length) {
    grid.innerHTML = `<div class="empty" style="grid-column:1/-1">
      <div class="empty-icon">🎉</div><div class="empty-title">Sin deudas activas</div>
      <div class="empty-text">¡Todos los créditos están saldados!</div></div>`;
  } else {
    grid.innerHTML = activas.map(d => {
    const progress         = d.monto_inicial > 0 ? (1 - d.saldo_actual / d.monto_inicial) * 100 : 0;
    const pagado           = d.monto_inicial - d.saldo_actual;
    const mesesLeft        = d.cuota_mensual > 0 ? Math.ceil(d.saldo_actual / d.cuota_mensual) : null;
    const interesesPagados = estimarInteresesPagados(d.monto_inicial, d.saldo_actual, d.tasa_ea, d.cuota_mensual);
    const barColor         = progress >= 75 ? 'var(--income-mid)' : progress >= 40 ? 'var(--debt-mid)' : 'var(--expense-mid)';
    return `
    <div class="debt-card">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:2px">
        <div class="debt-name">${escHtml(d.nombre)}</div>
        ${mesesLeft ? `<span class="gain-badge gain-debt" style="margin-left:8px;flex-shrink:0">~${mesesLeft}m</span>` : ''}
      </div>
      <div style="font-size:var(--text-xs);color:var(--text-muted);margin-bottom:12px">${pct(d.tasa_ea)}% EA · ${cop(d.cuota_mensual)}/mes</div>
      <div style="display:flex;justify-content:space-between;align-items:baseline;gap:var(--sp-3)">
        <div style="font-size:var(--text-3xl);font-weight:700;color:var(--red);letter-spacing:-0.02em;line-height:1;font-family:var(--font-mono)">${cop(d.saldo_actual)}</div>
        <div style="font-size:var(--text-sm);font-weight:600;color:var(--text-muted)">${pct(progress)}% pagado</div>
      </div>
      <div class="progress-track" style="margin-top:var(--sp-4)">
        <div class="progress-fill" style="width:${Math.min(100,progress).toFixed(1)}%;background:${barColor}"></div>
      </div>
      <div style="display:flex;justify-content:space-between;margin-top:var(--sp-3);gap:var(--sp-1)">
        <div>
          <div style="font-size:var(--text-2xs);font-weight:700;color:var(--text-secondary);text-transform:uppercase;letter-spacing:.05em;margin-bottom:2px">Capital</div>
          <div style="font-size:var(--text-sm);font-weight:600">${cop(pagado)}</div>
        </div>
        ${interesesPagados !== null ? `
        <div style="text-align:center">
          <div style="font-size:var(--text-2xs);font-weight:700;color:var(--text-secondary);text-transform:uppercase;letter-spacing:.05em;margin-bottom:2px">Intereses</div>
          <div style="font-size:var(--text-sm);font-weight:600;color:var(--expense)">~${cop(interesesPagados)}</div>
        </div>` : ''}
        <div style="text-align:right">
          <div style="font-size:var(--text-2xs);font-weight:700;color:var(--text-secondary);text-transform:uppercase;letter-spacing:.05em;margin-bottom:2px">Total</div>
          <div style="font-size:var(--text-sm);font-weight:600">${cop(d.monto_inicial)}</div>
        </div>
      </div>
      ${d.proxima_cuota ? `<div style="margin-top:10px;font-size:var(--text-xs);color:var(--text-secondary)">Próxima cuota: <strong style="color:var(--text)">${fmtDate(d.proxima_cuota)}</strong></div>` : ''}
      <div style="display:flex;gap:6px;margin-top:14px;padding-top:14px;border-top:1px solid var(--border)">
        <button class="btn btn-accent btn-sm" style="flex:1" onclick="openDeudaPayFormById(${d._id})">Pagar cuota</button>
        <button class="btn btn-dim btn-sm" style="color:var(--debt)" onclick="openDeudaPayFormById(${d._id}, true)">Abonar</button>
        <button class="btn btn-dim btn-sm" onclick="openDeudaFormById(${d._id})">Editar</button>
      </div>
    </div>`;
    }).join('');
  }

  if (terminadosEl) {
    if (!terminadas.length) { terminadosEl.innerHTML = ''; return; }
    terminadosEl.innerHTML = `
      <div style="margin-top:24px">
        <div class="section-title" style="margin-bottom:12px">Préstamos terminados</div>
        <div class="grid-2">
          ${terminadas.map(d => {
            const intereses = estimarInteresesPagados(d.monto_inicial, 0, d.tasa_ea, d.cuota_mensual);
            return `
            <div class="debt-card" style="opacity:0.7">
              <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:2px">
                <div class="debt-name">${escHtml(d.nombre)}</div>
                <span class="gain-badge gain-pos">Saldado</span>
              </div>
              <div style="font-size:var(--text-xs);color:var(--text-muted);margin-bottom:12px">${pct(d.tasa_ea)}% EA</div>
              <div style="font-size:var(--text-2xl);font-weight:700;letter-spacing:-0.02em;line-height:1">${cop(d.monto_inicial)}</div>
              <div style="font-size:var(--text-sm);color:var(--text-secondary);margin-top:4px">capital total pagado</div>
              ${intereses !== null ? `<div style="font-size:var(--text-sm);color:var(--expense);margin-top:4px">~${cop(intereses)} en intereses</div>` : ''}
              <div style="display:flex;gap:6px;margin-top:14px;padding-top:14px;border-top:1px solid var(--border)">
                <button class="btn btn-dim btn-sm" style="flex:1" onclick="openDeudaFormById(${d._id})">Ver / Editar</button>
              </div>
            </div>`;
          }).join('')}
        </div>
      </div>`;
  }
}
