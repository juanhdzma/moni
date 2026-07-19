// ── Rate helpers ──────────────────────────────────────────────────────────────
function eaToMv(ea) { return ((1 + ea / 100) ** (1 / 12) - 1) * 100; }
function mvToEa(mv) { return ((1 + mv / 100) ** 12 - 1) * 100; }

function setRateType(type) {
  document.getElementById('m-rate-type').value = type;
  document.querySelectorAll('.rate-seg-btn').forEach(b => {
    const active = b.dataset.rate === type;
    b.style.background  = active ? 'var(--inv-mid)' : 'transparent';
    b.style.color       = active ? 'var(--white)' : 'var(--text-secondary)';
  });
  calcTasaEquiv();
}

function calcTasaEquiv() {
  const val  = parseFloat(document.getElementById('m-tasa')?.value) || 0;
  const type = document.getElementById('m-rate-type')?.value || 'ea';
  const el   = document.getElementById('tasa-equiv');
  if (!el) return;
  if (!val) { el.textContent = ''; return; }
  if (type === 'ea') {
    el.textContent = `Equivale a ${pct(eaToMv(val), 4)}% MV`;
  } else {
    el.textContent = `Equivale a ${pct(mvToEa(val), 2)}% EA`;
  }
}

function getStoredTasaEa() {
  const raw  = parseFloat(document.getElementById('m-tasa')?.value) || null;
  const type = document.getElementById('m-rate-type')?.value || 'ea';
  if (!raw) return null;
  return type === 'ea' ? raw : mvToEa(raw);
}

// ── Edit form ─────────────────────────────────────────────────────────────────
function openInvFormById(id) {
  openInvForm(S.inversiones.find(i => i._id === id) || null);
}

function nextInvPaymentStr(diaPago) {
  if (!diaPago) return null;
  const now = new Date(); now.setHours(0,0,0,0);
  let next = new Date(now.getFullYear(), now.getMonth(), diaPago);
  if (next <= now) next = new Date(now.getFullYear(), now.getMonth() + 1, diaPago);
  const days = Math.round((next - now) / 86400000);
  return days === 0 ? 'hoy' : `en ${days}d`;
}

