// ── Shared helpers ───────────────────────────────────────────────────────────
function advancedToggle(label = 'Registrar como nuevo en transacciones', hint = 'Desactivá si ya lo tenías antes de usar Moni.') {
  return `
    <details class="advanced-toggle">
      <summary><span>▸</span> Opciones de registro</summary>
      <div class="advanced-body">
        <label>
          <input type="checkbox" id="m-es-nueva" checked />
          ${label}
        </label>
        <div class="hint">${hint}</div>
      </div>
    </details>`;
}

// ── Modal ────────────────────────────────────────────────────────────────────
function openModal(title, bodyHtml) {
  document.getElementById('modal-title').textContent = title;
  const body = document.getElementById('modal-body');
  body.innerHTML = bodyHtml;
  enhanceFormControls(body);
  document.getElementById('modal-overlay').classList.add('open');
}
function closeModal() {
  document.getElementById('modal-overlay').classList.remove('open');
  _pendingProxOpKey = null;
}
function setModalStatus(cls, msg) {
  const el = document.getElementById('m-status');
  if (!el) return;
  el.className = 'form-status' + (cls ? ' ' + cls : '');
  el.textContent = msg;
}

// ── Navigation ───────────────────────────────────────────────────────────────
function setTab(tab) {
  document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.nav-btn, .nav-drawer-item').forEach(el => el.classList.remove('active'));
  document.getElementById('tab-' + tab)?.classList.add('active');
  document.querySelectorAll(`[data-tab="${tab}"]`).forEach(el => el.classList.add('active'));
  updateFab(tab);
  closeNavDrawer();
}

// ── Nav drawer (mobile hamburger menu) ────────────────────────────────────────
function openNavDrawer() {
  document.getElementById('nav-drawer-overlay')?.classList.add('open');
}
function closeNavDrawer() {
  document.getElementById('nav-drawer-overlay')?.classList.remove('open');
}

// ── FAB (mobile primary action, mirrors each tab's own + button) ─────────────
const FAB_ACTIONS = {
  transacciones: () => openTxForm(),
  deudas: () => openDeudaForm(),
  inversiones: () => openInvForm(),
  activos: () => openActivoForm(),
  recurrentes: () => openRecurrenteForm(),
};
function updateFab(tab) {
  const fab = document.getElementById('fab-btn');
  if (!fab) return;
  fab.dataset.tab = tab;
  fab.style.display = FAB_ACTIONS[tab] ? '' : 'none';
}
function fabAction() {
  const tab = document.getElementById('fab-btn')?.dataset.tab;
  FAB_ACTIONS[tab]?.();
}

// ── Banners ──────────────────────────────────────────────────────────────────
function showBanner(msg) {
  const el = document.getElementById('err-banner');
  if (el) { el.textContent = '⚠ ' + msg; el.style.display = 'block'; }
}
function hideBanner() {
  const el = document.getElementById('err-banner');
  if (el) el.style.display = 'none';
}

// ── Render all ───────────────────────────────────────────────────────────────
function renderAll() {
  renderDashboard();
  renderGastosBar();
  initTransacciones();
  renderDeudas();
  renderInversiones();
  renderActivos();
  renderRecurrentes();
  updateNavWarnings();
}

// ── Warnings de precios desactualizados ──────────────────────────────────────
function updateNavWarnings() {
  const activosStale = S.activos.some(a => isStale(a.valor_actualizado_en));
  const invStale = S.inversiones.some(i => i.tipo === 'variable' && isStale(i.valor_actualizado_en));
  document.querySelectorAll('[data-tab="activos"]').forEach(el => el.classList.toggle('has-warning', activosStale));
  document.querySelectorAll('[data-tab="inversiones"]').forEach(el => el.classList.toggle('has-warning', invStale));
}

// ── Refresh ──────────────────────────────────────────────────────────────────
async function refreshData() {
  const btn = document.getElementById('refresh-btn');
  if (btn) { btn.style.transform = 'rotate(360deg)'; btn.style.color = 'var(--accent)'; }
  await fetchAll();
  setTimeout(() => { if (btn) { btn.style.transform = ''; btn.style.color = ''; } }, 600);
}

document.addEventListener('DOMContentLoaded', () => {
  enhanceFormControls(document.body);
  loadCustomCategories();
  fetchAll();
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') { closeModal(); closeNavDrawer(); }
  });
  updateFab('dashboard');
});
