// ── Add / Edit form ───────────────────────────────────────────────────────────
function openDeudaFormById(id) {
  openDeudaForm(S.deudas.find(d => d._id === id) || null);
}

function openDeudaForm(d = null) {
  const isEdit    = d !== null;
  const esTarjeta = d?.es_tarjeta ?? false;
  openModal(isEdit ? 'Editar deuda' : 'Nueva deuda', `
    <div class="form-group">
      <label class="form-label">Tipo</label>
      <div class="tipo-toggle">
        <button type="button" class="tipo-btn transfer prestamo ${!esTarjeta?'sel':''}" onclick="deudaTipoChange(false)">Préstamo</button>
        <button type="button" class="tipo-btn transfer tarjeta  ${esTarjeta?'sel':''}"  onclick="deudaTipoChange(true)">Tarjeta</button>
      </div>
      <input type="hidden" id="m-es-tarjeta" value="${esTarjeta ? 1 : 0}" />
    </div>
    <div class="form-group">
      <label class="form-label">Nombre</label>
      <input class="form-input" type="text" id="m-nombre" maxlength="40" value="${escHtml(d?.nombre||'')}" placeholder="${esTarjeta ? 'Ej. Tarjeta Visa' : 'Ej. Crédito de consumo'}" />
    </div>
    <div class="form-group" id="wrap-monto-ini" style="${esTarjeta?'display:none':''}">
      <label class="form-label">${isEdit ? 'Monto inicial' : 'Monto del crédito'} (COP)</label>
      <div class="money-wrap"><span class="money-pfx">$</span>
        <input class="form-input" type="text" inputmode="numeric" id="m-monto-ini"
          value="${d ? numToInput(d.monto_inicial) : ''}" placeholder="0" oninput="fmtMoneyInput(this)" />
      </div>
    </div>
    <div id="wrap-cupo" style="${esTarjeta?'':'display:none'}">
      <div class="form-group">
        <label class="form-label">Cupo (COP)</label>
        <div class="money-wrap"><span class="money-pfx">$</span>
          <input class="form-input" type="text" inputmode="numeric" id="m-cupo"
            value="${d ? numToInput(d.cupo) : ''}" placeholder="0" oninput="fmtMoneyInput(this)" />
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Franquicia</label>
        <select class="form-input" id="m-franquicia">
          ${['Visa', 'Mastercard', 'Amex', 'Otra'].map(f =>
            `<option ${d?.franquicia===f?'selected':''}>${f}</option>`).join('')}
        </select>
      </div>
    </div>
    <div class="form-group">
      <label class="form-label" id="saldo-label">${esTarjeta ? 'Deuda actual' : 'Saldo actual'} (COP)</label>
      <div class="money-wrap"><span class="money-pfx">$</span>
        <input class="form-input" type="text" inputmode="numeric" id="m-saldo"
          value="${d ? numToInput(d.saldo_actual) : ''}" placeholder="0" oninput="fmtMoneyInput(this)" />
      </div>
      <div id="saldo-hint" style="font-size:var(--text-xs);color:var(--text-secondary);margin-top:5px;display:${esTarjeta?'':'none'}">Dejá 0 si la tarjeta todavía no tiene gastos.</div>
    </div>
    <div id="wrap-prestamo-fields" style="${esTarjeta?'display:none':''}">
      <div class="form-row-2">
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
      <div class="form-row-2">
        <div class="form-group">
          <label class="form-label">Fecha inicio</label>
          <input class="form-input" type="date" id="m-fecha-ini" value="${d?.fecha_inicio?.split('T')[0]||''}" />
        </div>
        <div class="form-group">
          <label class="form-label">Próxima cuota</label>
          <input class="form-input" type="date" id="m-proxima" value="${d?.proxima_cuota?.split('T')[0]||''}" />
        </div>
      </div>
    </div>
    <div id="wrap-advanced" style="${esTarjeta?'display:none':''}">${!isEdit ? advancedToggle() : ''}</div>
    <div class="modal-footer">
      <button class="btn btn-accent" onclick="saveDeuda(${isEdit ? d._id : 'null'})">${isEdit ? 'Guardar cambios' : 'Agregar deuda'}</button>
      ${isEdit ? `<button class="btn btn-danger" onclick="deleteDeuda(${d._id})">Eliminar</button>` : ''}
      <button class="btn btn-dim" style="margin-left:auto" onclick="closeModal()">Cancelar</button>
    </div>
    <div class="form-status" id="m-status" style="margin-top:8px"></div>
  `);
}