function openInvForm(inv = null) {
  const isEdit = inv !== null;
  const tipo   = inv?.tipo || 'fija';
  const pago   = inv?.pago || 'vencimiento';

  openModal(isEdit ? 'Editar inversión' : 'Nueva inversión', `
    <div class="form-group">
      <label class="form-label">Nombre</label>
      <input class="form-input" type="text" id="m-nombre" maxlength="40" value="${escHtml(inv?.nombre||'')}" placeholder="Ej. CDT Bancolombia" />
    </div>
    <div class="form-group">
      <label class="form-label">Tipo</label>
      ${isEdit
        ? `<div style="padding:var(--sp-3) var(--sp-5);background:var(--bg-muted);border:1px solid var(--border);border-radius:var(--radius-sm);font-size:var(--text-base);font-weight:600;color:var(--text-secondary)">${tipo === 'fija' ? 'Fija' : 'Variable'}</div>`
        : `<div class="tipo-toggle">
        <button type="button" class="tipo-btn ingreso ${tipo==='fija'?'sel':''}" onclick="invTipoChange('fija')">Fija</button>
        <button type="button" class="tipo-btn gasto ${tipo==='variable'?'sel':''}" onclick="invTipoChange('variable')">Variable</button>
      </div>`}
      <input type="hidden" id="m-inv-tipo" value="${tipo}" />
    </div>
    <div class="form-row-2">
      <div class="form-group">
        <label class="form-label">Monto invertido</label>
        <div class="money-wrap"><span class="money-pfx">$</span>
          <input class="form-input" type="text" inputmode="numeric" id="m-invertido"
            value="${inv ? numToInput(inv.monto_invertido) : ''}" placeholder="0" oninput="fmtMoneyInput(this)" />
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Valor actual</label>
        <div class="money-wrap"><span class="money-pfx">$</span>
          <input class="form-input" type="text" inputmode="numeric" id="m-actual"
            value="${inv ? numToInput(inv.valor_actual) : ''}" placeholder="0" oninput="fmtMoneyInput(this)" />
        </div>
      </div>
    </div>
    <div id="m-tasa-wrap" class="form-group" style="${tipo==='fija'?'':'display:none'}">
      <label class="form-label">Tasa de rendimiento</label>
      <div style="display:flex;gap:8px;align-items:center">
        <input class="form-input" type="number" step="0.0001" id="m-tasa"
          value="${inv?.tasa_ea||''}" placeholder="0" style="flex:1" oninput="calcTasaEquiv()" />
        <div style="display:flex;border:1px solid var(--border);border-radius:var(--radius-sm);overflow:hidden;flex-shrink:0">
          <button type="button" class="rate-seg-btn" data-rate="ea" onclick="setRateType('ea')"
            style="padding:9px 13px;border:none;background:var(--inv-mid);color:var(--white);font-family:var(--font-sans);font-size:var(--text-sm);font-weight:700;cursor:pointer">EA</button>
          <button type="button" class="rate-seg-btn" data-rate="mv" onclick="setRateType('mv')"
            style="padding:9px 13px;border:none;background:transparent;color:var(--text-secondary);font-family:var(--font-sans);font-size:var(--text-sm);font-weight:700;cursor:pointer">MV</button>
        </div>
      </div>
      <input type="hidden" id="m-rate-type" value="ea" />
      <div id="tasa-equiv" style="font-size:var(--text-xs);color:var(--text-secondary);margin-top:5px"></div>
    </div>
    <div id="m-pago-wrap" class="form-group" style="${tipo==='fija'?'':'display:none'}">
      <label class="form-label">Pago de rendimientos</label>
      <div class="tipo-toggle">
        <button type="button" id="rp-mensual"     class="tipo-btn ingreso  ${pago==='mensual'    ?'sel':''}" onclick="setInvPago('mensual')">Mensual</button>
        <button type="button" id="rp-vencimiento" class="tipo-btn transfer ${pago==='vencimiento'?'sel':''}" onclick="setInvPago('vencimiento')">Al vencimiento</button>
      </div>
      <input type="hidden" id="m-pago" value="${pago}" />
    </div>
    <div id="m-dia-pago-wrap" class="form-group" style="${tipo==='fija'&&pago==='mensual'?'':'display:none'}">
      <label class="form-label">Día del mes que paga</label>
      <input class="form-input" type="number" id="m-dia-pago" min="1" max="31" value="${inv?.dia_pago||''}" placeholder="Ej. 15" />
    </div>
    <div class="form-group">
      <label class="form-label">Fecha inicio</label>
      <input class="form-input" type="date" id="m-fecha-ini" value="${inv?.fecha_inicio?.split('T')[0]||todayStr()}" />
    </div>
    ${!isEdit ? advancedToggle() : ''}
    <div class="modal-footer">
      <button class="btn btn-accent" onclick="saveInv(${isEdit ? inv._id : 'null'})">${isEdit ? 'Guardar cambios' : 'Agregar inversión'}</button>
      ${isEdit ? `<button class="btn btn-danger" onclick="deleteInv(${inv._id})">Eliminar</button>` : ''}
      <button class="btn btn-dim" style="margin-left:auto" onclick="closeModal()">Cancelar</button>
    </div>
    <div class="form-status" id="m-status" style="margin-top:8px"></div>
  `);
}

function invTipoChange(tipo) {
  document.getElementById('m-inv-tipo').value = tipo;
  document.querySelectorAll('#modal-body .tipo-btn').forEach(b => b.classList.remove('sel'));
  document.querySelector(`#modal-body .tipo-btn.${tipo==='fija'?'ingreso':'gasto'}`)?.classList.add('sel');
  document.getElementById('m-tasa-wrap').style.display     = tipo === 'fija' ? '' : 'none';
  document.getElementById('m-pago-wrap').style.display     = tipo === 'fija' ? '' : 'none';
  const pago = document.getElementById('m-pago')?.value || 'vencimiento';
  document.getElementById('m-dia-pago-wrap').style.display = tipo === 'fija' && pago === 'mensual' ? '' : 'none';
}

function setInvPago(pago) {
  document.getElementById('m-pago').value = pago;
  ['mensual', 'vencimiento'].forEach(p => {
    document.getElementById('rp-' + p)?.classList.toggle('sel', p === pago);
  });
  document.getElementById('m-dia-pago-wrap').style.display = pago === 'mensual' ? '' : 'none';
}

