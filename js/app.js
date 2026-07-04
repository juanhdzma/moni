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
  document.getElementById('modal-body').innerHTML = bodyHtml;
  document.getElementById('modal-overlay').classList.add('open');
}
function closeModal() {
  document.getElementById('modal-overlay').classList.remove('open');
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
  document.querySelectorAll('.nav-btn').forEach(el => el.classList.remove('active'));
  document.getElementById('tab-' + tab)?.classList.add('active');
  document.querySelector(`[data-tab="${tab}"]`)?.classList.add('active');
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
}

// ── Refresh ──────────────────────────────────────────────────────────────────
async function refreshData() {
  const btn = document.getElementById('refresh-btn');
  if (btn) { btn.style.transform = 'rotate(360deg)'; btn.style.color = 'var(--accent)'; }
  await fetchAll();
  setTimeout(() => { if (btn) { btn.style.transform = ''; btn.style.color = ''; } }, 600);
}

document.addEventListener('DOMContentLoaded', () => {
  loadCustomCategories();
  fetchAll();
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeModal();
  });
});
