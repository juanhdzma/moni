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
const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
let _focoPrevio = null;

function modalFocusables() {
  const overlay = document.getElementById('modal-overlay');
  return [...overlay.querySelectorAll(FOCUSABLE)].filter(el => el.offsetParent !== null);
}

// Tab dentro del modal no debe llevarte a la página de atrás.
function trapModalFocus(e) {
  if (e.key !== 'Tab') return;
  const focusables = modalFocusables();
  if (!focusables.length) return;
  const primero = focusables[0], ultimo = focusables[focusables.length - 1];
  if (e.shiftKey && document.activeElement === primero) { e.preventDefault(); ultimo.focus(); }
  else if (!e.shiftKey && document.activeElement === ultimo) { e.preventDefault(); primero.focus(); }
}

function openModal(title, bodyHtml) {
  _focoPrevio = document.activeElement;
  document.getElementById('modal-title').textContent = title;
  const body = document.getElementById('modal-body');
  body.innerHTML = bodyHtml;
  enhanceFormControls(body);
  const overlay = document.getElementById('modal-overlay');
  overlay.classList.add('open');
  overlay.addEventListener('keydown', trapModalFocus);
  modalFocusables()[0]?.focus();
}

function closeModal() {
  const overlay = document.getElementById('modal-overlay');
  overlay.classList.remove('open');
  overlay.removeEventListener('keydown', trapModalFocus);
  _pendingProxOpKey = null;
  // Los popups de ui-controls viven fuera del modal: sin esto quedan colgados.
  closeAnyOpenPopup();
  _focoPrevio?.focus?.();
  _focoPrevio = null;
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
// Cada tab se renderiza aislado: antes, si uno tiraba (p.ej. Chart.js sin cargar),
// los siguientes nunca corrían y la app quedaba en blanco en vez de degradada.
const RENDERERS = [
  ['dashboard', renderDashboard],
  ['gastos', renderGastosBar],
  ['transacciones', initTransacciones],
  ['deudas', renderDeudas],
  ['inversiones', renderInversiones],
  ['activos', renderActivos],
  ['recurrentes', renderRecurrentes],
  ['settings', renderSettings],
  ['warnings', updateNavWarnings],
];

function renderAll() {
  const fallaron = [];
  RENDERERS.forEach(([nombre, fn]) => {
    try {
      fn();
    } catch (err) {
      fallaron.push(nombre);
      console.error(`render ${nombre} falló:`, err);
    }
  });
  if (fallaron.length) showBanner(`No se pudo dibujar: ${fallaron.join(', ')}. Mirá la consola.`);
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