async function saveInv(id) {
  const nombre    = document.getElementById('m-nombre').value.trim();
  const tipo      = document.getElementById('m-inv-tipo').value;
  const invertido = parseMoneyInput(document.getElementById('m-invertido'));
  const actual    = parseMoneyInput(document.getElementById('m-actual'));
  const tasa_ea   = tipo === 'fija' ? getStoredTasaEa() : null;
  const pago      = tipo === 'fija' ? (document.getElementById('m-pago')?.value || 'vencimiento') : null;
  const dia_pago  = pago === 'mensual' ? (parseInt(document.getElementById('m-dia-pago')?.value) || null) : null;
  const fecha     = document.getElementById('m-fecha-ini').value;
  const esNueva   = document.getElementById('m-es-nueva')?.checked ?? true;

  if (!nombre)    { setModalStatus('err', 'Nombre requerido'); return; }
  if (!invertido) { setModalStatus('err', 'Monto invertido requerido'); return; }

  const existente  = id !== null ? S.inversiones.find(x => x._id === id) : null;
  const valorActual = actual || invertido;
  const valorActualizadoEn = !existente ? fecha
    : existente.valor_actual === valorActual ? existente.valor_actualizado_en : todayStr();

  const data = { nombre, tipo, monto_invertido: invertido,
    valor_actual: valorActual, tasa_ea, fecha_inicio: fecha, pago, dia_pago,
    valor_actualizado_en: valorActualizadoEn };

  setModalStatus('', 'Guardando...');
  try {
    if (id !== null) await crudOp('inv', 'update', { ...data, _id: id });
    else await crudOp('inv', 'add', { ...data, crear_tx: esNueva });
  } catch(err) { setModalStatus('err', '❌ ' + err.message); }
}

async function deleteInv(id) {
  const inv = S.inversiones.find(i => i._id === id);
  if (!confirm(`¿Eliminar "${inv?.nombre}"?`)) return;
  await crudOp('inv', 'delete', { _id: id });
}

// ── Rendimiento — solo para inversiones FIJAS ────────────────────────────────
function openInvYieldFormById(id) {
  const inv = S.inversiones.find(x => x._id === id);
  if (!inv) return;
  const mv       = inv.tasa_ea ? eaToMv(inv.tasa_ea) : 0;
  const expected = inv.tasa_ea ? Math.round(inv.valor_actual * mv / 100) : 0;

  openModal(`Registrar rendimiento · ${inv.nombre}`, `
    <div style="background:var(--bg);border-radius:var(--radius-sm);padding:14px 16px;margin-bottom:18px;display:flex;justify-content:space-between">
      <div>
        <div style="font-size:var(--text-xs);font-weight:700;color:var(--text-secondary);text-transform:uppercase;letter-spacing:.05em;margin-bottom:3px">Valor actual</div>
        <div style="font-size:var(--text-2xl);font-weight:700;color:var(--inv-mid)">${cop(inv.valor_actual)}</div>
      </div>
      ${inv.tasa_ea ? `<div style="text-align:right">
        <div style="font-size:var(--text-xs);color:var(--text-secondary);margin-bottom:3px">${pct(inv.tasa_ea, 2)}% EA · ${pct(mv, 4)}% MV</div>
        <div style="font-size:var(--text-sm);color:var(--text-secondary)">Mensual esperado</div>
        <div style="font-size:var(--text-lg);font-weight:700;color:var(--income-mid)">${cop(expected)}</div>
      </div>` : ''}
    </div>
    <div class="form-group">
      <label class="form-label">Monto recibido (COP)</label>
      <div class="money-wrap"><span class="money-pfx">$</span>
        <input class="form-input" type="text" inputmode="numeric" id="m-monto"
          value="${expected ? numToInput(expected) : ''}" placeholder="0" oninput="fmtMoneyInput(this)" />
      </div>
      ${expected ? `<div style="font-size:var(--text-xs);color:var(--text-secondary);margin-top:5px">Pre-llenado con el rendimiento esperado del período.</div>` : ''}
    </div>
    <div class="form-group">
      <label class="form-label">Fecha</label>
      <input class="form-input" type="datetime-local" id="m-fecha" value="${nowStr()}" />
    </div>
    <div class="form-group">
      <label class="form-label" style="text-transform:none;letter-spacing:0;font-size:var(--text-sm);color:var(--text-secondary)">Notas (opcional)</label>
      <input class="form-input" type="text" id="m-notas" maxlength="30" placeholder="Ej. Intereses mes de junio" />
    </div>
    ${advancedToggle('Registrar en transacciones', 'Desactivá si ya lo registraste en otra parte.')}
    <div class="modal-footer">
      <button class="btn btn-accent" onclick="saveInvYield(${inv._id})">Registrar</button>
      <button class="btn btn-dim" onclick="closeModal();openInvFormById(${inv._id})">Editar inversión</button>
      <button class="btn btn-dim" style="margin-left:auto" onclick="closeModal()">Cancelar</button>
    </div>
    <div class="form-status" id="m-status" style="margin-top:8px"></div>
  `);
}

