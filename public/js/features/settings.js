const CURRENCY_OPTIONS = [
  { symbol: '$',   label: 'Peso colombiano ($)' },
  { symbol: 'US$', label: 'Dólar (US$)' },
  { symbol: '€',   label: 'Euro (€)' },
  { symbol: 'MX$', label: 'Peso mexicano (MX$)' },
  { symbol: '£',   label: 'Libra esterlina (£)' },
];

function renderSettings() {
  renderSettingsCategorias();
  renderSettingsSkipped();
  renderSettingsCurrency();
  renderSettingsBackup();
  renderSettingsDanger();
}

// ── Categorías ───────────────────────────────────────────────────────────────
const CAT_TIPO_LABELS = { ingreso: 'Ingresos', gasto: 'Gastos', transfer: 'Transferencias' };

function renderSettingsCategorias() {
  const el = document.getElementById('settings-categorias');
  if (!el) return;
  el.innerHTML = Object.entries(CAT_TIPO_LABELS).map(([tipo, label]) => {
    const cats = CATEGORIES[tipo] || [];
    return `
      <div class="settings-chip-group">
        <div class="settings-chip-label"><span class="cat-dot cat-dot-${tipo}"></span>${label}</div>
        <div class="settings-chips">
          ${cats.map((c, i) => `
            <span class="settings-chip">
              ${escHtml(c)}
              ${isSystemCategory(tipo, c) ? '' : `<button type="button" class="settings-chip-x" onclick="removeSettingsCategoria('${tipo}',${i})" aria-label="Eliminar ${escHtml(c)}">✕</button>`}
            </span>`).join('')}
          ${!cats.length ? `<span class="settings-chip-empty">Sin categorías todavía</span>` : ''}
        </div>
        <div class="settings-add-row">
          <input class="form-input" type="text" maxlength="25" id="settings-new-cat-${tipo}"
            placeholder="Nueva categoría" onkeydown="if(event.key==='Enter')addSettingsCategoria('${tipo}')" />
          <button type="button" class="btn btn-dim btn-sm" onclick="addSettingsCategoria('${tipo}')">Agregar</button>
        </div>
      </div>`;
  }).join('');
}

function addSettingsCategoria(tipo) {
  const input  = document.getElementById(`settings-new-cat-${tipo}`);
  const nombre = input?.value.trim();
  if (!nombre) return;
  addCustomCategory(tipo, nombre);
  renderSettingsCategorias();
}

function removeSettingsCategoria(tipo, idx) {
  const nombre = CATEGORIES[tipo]?.[idx];
  if (!nombre) return;
  removeCustomCategory(tipo, nombre);
  renderSettingsCategorias();
}

// ── Próximas operaciones ocultas ────────────────────────────────────────────
function renderSettingsSkipped() {
  const el = document.getElementById('settings-skipped');
  if (!el) return;
  const set = _loadSkippedOps();
  if (!set.size) {
    el.innerHTML = `<div class="settings-chip-empty">Ninguna operación oculta.</div>`;
    return;
  }
  el.innerHTML = `
    <div class="settings-list">
      ${[...set].map(key => `
        <div class="recent-item">
          <div class="recent-left">
            <div class="recent-desc" style="font-family:var(--font-mono);font-size:var(--text-xs);color:var(--text-secondary)">${escHtml(key)}</div>
          </div>
          <button type="button" class="btn btn-dim btn-sm" onclick="restoreSettingsSkipped('${escHtml(key)}')">Restaurar</button>
        </div>`).join('')}
    </div>
    <button type="button" class="btn btn-dim btn-sm" style="margin-top:var(--sp-5)" onclick="restoreAllSettingsSkipped()">Restaurar todas</button>`;
}

function restoreSettingsSkipped(key) {
  const set = _loadSkippedOps();
  set.delete(key);
  _saveSkippedOps(set);
  renderSettingsSkipped();
  renderDashboard();
}

function restoreAllSettingsSkipped() {
  _saveSkippedOps(new Set());
  renderSettingsSkipped();
  renderDashboard();
}

// ── Moneda (display-only) ───────────────────────────────────────────────────
function renderSettingsCurrency() {
  const el = document.getElementById('settings-currency');
  if (!el) return;
  const current = getCurrencySymbol();
  el.innerHTML = `
    <div class="form-group" style="margin-bottom:0">
      <label class="form-label">Símbolo mostrado junto a los montos</label>
      <select class="select-styled" id="settings-currency-select" onchange="setCurrencySymbol(this.value)">
        ${CURRENCY_OPTIONS.map(o => `<option value="${o.symbol}" ${o.symbol === current ? 'selected' : ''}>${o.label}</option>`).join('')}
      </select>
      <div class="settings-hint">Solo cambia el símbolo mostrado. Los montos se guardan y calculan igual, en COP.</div>
    </div>`;
  enhanceFormControls(el);
}

