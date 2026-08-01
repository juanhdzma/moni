// ── Custom form controls (dropdown + date/datetime picker) ─────────────────
// Progressively enhances native <select> and <input type="date|datetime-local">
// elements: the native element stays in the DOM (hidden) and keeps its value
// in sync, so existing feature code that reads/writes `.value` or mutates
// <option>s keeps working untouched.
//
// Popups use position:fixed positioned via JS from the trigger's viewport rect
// (not CSS position:absolute) so they escape the modal's own overflow-y:auto
// instead of being clipped/pushed and requiring an inner scroll to see them.

let activePopup = null;
function openPopup(dismiss) {
  if (activePopup) activePopup();
  activePopup = dismiss;
}
function clearActivePopup(dismiss) {
  if (activePopup === dismiss) activePopup = null;
}
function closeAnyOpenPopup() {
  if (activePopup) { const d = activePopup; activePopup = null; d(); }
}

function enhanceFormControls(root) {
  root.querySelectorAll('select:not(.cdd-enhanced)').forEach(enhanceSelect);
  root.querySelectorAll('input[type="date"]:not(.cdp-enhanced), input[type="datetime-local"]:not(.cdp-enhanced)')
    .forEach(enhanceDatePicker);
}

function cdpReposition(trigger, popup, opts = {}) {
  const r = trigger.getBoundingClientRect();
  const h = popup.offsetHeight, w = popup.offsetWidth;
  const spaceBelow = window.innerHeight - r.bottom, spaceAbove = r.top;
  let top = (spaceBelow >= h + 8 || spaceBelow >= spaceAbove) ? r.bottom + 6 : r.top - h - 6;
  top = Math.max(8, Math.min(top, window.innerHeight - h - 8));
  let left = opts.alignRight ? r.right - w : r.left;
  left = Math.max(8, Math.min(left, window.innerWidth - w - 8));
  popup.style.top = `${top}px`;
  popup.style.left = `${left}px`;
  if (opts.matchWidth) popup.style.width = `${r.width}px`;
}

// ── Dropdown ─────────────────────────────────────────────────────────────
function enhanceSelect(select) {
  select.classList.add('cdd-enhanced');
  const isCompact = select.classList.contains('select-styled');

  const wrap = document.createElement('div');
  wrap.className = 'cdd' + (isCompact ? ' cdd-inline' : '');
  const inlineStyle = select.getAttribute('style') || '';
  wrap.setAttribute('style', inlineStyle);

  select.parentNode.insertBefore(wrap, select);
  wrap.appendChild(select);
  select.classList.add('cdd-native');

  const trigger = document.createElement('button');
  trigger.type = 'button';
  trigger.className = 'cdd-trigger ' + (isCompact ? 'select-styled' : 'form-input');
  trigger.innerHTML = '<span class="cdd-label"></span><span class="cdd-arrow">▾</span>';
  wrap.appendChild(trigger);

  const menu = document.createElement('div');
  menu.className = 'cdd-menu';
  wrap.appendChild(menu);

  function syncLabel() {
    const opt = select.options[select.selectedIndex];
    trigger.querySelector('.cdd-label').textContent = opt ? opt.textContent : '';
  }

  function buildMenu() {
    menu.innerHTML = '';
    Array.from(select.options).forEach((opt, i) => {
      const item = document.createElement('div');
      item.className = 'cdd-option' + (i === select.selectedIndex ? ' sel' : '');
      item.textContent = opt.textContent;
      item.addEventListener('click', () => {
        select.selectedIndex = i;
        select.dispatchEvent(new Event('change', { bubbles: true }));
        syncLabel();
        close();
      });
      menu.appendChild(item);
    });
  }

  function reposition() { cdpReposition(trigger, menu, { matchWidth: !isCompact }); }

  function dismiss() { close(); }

  function open() {
    buildMenu();
    menu.classList.add('open');
    trigger.classList.add('open');
    reposition();
    window.addEventListener('scroll', reposition, true);
    window.addEventListener('resize', reposition, true);
    openPopup(dismiss);
  }
  function close() {
    menu.classList.remove('open');
    trigger.classList.remove('open');
    window.removeEventListener('scroll', reposition, true);
    window.removeEventListener('resize', reposition, true);
    clearActivePopup(dismiss);
  }

  trigger.addEventListener('click', () => {
    menu.classList.contains('open') ? close() : open();
  });
  wrap.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });

  // Keeps the trigger label in sync when code outside this module sets
  // `select.value` directly and dispatches 'change' (e.g. clearing a filter).
  select.addEventListener('change', syncLabel);
  new MutationObserver(syncLabel).observe(select, { childList: true });
  syncLabel();

  wrap._cddMenu = menu;
}