async function saveInvYield(id) {
  const monto = parseMoneyInput(document.getElementById('m-monto'));
  const fecha = document.getElementById('m-fecha').value;
  const notas = document.getElementById('m-notas').value.trim();
  const inv   = S.inversiones.find(x => x._id === id);

  if (!monto || monto <= 0) { setModalStatus('err', 'Ingresá un monto válido'); return; }
  if (!inv) return;

  const registrarTx = document.getElementById('m-es-nueva')?.checked ?? true;
  setModalStatus('', 'Guardando...');
  try {
    await apiAction(`/api/inv/${id}/rendimiento`, { monto, fecha, notas, registrar_tx: registrarTx });
  } catch(err) { setModalStatus('err', '❌ ' + err.message); }
}

// ── Actualizar valor — solo para inversiones VARIABLES ───────────────────────
function openInvUpdateValueFormById(id) {
  const inv = S.inversiones.find(x => x._id === id);
  if (!inv) return;

  openModal(`Actualizar valor · ${inv.nombre}`, `
    <div style="background:var(--bg);border-radius:var(--radius-sm);padding:14px 16px;margin-bottom:18px;display:flex;justify-content:space-between;align-items:center">
      <div>
        <div style="font-size:var(--text-xs);font-weight:700;color:var(--text-secondary);text-transform:uppercase;letter-spacing:.05em;margin-bottom:3px">Último valor</div>
        <div style="font-size:var(--text-2xl);font-weight:700">${cop(inv.valor_actual)}</div>
      </div>
      <div style="text-align:right">
        <div style="font-size:var(--text-xs);color:var(--text-secondary);margin-bottom:3px">Invertido</div>
        <div style="font-size:var(--text-lg);font-weight:600">${cop(inv.monto_invertido)}</div>
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">Nuevo valor total (COP)</label>
      <div class="money-wrap"><span class="money-pfx">$</span>
        <input class="form-input" type="text" inputmode="numeric" id="m-nuevo-valor"
          placeholder="0" oninput="fmtMoneyInput(this);calcInvValueUpdate(${inv.valor_actual},${inv.monto_invertido})" />
      </div>
    </div>
    <div id="inv-value-preview" style="display:none;border-radius:var(--radius-sm);border:1px solid var(--border);overflow:hidden;margin-bottom:14px">
      <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 14px;border-bottom:1px solid var(--border)">
        <span style="font-size:var(--text-sm);color:var(--text-secondary)">Cambio desde último</span>
        <span style="font-size:var(--text-md);font-weight:700" id="inv-delta">—</span>
      </div>
      <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 14px">
        <span style="font-size:var(--text-sm);color:var(--text-secondary)">Ganancia total vs invertido</span>
        <span style="font-size:var(--text-md);font-weight:700" id="inv-total-gain">—</span>
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">Fecha de valoración</label>
      <input class="form-input" type="datetime-local" id="m-fecha" value="${nowStr()}" />
    </div>
    <div class="modal-footer">
      <button class="btn btn-accent" onclick="saveInvValueUpdate(${inv._id})">Actualizar</button>
      <button class="btn btn-dim" onclick="closeModal();openInvFormById(${inv._id})">Editar inversión</button>
      <button class="btn btn-dim" style="margin-left:auto" onclick="closeModal()">Cancelar</button>
    </div>
    <div class="form-status" id="m-status" style="margin-top:8px"></div>
  `);
}