function deudaTipoChange(esTarjeta) {
  document.getElementById('m-es-tarjeta').value = esTarjeta ? 1 : 0;
  document.querySelectorAll('.tipo-toggle .tipo-btn.prestamo, .tipo-toggle .tipo-btn.tarjeta').forEach(b => b.classList.remove('sel'));
  document.querySelector(esTarjeta ? '.tipo-btn.tarjeta' : '.tipo-btn.prestamo')?.classList.add('sel');
  document.getElementById('wrap-monto-ini').style.display       = esTarjeta ? 'none' : '';
  document.getElementById('wrap-cupo').style.display             = esTarjeta ? ''     : 'none';
  document.getElementById('wrap-prestamo-fields').style.display  = esTarjeta ? 'none' : '';
  document.getElementById('saldo-label').textContent = (esTarjeta ? 'Deuda actual' : 'Saldo actual') + ' (COP)';
  document.getElementById('saldo-hint').style.display = esTarjeta ? '' : 'none';
  document.getElementById('wrap-advanced').style.display = esTarjeta ? 'none' : '';
}

async function saveDeuda(id) {
  const esTarjeta = document.getElementById('m-es-tarjeta').value === '1';
  const nombre    = document.getElementById('m-nombre').value.trim();
  const saldo     = parseMoneyInput(document.getElementById('m-saldo'));
  const esNueva   = document.getElementById('m-es-nueva')?.checked ?? true;

  if (!nombre) { setModalStatus('err', 'Nombre requerido'); return; }
  if (!esTarjeta && !saldo) { setModalStatus('err', 'Saldo requerido'); return; }

  const data = esTarjeta
    ? { nombre, monto_inicial: 0, saldo_actual: saldo, tasa_ea: 0, cuota_mensual: 0,
        fecha_inicio: '', proxima_cuota: '', es_tarjeta: true,
        cupo: parseMoneyInput(document.getElementById('m-cupo')),
        franquicia: document.getElementById('m-franquicia').value }
    : { nombre, monto_inicial: parseMoneyInput(document.getElementById('m-monto-ini')), saldo_actual: saldo,
        tasa_ea: parseFloat(document.getElementById('m-tasa').value) || 0,
        cuota_mensual: parseMoneyInput(document.getElementById('m-cuota')),
        fecha_inicio: document.getElementById('m-fecha-ini').value,
        proxima_cuota: document.getElementById('m-proxima').value, es_tarjeta: false, cupo: 0, franquicia: '' };

  setModalStatus('', 'Guardando...');
  try {
    if (id !== null) await crudOp('deuda', 'update', { ...data, _id: id });
    else await crudOp('deuda', 'add', { ...data, crear_tx: esTarjeta ? false : esNueva });
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
      nuevo_saldo: saldoNuevo, total_pagado: total, intereses, fecha, notas, descripcion: desc, registrar_tx: registrarTx,
    });
  } catch(err) { setModalStatus('err', '❌ ' + err.message); }
}

