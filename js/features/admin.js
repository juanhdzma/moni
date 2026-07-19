// Removed — CRUD now lives inline en cada feature tab.
// Lo de abajo es solo para pruebas locales (seed / truncate de la DB).

async function seedTestData() {
  try {
    await apiFetch('/api/admin/seed', { method: 'POST' });
    hideBanner();
    await fetchAll();
  } catch (err) { showBanner(err.message); }
}

async function truncateAllData() {
  if (!confirm('¿Borrar TODOS los datos (transacciones, deudas, inversiones, activos, recurrentes)? Esta acción no se puede deshacer.')) return;
  try {
    await apiFetch('/api/admin/truncate', { method: 'POST' });
    hideBanner();
    await fetchAll();
  } catch (err) { showBanner(err.message); }
}