function calcInvValueUpdate(valorAnterior, montoInvertido) {
  const nuevo   = parseMoneyInput(document.getElementById('m-nuevo-valor'));
  const preview = document.getElementById('inv-value-preview');
  if (!nuevo) { preview.style.display = 'none'; return; }

  const delta       = nuevo - valorAnterior;
  const totalGain   = nuevo - montoInvertido;
  const totalGainPct = montoInvertido > 0 ? totalGain / montoInvertido * 100 : 0;
  const deltaColor  = delta >= 0 ? 'var(--income-mid)' : 'var(--expense-mid)';
  const gainColor   = totalGain >= 0 ? 'var(--income-mid)' : 'var(--expense-mid)';

  preview.style.display = 'block';
  document.getElementById('inv-delta').innerHTML =
    `<span style="color:${deltaColor}">${signStr(delta)}${cop(Math.abs(delta))}</span>`;
  document.getElementById('inv-total-gain').innerHTML =
    `<span style="color:${gainColor}">${signStr(totalGain)}${cop(Math.abs(totalGain))} <span style="font-size:var(--text-xs);font-weight:500">(${signStr(totalGainPct)}${pct(Math.abs(totalGainPct))}%)</span></span>`;
}

async function saveInvValueUpdate(id) {
  const nuevo = parseMoneyInput(document.getElementById('m-nuevo-valor'));
  const fecha = document.getElementById('m-fecha').value;
  const inv   = S.inversiones.find(x => x._id === id);
  if (!nuevo || nuevo <= 0) { setModalStatus('err', 'Valor inválido'); return; }
  if (!inv) return;

  setModalStatus('', 'Guardando...');
  try {
    await crudOp('inv', 'update', { ...inv, valor_actual: nuevo, valor_actualizado_en: fecha, _id: id });
  } catch(err) { setModalStatus('err', '❌ ' + err.message); }
}

// ── Invertir más ─────────────────────────────────────────────────────────────
function openInvAddMoreFormById(id) {
  const inv = S.inversiones.find(x => x._id === id);
  if (!inv) return;
  const estimado = inv.valor_actual; // se actualiza con JS cuando ingresen el monto
  openModal(`Invertir más · ${inv.nombre}`, `
    <div class="modal-panel">
      <div class="modal-panel-col">
        <div class="modal-panel-label">Valor actual</div>
        <div class="modal-panel-value" style="color:var(--inv)">${cop(inv.valor_actual)}</div>
      </div>
      <div class="modal-panel-col right">
        <div class="modal-panel-label">Invertido</div>
        <div class="modal-panel-value">${cop(inv.monto_invertido)}</div>
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">Monto que agregas (COP)</label>
      <div class="money-wrap"><span class="money-pfx">$</span>
        <input class="form-input" type="text" inputmode="numeric" id="m-monto"
          placeholder="0" oninput="fmtMoneyInput(this);calcAddMoreEstimate(${inv.valor_actual})" />
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">Nuevo valor del fondo después del aporte</label>
      <div class="money-wrap"><span class="money-pfx">$</span>
        <input class="form-input" type="text" inputmode="numeric" id="m-nuevo-valor"
          placeholder="${numToInput(inv.valor_actual)}" oninput="fmtMoneyInput(this)" />
      </div>
      <div style="font-size:var(--text-xs);color:var(--text-secondary);margin-top:5px" id="add-more-hint">
        Estimado como valor actual + aporte. Ajustá si el mercado se movió.
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">Fecha</label>
      <input class="form-input" type="datetime-local" id="m-fecha" value="${nowStr()}" />
    </div>
    <div class="form-group">
      <label class="form-label" style="text-transform:none;letter-spacing:0;font-size:var(--text-sm);color:var(--text-secondary)">Notas (opcional)</label>
      <input class="form-input" type="text" id="m-notas" maxlength="30" placeholder="Ej. Aporte mensual" />
    </div>
    ${advancedToggle('Registrar en transacciones', 'Desactivá si ya lo registraste en otra parte.')}
    <div class="modal-footer">
      <button class="btn btn-accent" onclick="saveInvAddMore(${inv._id}, ${inv.valor_actual})">Agregar aporte</button>
      <button class="btn btn-dim" style="margin-left:auto" onclick="closeModal()">Cancelar</button>
    </div>
    <div class="form-status" id="m-status" style="margin-top:8px"></div>
  `);
}

