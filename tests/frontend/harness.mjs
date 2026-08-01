// Carga los archivos de public/js/ en un contexto de vm para poder testear la
// matemática de plata sin navegador. Los archivos son scripts globales sin
// exports (ver CLAUDE.md), así que se evalúan tal cual y el contexto queda
// expuesto como si fuera window.
//
// Node aplica TZ en cada operación de Date, así que fijarla acá — antes de que
// se cree cualquier Date — hace que la suite corra igual en cualquier máquina.
// Sin esto los bugs de zona horaria solo aparecen en offsets negativos.
process.env.TZ = 'America/Bogota';

import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const JS_DIR = new URL('../../public/js/', import.meta.url);

function fakeLocalStorage() {
  const store = new Map();
  return {
    getItem: k => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: k => store.delete(k),
    clear: () => store.clear(),
  };
}

export function loadMoni(files, { now = null, state = {} } = {}) {
  const ctx = vm.createContext({
    console,
    localStorage: fakeLocalStorage(),
    S: { transacciones: [], deudas: [], inversiones: [], activos: [], recurrentes: [], ...state },
  });

  if (now) {
    const [y, m, d] = now.split('-').map(Number);
    vm.runInContext(
      `globalThis.__hoy = new Date(${y}, ${m - 1}, ${d}).getTime();
       const _Real = Date;
       globalThis.Date = class extends _Real {
         constructor(...a) { super(...(a.length ? a : [globalThis.__hoy])); }
         static now() { return globalThis.__hoy; }
       };`,
      ctx,
    );
  }

  for (const f of files) {
    vm.runInContext(readFileSync(new URL(f, JS_DIR), 'utf8'), ctx, { filename: f });
  }
  return ctx;
}

// Ojo: solo las declaraciones `function` quedan colgadas del objeto de contexto.
// Un `const` de nivel superior vive en el scope léxico global, que los scripts
// comparten entre sí pero no expone; para leerlo desde un test hay que
// evaluarlo con vm.runInContext(nombre, ctx).

// Los helpers de plata viven repartidos entre format/dashboard/recurrentes.
export const MONEY_FILES = [
  'config.js',
  'services/format.js',
  'features/dashboard.js',
  'features/recurrentes.js',
];