// ── Adelanto de tarjeta ───────────────────────────────────────────────────────
function openDeudaAdelantoFormById(id) {
  const d = S.deudas.find(x => x._id === id);
  if (!d) return;

  const tieneCupo = d.cupo > 0;

  openModal(`Pedir adelanto · ${d.nombre}`, `
    <div style="background:var(--bg);border-radius:var(--radius-sm);padding:14px 16px;margin-bottom:18px;display:flex;justify-content:space-between;align-items:center">
      <div>
        <div style="font-size:var(--text-xs);font-weight:700;color:var(--text-secondary);text-transform:uppercase;letter-spacing:.05em;margin-bottom:3px">Debes</div>
        <div style="font-size:var(--text-3xl);font-weight:700;color:var(--debt-mid)">${cop(d.saldo_actual)}</div>
      </div>
      ${tieneCupo ? `
      <div style="text-align:right">
        <div style="font-size:var(--text-xs);color:var(--text-secondary);margin-bottom:3px">Disponible</div>
        <div style="font-size:var(--text-lg);font-weight:600">${cop(Math.max(0, d.cupo - d.saldo_actual))}</div>
      </div>` : ''}
    </div>
    <input type="hidden" id="m-saldo-anterior" value="${d.saldo_actual}" />
    <input type="hidden" id="m-cupo" value="${d.cupo}" />
    <div class="form-group">
      <label class="form-label">Monto del adelanto (COP)</label>
      <div class="money-wrap"><span class="money-pfx">$</span>
        <input class="form-input" type="text" inputmode="numeric" id="m-monto"
          value="" placeholder="0" oninput="fmtMoneyInput(this);calcDeudaAdelanto()" />
      </div>
      <div style="font-size:var(--text-xs);color:var(--text-secondary);margin-top:5px">La plata que vas a recibir en tu cuenta.</div>
    </div>
    ${tieneCupo ? `
    <div class="form-group">
      <label class="form-label">Cupo disponible después del adelanto (COP)</label>
      <div class="money-wrap"><span class="money-pfx">$</span>
        <input class="form-input" type="text" inputmode="numeric" id="m-disponible-nuevo"
          value="" placeholder="Lo que te muestra el banco como disponible" oninput="fmtMoneyInput(this);calcDeudaAdelanto()" />
      </div>
    </div>` : `
    <div class="form-group">
      <label class="form-label">Saldo en la tarjeta después del adelanto (COP)</label>
      <div class="money-wrap"><span class="money-pfx">$</span>
        <input class="form-input" type="text" inputmode="numeric" id="m-saldo-nuevo"
          value="" placeholder="Lo que muestra tu banco después" oninput="fmtMoneyInput(this);calcDeudaAdelanto()" />
      </div>
    </div>`}
    <div id="adelanto-breakdown" style="display:none;border-radius:var(--radius-sm);border:1px solid var(--border);overflow:hidden;margin-bottom:14px">
      <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 14px;border-bottom:1px solid var(--border)">
        <span style="font-size:var(--text-sm);color:var(--text-secondary)">→ Deuda total después</span>
        <span style="font-size:var(--text-md);font-weight:700;color:var(--debt-mid)" id="adelanto-deuda">—</span>
      </div>
      <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 14px" id="adelanto-comision-row">
        <span style="font-size:var(--text-sm);color:var(--text-secondary)">→ Comisión / cargos</span>
        <span style="font-size:var(--text-md);font-weight:700;color:var(--red)" id="adelanto-comision">—</span>
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">Fecha</label>
      <input class="form-input" type="datetime-local" id="m-fecha" value="${nowStr()}" />
    </div>
    <div class="form-group">
      <label class="form-label" style="text-transform:none;letter-spacing:0;font-size:var(--text-sm);color:var(--text-secondary)">Notas (opcional)</label>
      <input class="form-input" type="text" id="m-notas" maxlength="30" placeholder="Ej. Adelanto cajero" />
    </div>
    ${advancedToggle('Registrar como ingreso', 'Desactivá si ya lo registraste en otra parte.')}
    <div class="modal-footer">
      <button class="btn btn-accent" onclick="saveDeudaAdelanto(${d._id})">Pedir adelanto</button>
      <button class="btn btn-dim" style="margin-left:auto" onclick="closeModal()">Cancelar</button>
    </div>
    <div class="form-status" id="m-status" style="margin-top:8px"></div>
  `);
}