function calcAddMoreEstimate(valorActual) {
  const aporte = parseMoneyInput(document.getElementById('m-monto'));
  if (!aporte) return;
  const estimado = valorActual + aporte;
  const nuevoEl  = document.getElementById('m-nuevo-valor');
  const hint     = document.getElementById('add-more-hint');
  if (nuevoEl && !nuevoEl.value) nuevoEl.placeholder = numToInput(estimado);
  if (hint) hint.textContent = `Estimado: ${cop(estimado)}. Ajustá si el mercado se movió.`;
}

async function saveInvAddMore(id, valorActualAntes) {
  const monto     = parseMoneyInput(document.getElementById('m-monto'));
  const nuevoValRaw = document.getElementById('m-nuevo-valor').value;
  const nuevoVal  = nuevoValRaw ? parseMoneyInput(document.getElementById('m-nuevo-valor'))
                                : valorActualAntes + monto;
  const fecha     = document.getElementById('m-fecha').value;
  const notas     = document.getElementById('m-notas').value.trim();
  const inv       = S.inversiones.find(x => x._id === id);
  if (!monto || monto <= 0) { setModalStatus('err', 'Ingresá el monto que agregas'); return; }
  if (!inv) return;

  const registrarTxAporte = document.getElementById('m-es-nueva')?.checked ?? true;
  setModalStatus('', 'Guardando...');
  try {
    await apiAction(`/api/inv/${id}/aporte`, { monto, nuevo_valor: nuevoVal, fecha, notas, registrar_tx: registrarTxAporte });
  } catch(err) { setModalStatus('err', '❌ ' + err.message); }
}

// ── Retirar (total o parcial) ─────────────────────────────────────────────────
function openInvRetirarFormById(id) {
  const inv = S.inversiones.find(x => x._id === id);
  if (!inv) return;
  openModal(`Retirar · ${inv.nombre}`, `
    <div class="modal-panel">
      <div class="modal-panel-col">
        <div class="modal-panel-label">Valor actual</div>
        <div class="modal-panel-value" style="color:var(--inv)">${cop(inv.valor_actual)}</div>
      </div>
      <div class="modal-panel-col right">
        <div class="modal-panel-label">Invertido</div>
        <div class="modal-panel-value">${cop(inv.monto_invertido)}</div>
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">Tipo de retiro</label>
      <div class="tipo-toggle">
        <button type="button" class="tipo-btn ingreso sel" data-retiro="total"   onclick="setRetiroTipo('total')">Total</button>
        <button type="button" class="tipo-btn transfer"    data-retiro="parcial" onclick="setRetiroTipo('parcial')">Parcial</button>
      </div>
      <input type="hidden" id="m-retiro-tipo" value="total" />
    </div>

    <div id="retiro-total-fields">
      <div class="form-group">
        <label class="form-label">Monto que recibís</label>
        <div class="money-wrap"><span class="money-pfx">$</span>
          <input class="form-input" type="text" inputmode="numeric" id="m-monto-total"
            value="${numToInput(inv.valor_actual)}" placeholder="0" oninput="fmtMoneyInput(this)" />
        </div>
        <div style="font-size:var(--text-xs);color:var(--text-secondary);margin-top:5px">Pre-llenado con el valor actual — ajustá si difiere al momento del retiro.</div>
      </div>
    </div>

    <div id="retiro-parcial-fields" style="display:none">
      <div class="form-group">
        <label class="form-label">Monto que retirás</label>
        <div class="money-wrap"><span class="money-pfx">$</span>
          <input class="form-input" type="text" inputmode="numeric" id="m-monto-parcial"
            placeholder="0" oninput="fmtMoneyInput(this)" />
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Saldo que queda en el fondo</label>
        <div class="money-wrap"><span class="money-pfx">$</span>
          <input class="form-input" type="text" inputmode="numeric" id="m-saldo-queda"
            placeholder="0" oninput="fmtMoneyInput(this)" />
        </div>
        <div style="font-size:var(--text-xs);color:var(--text-secondary);margin-top:5px">Valor total de la inversión después del retiro.</div>
      </div>
    </div>

    <div class="form-group">
      <label class="form-label">Fecha</label>
      <input class="form-input" type="datetime-local" id="m-fecha-retiro" value="${nowStr()}" />
    </div>
    <div class="form-group">
      <label class="form-label" style="text-transform:none;letter-spacing:0;font-size:var(--text-sm);color:var(--text-secondary)">Notas (opcional)</label>
      <input class="form-input" type="text" id="m-notas-retiro" maxlength="30" placeholder="Ej. Vencimiento CDT" />
    </div>
    ${advancedToggle('Registrar en transacciones', 'Desactivá si ya lo registraste en otra parte.')}
    <div class="modal-footer">
      <button class="btn btn-accent" onclick="saveInvRetiro(${inv._id})">Confirmar retiro</button>
      <button class="btn btn-dim" style="margin-left:auto" onclick="closeModal()">Cancelar</button>
    </div>
    <div class="form-status" id="m-status" style="margin-top:8px"></div>
  `);
}