function setCurrencySymbol(symbol) {
  try { localStorage.setItem('moni_currency_symbol', symbol); } catch (_) {}
  clearCurrencySymbolCache();
  renderAll();
}

// ── Backup ───────────────────────────────────────────────────────────────────
function renderSettingsBackup() {
  const el = document.getElementById('settings-backup');
  if (!el) return;
  el.innerHTML = `
    <div style="display:flex;gap:var(--sp-4);flex-wrap:wrap;align-items:center">
      <button type="button" class="btn btn-accent btn-sm" onclick="exportSettingsBackup()">Exportar JSON</button>
      <label class="btn btn-dim btn-sm" style="cursor:pointer;margin:0">
        Importar JSON
        <input type="file" accept="application/json" style="display:none" onchange="importSettingsBackup(this)" />
      </label>
    </div>
    <div class="settings-hint">Importar solo agrega filas del archivo; no reemplaza lo que ya tenés. Si los ids chocan con datos existentes, fallará.</div>
    <div class="form-status" id="settings-backup-status" style="margin-top:var(--sp-4)"></div>`;
}

async function exportSettingsBackup() {
  const status = document.getElementById('settings-backup-status');
  try {
    const data = await apiFetch('/api/all');
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url;
    a.download = `moni-backup-${todayStr()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  } catch (err) {
    if (status) { status.className = 'form-status err'; status.textContent = '❌ ' + err.message; }
  }
}

async function importSettingsBackup(input) {
  const file = input.files[0];
  if (!file) return;
  const status = document.getElementById('settings-backup-status');
  if (status) { status.className = 'form-status'; status.textContent = 'Importando...'; }
  try {
    const payload = JSON.parse(await file.text());
    const result  = await apiFetch('/api/import', { method: 'POST', body: payload });
    await fetchAll();
    if (status) {
      status.className = 'form-status ok';
      status.textContent = 'Importado: ' + Object.entries(result).map(([k, v]) => `${v} ${k}`).join(', ');
    }
  } catch (err) {
    if (status) { status.className = 'form-status err'; status.textContent = '❌ ' + err.message; }
  } finally {
    input.value = '';
  }
}

// ── Zona de peligro ──────────────────────────────────────────────────────────
function renderSettingsDanger() {
  const el = document.getElementById('settings-danger');
  if (!el) return;
  el.innerHTML = `
    <div class="settings-hint" style="margin-top:0;margin-bottom:var(--sp-6)">
      Borra todas las transacciones, deudas, inversiones, activos y recurrentes. No se puede deshacer.
    </div>
    <button type="button" class="btn btn-danger btn-sm" onclick="openTruncateConfirm()">Borrar todos los datos</button>`;
}

function openTruncateConfirm() {
  openModal('Borrar todos los datos', `
    <div class="settings-hint" style="margin-top:0;margin-bottom:var(--sp-7)">
      Esto borra permanentemente todas las transacciones, deudas, inversiones, activos y recurrentes.
      Esta acción no se puede deshacer. Exportá un backup antes si no estás seguro.
    </div>
    <div class="form-group">
      <label class="form-label">Escribí BORRAR para confirmar</label>
      <input class="form-input" type="text" id="m-confirm-truncate" placeholder="BORRAR" autocomplete="off" />
    </div>
    <div class="modal-footer">
      <button class="btn btn-danger" onclick="confirmTruncate()">Borrar todo</button>
      <button class="btn btn-dim" style="margin-left:auto" onclick="closeModal()">Cancelar</button>
    </div>
    <div class="form-status" id="m-status" style="margin-top:8px"></div>
  `);
}

async function confirmTruncate() {
  const val = document.getElementById('m-confirm-truncate').value.trim();
  if (val !== 'BORRAR') { setModalStatus('err', 'Escribí BORRAR (en mayúsculas) para confirmar'); return; }
  setModalStatus('', 'Borrando...');
  try {
    await apiFetch('/api/truncate', { method: 'POST' });
    closeModal();
    await fetchAll();
  } catch (err) { setModalStatus('err', '❌ ' + err.message); }
}