// Deriva la deuda resultante: si la tarjeta tiene cupo, el usuario ingresa el
// disponible después (lo que ve en su banco) y la deuda es cupo - disponible.
function _adelantoSaldoNuevo() {
  const dispEl = document.getElementById('m-disponible-nuevo');
  if (dispEl) {
    if (!dispEl.value.trim()) return null;
    const cupo = parseMoneyInput(document.getElementById('m-cupo'));
    return cupo - parseMoneyInput(dispEl);
  }
  const saldoNuevoEl = document.getElementById('m-saldo-nuevo');
  if (!saldoNuevoEl.value.trim()) return null;
  return parseMoneyInput(saldoNuevoEl);
}

function calcDeudaAdelanto() {
  const saldoAnterior = parseMoneyInput(document.getElementById('m-saldo-anterior'));
  const monto         = parseMoneyInput(document.getElementById('m-monto'));
  const breakdown     = document.getElementById('adelanto-breakdown');
  const saldoNuevo    = _adelantoSaldoNuevo();
  if (!monto || saldoNuevo === null) { breakdown.style.display = 'none'; return; }
  const comision = Math.max(0, saldoNuevo - saldoAnterior - monto);
  breakdown.style.display = 'block';
  document.getElementById('adelanto-deuda').textContent = cop(saldoNuevo);
  document.getElementById('adelanto-comision-row').style.display = comision > 0 ? 'flex' : 'none';
  document.getElementById('adelanto-comision').textContent = cop(comision);
}