// ── Date / datetime picker ──────────────────────────────────────────────
const CDP_WEEKDAYS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

function cdpPad(n) { return String(n).padStart(2, '0'); }

function cdpParse(value, isDateTime) {
  const now = new Date();
  if (!value) {
    return isDateTime
      ? { y: now.getFullYear(), m: now.getMonth(), d: now.getDate(), hh: now.getHours(), mm: now.getMinutes() }
      : { y: now.getFullYear(), m: now.getMonth(), d: now.getDate(), hh: 0, mm: 0 };
  }
  const [datePart, timePart] = value.split('T');
  const [y, mo, d] = datePart.split('-').map(Number);
  const [hh, mm] = (timePart || '00:00').split(':').map(Number);
  return { y, m: mo - 1, d, hh: hh || 0, mm: mm || 0 };
}

function cdpFormat(state, isDateTime) {
  const dateStr = `${state.y}-${cdpPad(state.m + 1)}-${cdpPad(state.d)}`;
  return isDateTime ? `${dateStr}T${cdpPad(state.hh)}:${cdpPad(state.mm)}` : dateStr;
}

function enhanceDatePicker(input) {
  input.classList.add('cdp-enhanced');
  const isDateTime = input.type === 'datetime-local';

  const wrap = document.createElement('div');
  wrap.className = 'cdp';
  const inlineStyle = input.getAttribute('style') || '';
  wrap.setAttribute('style', inlineStyle);

  input.parentNode.insertBefore(wrap, input);
  wrap.appendChild(input);
  input.classList.add('cdp-native');

  const trigger = document.createElement('button');
  trigger.type = 'button';
  trigger.className = 'cdp-trigger form-input';
  trigger.innerHTML = '<span class="cdp-label"></span><span class="cdp-icon">📅</span>';
  wrap.appendChild(trigger);

  const panel = document.createElement('div');
  panel.className = 'cdp-panel';
  wrap.appendChild(panel);

  let pending = cdpParse(input.value, isDateTime);
  let viewY = pending.y, viewM = pending.m;

  function syncLabel() {
    const label = trigger.querySelector('.cdp-label');
    if (!input.value) { label.textContent = 'Seleccionar fecha'; return; }
    label.textContent = isDateTime ? fmtDateTime(input.value) : fmtDate(input.value);
  }

  function reposition() { cdpReposition(trigger, panel, {}); }

  // Outside click / switching to another field = keep whatever was staged.
  function dismiss() { commit(true); }

  function commit(closeAfter) {
    input.value = cdpFormat(pending, isDateTime);
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
    syncLabel();
    if (closeAfter) close();
    else { renderPanel(); reposition(); }
  }

  function selectDay(y, m, d) {
    pending = { ...pending, y, m, d };
    viewY = y; viewM = m;
    if (isDateTime) { renderPanel(); reposition(); }
    else commit(true);
  }

  function renderPanel() {
    const monthLabel = new Date(viewY, viewM, 1)
      .toLocaleDateString('es-CO', { month: 'long', year: 'numeric' });
    const firstDow = (new Date(viewY, viewM, 1).getDay() + 6) % 7; // Monday-first
    const daysInMonth = new Date(viewY, viewM + 1, 0).getDate();
    const daysInPrevMonth = new Date(viewY, viewM, 0).getDate();
    const today = new Date();

    const cells = [];
    for (let i = 0; i < firstDow; i++) {
      const d = daysInPrevMonth - firstDow + 1 + i;
      const m = viewM === 0 ? 11 : viewM - 1, y = viewM === 0 ? viewY - 1 : viewY;
      cells.push({ d, m, y, dim: true });
    }
    for (let d = 1; d <= daysInMonth; d++) cells.push({ d, m: viewM, y: viewY, dim: false });
    while (cells.length % 7 !== 0 || cells.length < 42) {
      const last = cells[cells.length - 1];
      const nd = new Date(last.y, last.m, last.d + 1);
      cells.push({ d: nd.getDate(), m: nd.getMonth(), y: nd.getFullYear(), dim: true });
      if (cells.length >= 42) break;
    }

    const daysHtml = cells.map(c => {
      const isToday = c.y === today.getFullYear() && c.m === today.getMonth() && c.d === today.getDate();
      const isSel = c.y === pending.y && c.m === pending.m && c.d === pending.d;
      const cls = ['cdp-day'];
      if (c.dim) cls.push('dim');
      if (isToday) cls.push('today');
      if (isSel) cls.push('sel');
      return `<button type="button" class="${cls.join(' ')}" data-y="${c.y}" data-m="${c.m}" data-d="${c.d}">${c.d}</button>`;
    }).join('');

    panel.innerHTML = `
      <div class="cdp-nav">
        <button type="button" class="cdp-nav-btn" data-nav="-1">‹</button>
        <div class="cdp-month">${monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1)}</div>
        <button type="button" class="cdp-nav-btn" data-nav="1">›</button>
      </div>
      <div class="cdp-weekdays">${CDP_WEEKDAYS.map(w => `<span>${w}</span>`).join('')}</div>
      <div class="cdp-days">${daysHtml}</div>
      ${isDateTime ? `
        <div class="cdp-time-row">
          <input class="cdp-time-input" type="text" inputmode="numeric" maxlength="2" value="${cdpPad(pending.hh)}" data-time="hh" />
          <span class="cdp-time-sep">:</span>
          <input class="cdp-time-input" type="text" inputmode="numeric" maxlength="2" value="${cdpPad(pending.mm)}" data-time="mm" />
        </div>` : ''}
      <div class="cdp-actions">
        <button type="button" class="cdp-today">Hoy</button>
        ${isDateTime ? '<button type="button" class="cdp-accept">Aceptar</button>' : ''}
      </div>`;

    panel.querySelectorAll('.cdp-day').forEach(btn => {
      btn.addEventListener('click', () => selectDay(+btn.dataset.y, +btn.dataset.m, +btn.dataset.d));
    });
    panel.querySelectorAll('.cdp-nav-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        viewM += +btn.dataset.nav;
        if (viewM < 0) { viewM = 11; viewY--; }
        if (viewM > 11) { viewM = 0; viewY++; }
        renderPanel();
        reposition();
      });
    });
    panel.querySelector('.cdp-today')?.addEventListener('click', () => {
      const now = new Date();
      pending = isDateTime
        ? { y: now.getFullYear(), m: now.getMonth(), d: now.getDate(), hh: now.getHours(), mm: now.getMinutes() }
        : { ...pending, y: now.getFullYear(), m: now.getMonth(), d: now.getDate() };
      viewY = pending.y; viewM = pending.m;
      if (isDateTime) { renderPanel(); reposition(); }
      else commit(true);
    });
    panel.querySelectorAll('.cdp-time-input').forEach(el => {
      el.addEventListener('change', () => {
        const max = el.dataset.time === 'hh' ? 23 : 59;
        const val = Math.min(max, Math.max(0, parseInt(el.value, 10) || 0));
        pending[el.dataset.time] = val;
        el.value = cdpPad(val);
      });
    });
    panel.querySelector('.cdp-accept')?.addEventListener('click', () => commit(true));
  }

  function open() {
    pending = cdpParse(input.value, isDateTime);
    viewY = pending.y; viewM = pending.m;
    renderPanel();
    panel.classList.add('open');
    trigger.classList.add('open');
    reposition();
    window.addEventListener('scroll', reposition, true);
    window.addEventListener('resize', reposition, true);
    openPopup(dismiss);
  }
  function close() {
    panel.classList.remove('open');
    trigger.classList.remove('open');
    window.removeEventListener('scroll', reposition, true);
    window.removeEventListener('resize', reposition, true);
    clearActivePopup(dismiss);
  }

  trigger.addEventListener('click', () => {
    panel.classList.contains('open') ? close() : open();
  });
  // Escape cancels the staged selection (unlike outside-click, which keeps it).
  wrap.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });

  syncLabel();
  wrap._cdpPanel = panel;
}

document.addEventListener('click', e => {
  if (!activePopup) return;
  if (e.target.closest('.cdd, .cdp, .cdd-menu, .cdp-panel')) return;
  closeAnyOpenPopup();
}, true);