function setRetiroTipo(tipo) {
  document.getElementById('m-retiro-tipo').value = tipo;
  document.querySelectorAll('[data-retiro]').forEach(b => b.classList.remove('sel'));
  document.querySelector(`[data-retiro="${tipo}"]`)?.classList.add('sel');
  document.getElementById('retiro-total-fields').style.display   = tipo === 'total'   ? '' : 'none';
  document.getElementById('retiro-parcial-fields').style.display = tipo === 'parcial' ? '' : 'none';
}

async function saveInvRetiro(id) {
  const tipo  = document.getElementById('m-retiro-tipo').value;
  const fecha = document.getElementById('m-fecha-retiro').value;
  const notas = document.getElementById('m-notas-retiro').value.trim();
  const registrarTxRetiro = document.getElementById('m-es-nueva')?.checked ?? true;
  const inv   = S.inversiones.find(x => x._id === id);
  if (!inv) return;

  if (tipo === 'total') {
    const monto = parseMoneyInput(document.getElementById('m-monto-total'));
    if (!monto) { setModalStatus('err', 'Ingresá el monto que recibís'); return; }
    setModalStatus('', 'Guardando...');
    try {
      await apiAction(`/api/inv/${id}/retiro`, { tipo: 'total', monto, fecha, notas, registrar_tx: registrarTxRetiro });
    } catch(err) { setModalStatus('err', '❌ ' + err.message); }

  } else {
    const monto = parseMoneyInput(document.getElementById('m-monto-parcial'));
    const saldo = parseMoneyInput(document.getElementById('m-saldo-queda'));
    if (!monto) { setModalStatus('err', 'Ingresá el monto que retirás'); return; }
    if (!document.getElementById('m-saldo-queda').value.trim())
      { setModalStatus('err', 'Ingresá el saldo que queda en el fondo'); return; }
    setModalStatus('', 'Guardando...');
    try {
      await apiAction(`/api/inv/${id}/retiro`, {
        tipo: 'parcial', monto, saldo_queda: saldo, fecha, notas, registrar_tx: registrarTxRetiro,
      });
    } catch(err) { setModalStatus('err', '❌ ' + err.message); }
  }
}

// ── Render ────────────────────────────────────────────────────────────────────
function renderInversiones() {
  const gridFija     = document.getElementById('inv-grid-fija');
  const gridVariable = document.getElementById('inv-grid-variable');
  const sumEl        = document.getElementById('inv-total');
  if (!gridFija || !gridVariable) return;

  const totalInv    = S.inversiones.reduce((s,i) => s + i.monto_invertido, 0);
  const totalActual = S.inversiones.reduce((s,i) => s + i.valor_actual, 0);
  const ganancia    = totalActual - totalInv;
  const ganPct      = totalInv > 0 ? ganancia / totalInv * 100 : 0;

  if (sumEl) sumEl.innerHTML = `
    <div class="stat-summary stat-summary-3">
      <div class="stat-summary-item stat-hero">
        <div class="stat-label">Valor actual</div>
        <div class="stat-value" style="color:var(--inv)">${cop(totalActual)}</div>
        <div class="stat-sub">${S.inversiones.length} posición${S.inversiones.length!==1?'es':''}</div>
      </div>
      <div class="stat-pair">
        <div class="stat-summary-item">
          <div class="stat-label">Invertido</div>
          <div class="stat-value">${cop(totalInv)}</div>
          <div class="stat-sub">capital</div>
        </div>
        <div class="stat-summary-item">
          <div class="stat-label">Ganancia</div>
          <div class="stat-value" style="color:${ganancia>=0?'var(--income)':'var(--expense)'}">${signStr(ganancia)}${cop(Math.abs(ganancia))}</div>
          <div class="stat-sub"><span class="gain-badge ${ganancia>=0?'gain-pos':'gain-neg'}">${signStr(ganPct)}${pct(Math.abs(ganPct))}%</span></div>
        </div>
      </div>
    </div>`;

  const fijas     = S.inversiones.filter(i => i.tipo === 'fija');
  const variables = S.inversiones.filter(i => i.tipo === 'variable');

  const emptyCard = (label) => `<div class="empty" style="grid-column:1/-1">
    <div class="empty-icon">📈</div>
    <div class="empty-title">Sin ${label}</div>
    <div class="empty-text">Agregá una con el botón + de arriba.</div></div>`;

  gridFija.innerHTML     = fijas.length     ? fijas.map(invCardHtml).join('')     : emptyCard('inversiones fijas');
  gridVariable.innerHTML = variables.length ? variables.map(invCardHtml).join('') : emptyCard('inversiones variables');
}

