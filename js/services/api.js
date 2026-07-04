async function apiFetch(path, opts = {}) {
  const res = await fetch(path, {
    method: opts.method || 'GET',
    headers: opts.body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });
  if (!res.ok) {
    let msg = `Error ${res.status}`;
    try {
      const j = await res.json();
      if (Array.isArray(j.detail)) msg = j.detail.map(d => d.msg).join(', ');
      else if (j.detail) msg = j.detail;
    } catch (_) {}
    throw new Error(msg);
  }
  if (res.status === 204) return null;
  return res.json();
}

async function fetchAll() {
  try {
    const data = await apiFetch('/api/all');
    S.transacciones = data.transacciones.map(r => ({ ...r, _id: r.id }));
    S.deudas        = data.deudas.map(r => ({ ...r, _id: r.id }));
    S.inversiones   = data.inversiones.map(r => ({ ...r, _id: r.id }));
    S.activos       = data.activos.map(r => ({ ...r, _id: r.id }));
    S.recurrentes   = data.recurrentes.map(r => ({ ...r, _id: r.id, activo: !!r.activo }));
    hideBanner(); renderAll();
  } catch (err) { showBanner(err.message); renderAll(); }
}

// ── CRUD helpers ─────────────────────────────────────────────────────────────
// entity is the API path segment: tx | deuda | inv | activo | rec
async function crudOp(entity, action, payload) {
  const base = `/api/${entity}`;
  if (action === 'add') {
    await apiFetch(base, { method: 'POST', body: payload });
  } else if (action === 'update') {
    const { _id, ...body } = payload;
    await apiFetch(`${base}/${_id}`, { method: 'PUT', body });
  } else if (action === 'delete') {
    await apiFetch(`${base}/${payload._id}`, { method: 'DELETE' });
  }
  closeModal();
  await fetchAll();
}

// For composite actions (pago, rendimiento, aporte, retiro, venta) that hit a
// dedicated backend route instead of the generic entity CRUD above.
async function apiAction(path, payload) {
  await apiFetch(path, { method: 'POST', body: payload });
  closeModal();
  await fetchAll();
}