async function saveDeudaAdelanto(id) {
  const saldoAnterior = parseMoneyInput(document.getElementById('m-saldo-anterior'));
  const monto         = parseMoneyInput(document.getElementById('m-monto'));
  const fecha         = document.getElementById('m-fecha').value;
  const notas         = document.getElementById('m-notas').value.trim();
  const registrarTx   = document.getElementById('m-es-nueva')?.checked ?? true;
  const d             = S.deudas.find(x => x._id === id);
  const saldoNuevo    = _adelantoSaldoNuevo();

  if (!monto || monto <= 0)
    { setModalStatus('err', 'Ingresá el monto del adelanto'); return; }
  if (saldoNuevo === null)
    { setModalStatus('err', document.getElementById('m-disponible-nuevo') ? 'Ingresá el cupo disponible después del adelanto' : 'Ingresá el saldo después del adelanto'); return; }
  if (saldoNuevo < saldoAnterior)
    { setModalStatus('err', 'El saldo nuevo no puede ser menor al saldo actual'); return; }
  if (!d) return;

  const desc = `Adelanto · ${d.nombre}`;

  setModalStatus('', 'Guardando...');
  try {
    await apiAction(`/api/deuda/${id}/adelanto`, {
      monto, nuevo_saldo: saldoNuevo, fecha, notas, descripcion: desc, registrar_tx: registrarTx,
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
function prestamoCardHtml(d) {
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
    <div class="card-actions">
      <button class="btn btn-accent btn-sm" style="flex:1" onclick="openDeudaPayFormById(${d._id})">Pagar cuota</button>
      <button class="btn btn-dim btn-sm" style="color:var(--debt)" onclick="openDeudaPayFormById(${d._id}, true)">Abonar</button>
      <button class="btn btn-dim btn-sm" onclick="openDeudaFormById(${d._id})">Editar</button>
    </div>
  </div>`;
}

function tarjetaCardHtml(d) {
  const disponible = d.cupo > 0 ? Math.max(0, d.cupo - d.saldo_actual) : null;
  const usoPct     = d.cupo > 0 ? Math.min(100, (d.saldo_actual / d.cupo) * 100) : 0;
  const barColor    = usoPct >= 90 ? 'var(--expense-mid)' : usoPct >= 60 ? 'var(--debt-mid)' : 'var(--income-mid)';
  return `
  <div class="debt-card">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:2px">
      <div class="debt-name">${escHtml(d.nombre)}</div>
      <span class="icon-chip" style="margin-left:8px;flex-shrink:0"><img src="${FRANQUICIA_ICONS[d.franquicia] || FRANQUICIA_ICONS.Otra}" width="20" height="20" alt="${escHtml(d.franquicia) || 'Tarjeta'}" /></span>
    </div>
    <div style="font-size:var(--text-xs);color:var(--text-muted);margin-bottom:12px">${d.cupo > 0 ? `Cupo ${cop(d.cupo)}` : 'Sin cupo definido'}</div>
    <div style="font-size:var(--text-3xl);font-weight:700;color:var(--red);letter-spacing:-0.02em;line-height:1;font-family:var(--font-mono)">${cop(d.saldo_actual)}</div>
    ${d.cupo > 0 ? `
    <div class="progress-track" style="margin-top:var(--sp-4)">
      <div class="progress-fill" style="width:${usoPct.toFixed(1)}%;background:${barColor}"></div>
    </div>
    <div style="margin-top:10px;font-size:var(--text-sm);color:var(--text-secondary)">Disponible: <strong style="color:var(--text)">${cop(disponible)}</strong></div>` : ''}
    ${d.total_intereses > 0 ? `<div style="margin-top:6px;font-size:var(--text-sm);color:var(--text-secondary)">Intereses pagados: <strong style="color:var(--expense)">${cop(d.total_intereses)}</strong></div>` : ''}
    <div class="card-actions">
      <button class="btn btn-accent btn-sm" style="flex:1" onclick="openDeudaPayFormById(${d._id}, true)">Abonar</button>
      <button class="btn btn-dim btn-sm" onclick="openDeudaAdelantoFormById(${d._id})">Adelanto</button>
      <button class="btn btn-dim btn-sm" onclick="openDeudaFormById(${d._id})">Editar</button>
    </div>
  </div>`;
}

function renderDeudas() {
  const grid  = document.getElementById('deudas-grid');
  const sumEl = document.getElementById('deudas-total');
  if (!grid) return;

  const activas     = S.deudas.filter(d => d.es_tarjeta || d.saldo_actual > 0);
  const terminadas  = S.deudas.filter(d => !d.es_tarjeta && d.saldo_actual <= 0);
  const total       = activas.reduce((s,d) => s + d.saldo_actual, 0);
  const totalCuotas = activas.reduce((s,d) => s + d.cuota_mensual, 0);
  const totalIntereses = S.deudas.reduce((s,d) => {
    const i = estimarInteresesPagados(d.monto_inicial, d.saldo_actual, d.tasa_ea, d.cuota_mensual);
    return s + (i || 0);
  }, 0);

  if (sumEl) sumEl.innerHTML = `
    <div class="stat-summary stat-summary-4">
      <div class="stat-summary-item stat-hero">
        <div class="stat-label">Saldo pendiente</div>
        <div class="stat-value" style="color:var(--red)">${cop(total)}</div>
        <div class="stat-sub">pendiente</div>
      </div>
      <div class="stat-pair">
        <div class="stat-summary-item">
          <div class="stat-label">Cuota mensual</div>
          <div class="stat-value">${cop(totalCuotas)}</div>
          <div class="stat-sub">total/mes</div>
        </div>
        <div class="stat-summary-item">
          <div class="stat-label">Activas</div>
          <div class="stat-value">${activas.length}</div>
          <div class="stat-sub">${terminadas.length} terminada${terminadas.length!==1?'s':''}</div>
        </div>
      </div>
      <div class="stat-summary-item">
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
    grid.innerHTML = activas.map(d => d.es_tarjeta ? tarjetaCardHtml(d) : prestamoCardHtml(d)).join('');
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
              <div class="card-actions">
                <button class="btn btn-dim btn-sm" style="flex:1" onclick="openDeudaFormById(${d._id})">Ver / Editar</button>
              </div>
            </div>`;
          }).join('')}
        </div>
      </div>`;
  }
}