function invCardHtml(inv) {
    const gan      = inv.valor_actual - inv.monto_invertido;
    const ganP     = inv.monto_invertido > 0 ? gan / inv.monto_invertido * 100 : 0;
    const mv       = inv.tipo === 'fija' && inv.tasa_ea ? eaToMv(inv.tasa_ea) : null;
    const nextPago = inv.pago === 'mensual' && inv.dia_pago ? nextInvPaymentStr(inv.dia_pago) : null;
    const actionBtn = inv.tipo === 'fija'
      ? `<button class="btn btn-accent btn-sm" style="flex:1" onclick="openInvYieldFormById(${inv._id})">Rendimiento</button>`
      : `<button class="btn btn-accent btn-sm" style="flex:1" onclick="openInvUpdateValueFormById(${inv._id})">Actualizar</button>`;

    return `
    <div class="inv-card">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:var(--sp-1)">
        <div class="inv-name">${escHtml(inv.nombre)}</div>
        <span class="gain-badge ${gan>=0?'gain-pos':'gain-neg'}" style="margin-left:var(--sp-3);flex-shrink:0">${signStr(ganP)}${pct(Math.abs(ganP))}%</span>
      </div>
      ${mv !== null
        ? `<div style="font-size:var(--text-xs);color:var(--text-muted);margin-bottom:var(--sp-5)">${pct(inv.tasa_ea,2)}% EA · ${pct(mv,4)}% MV${nextPago ? ` · <strong style="color:var(--text-secondary)">${nextPago}</strong>` : ''}</div>`
        : `<div style="margin-bottom:var(--sp-5)"></div>`}
      <div style="font-size:var(--text-3xl);font-weight:700;color:var(--inv);letter-spacing:-0.02em;line-height:1;font-family:var(--font-mono)">${cop(inv.valor_actual)}</div>
      <div style="display:flex;justify-content:space-between;align-items:center;margin-top:6px">
        <div style="font-size:var(--text-sm);color:var(--text-secondary)">Invertido ${cop(inv.monto_invertido)}</div>
        <div style="font-size:var(--text-base);font-weight:600;color:${gan>=0?'var(--income)':'var(--expense)'}">${signStr(gan)}${cop(Math.abs(gan))}</div>
      </div>
      ${inv.fecha_inicio ? `<div style="font-size:var(--text-xs);color:var(--text-muted);margin-top:4px">Desde ${fmtDate(inv.fecha_inicio)}</div>` : ''}
      ${inv.tipo === 'variable' && isStale(inv.valor_actualizado_en) ? `<div class="stale-warning">⚠ Valor sin actualizar hace más de 1 mes</div>` : ''}
      <div class="card-actions">
        ${actionBtn}
        <button class="btn btn-dim btn-sm" onclick="openInvAddMoreFormById(${inv._id})">+ Más</button>
        <button class="btn btn-dim btn-sm" style="color:var(--expense)" onclick="openInvRetirarFormById(${inv._id})">Retirar</button>
        <button class="btn btn-dim btn-sm" onclick="openInvFormById(${inv._id})">Editar</button>
      </div>
    </div>`;
}

