const CATEGORIES = {
  ingreso:  ['Salario', 'Freelance', 'Arriendo recibido', 'Dividendos', 'Ventas', 'Reembolso', 'Crédito recibido', 'Venta activos', 'Otros ingresos'],
  gasto:    ['Alimentación', 'Vivienda', 'Transporte', 'Salud', 'Entretenimiento', 'Educación', 'Ropa', 'Servicios', 'Restaurantes', 'Inversión', 'Compra activos', 'Otros gastos'],
  transfer: ['Ahorro', 'Inversión', 'Pago deuda', 'Otro'],
};

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
  const idx = CATEGORIES[tipo]?.indexOf(nombre);
  if (idx === undefined || idx < 0) return;
  CATEGORIES[tipo].splice(idx, 1);
  try {
    const custom = JSON.parse(localStorage.getItem('moni_cats') || '{}');
    if (custom[tipo]) custom[tipo] = custom[tipo].filter(c => c !== nombre);
    localStorage.setItem('moni_cats', JSON.stringify(custom));
  } catch(_) {}
}
