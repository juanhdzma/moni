const FRANQUICIA_ICONS = {
  Visa:       'assets/franquicias/visa.svg',
  Mastercard: 'assets/franquicias/mastercard.svg',
  Amex:       'assets/franquicias/americanexpress.svg',
  Otra:       'assets/franquicias/otra.svg',
};

// Categorías que el backend asigna solo (composite actions en backend/main.py) —
// tienen que existir siempre para que editar esas transacciones no pise la categoría real.
const SYSTEM_CATEGORIES = {
  ingreso:  ['Crédito recibido', 'Avance de tarjeta', 'Intereses', 'Dividendos', 'Venta activos'],
  gasto:    ['Inversión', 'Compra activos'],
  transfer: ['Pago deuda'],
};

const CATEGORIES = {
  ingreso:  [...SYSTEM_CATEGORIES.ingreso],
  gasto:    [...SYSTEM_CATEGORIES.gasto],
  transfer: [...SYSTEM_CATEGORIES.transfer],
};

function isSystemCategory(tipo, nombre) {
  return SYSTEM_CATEGORIES[tipo]?.includes(nombre) ?? false;
}

function loadCustomCategories() {
  try {
    const custom = JSON.parse(localStorage.getItem('moni_cats') || '{}');
    Object.keys(custom).forEach(tipo => {
      if (!CATEGORIES[tipo]) return;
      custom[tipo].forEach(cat => {
        if (!CATEGORIES[tipo].includes(cat)) CATEGORIES[tipo].push(cat);
      });
    });
  } catch(_) {}
}

function addCustomCategory(tipo, nombre) {
  nombre = nombre.trim();
  if (!nombre || !CATEGORIES[tipo] || CATEGORIES[tipo].includes(nombre)) return false;
  CATEGORIES[tipo].push(nombre);
  try {
    const custom = JSON.parse(localStorage.getItem('moni_cats') || '{}');
    if (!custom[tipo]) custom[tipo] = [];
    custom[tipo].push(nombre);
    localStorage.setItem('moni_cats', JSON.stringify(custom));
  } catch(_) {}
  return true;
}

function removeCustomCategory(tipo, nombre) {
  if (isSystemCategory(tipo, nombre)) return;
  const idx = CATEGORIES[tipo]?.indexOf(nombre);
  if (idx === undefined || idx < 0) return;
  CATEGORIES[tipo].splice(idx, 1);
  try {
    const custom = JSON.parse(localStorage.getItem('moni_cats') || '{}');
    if (custom[tipo]) custom[tipo] = custom[tipo].filter(c => c !== nombre);
    localStorage.setItem('moni_cats', JSON.stringify(custom));
  } catch(_) {}
}
