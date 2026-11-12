# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Moni: a personal finance tracker (Spanish UI, Colombian peso). React + TypeScript frontend (`web/`, built with Vite) served as static files by a FastAPI backend backed by SQLite. One process, one port in production; the frontend needs a build step.

## Running locally

No installed venv/conda env in the repo, set one up ad hoc:

```bash
python3 -m venv .venv && source .venv/bin/activate   # or use conda per user global prefs
pip install -r backend/requirements.txt
uvicorn backend.main:app --reload --port 8080
```

Frontend (Node 22, see `web/.nvmrc`):

```bash
cd web && npm ci
npm run dev      # Vite on http://localhost:5173, proxies /api to http://localhost:8080
npm run build    # writes web/dist
```

For day-to-day work run the backend on 8080 and `npm run dev` in `web/`, then open `http://localhost:5173`. To exercise what production serves, run `npm run build` and open `http://localhost:8080`: FastAPI serves `web/dist` via `StaticFiles` mounted at `/` (`FRONTEND_DIR` in backend/main.py). If `web/dist` is missing the backend still starts, logs an error and answers 404 for the frontend (the API keeps working).

**The docroot is `web/dist`, not the repo root**: everything under it is downloadable by anyone who can reach the port, and everything outside it (backend code, the SQLite file, `.git`, `web/src`, `web/package.json`) is not. Don't point `FRONTEND_DIR` anywhere else, and don't put anything in `web/dist` besides the build output. Static assets (fonts, icons, franquicias) live in `web/public/assets/` and are copied into `dist` by Vite with the same URLs.

Via Docker:
```bash
docker compose up --build
```
Serves on port 8080 (mapped to container port 80). SQLite file persists in the `moni-data` named volume at `/app/backend/data`. The Dockerfile is multi-stage: a pinned `node:22.*-slim` stage runs `npm ci` + `npm run build` in `web/`, and the final `python:3.12-slim` image gets only `backend/` plus `web/dist`. No `web/src`, `node_modules`, tests or docs ship in the image.

Backend tests: `pip install -r backend/requirements-dev.txt && python -m pytest backend/tests -q`. They cover card-balance adjustment, the composite actions, input validation, the backup round-trip and the static docroot; each test gets a throwaway SQLite file via the `client` fixture in `backend/tests/conftest.py`. `test_static.py` reads `web/dist/index.html`, so it **fails (does not skip) until you run `npm run build` in `web/`**. **Add a test when you touch anything that moves money.**

Frontend tests, in `web/`: `npm test` (Vitest + Testing Library + jsdom; the script pins `TZ=America/Bogota` and a setup file asserts it, so timezone bugs surface on any machine), `npm run lint` (ESLint + typescript-eslint + react-hooks), `npm run typecheck` (`tsc -b --noEmit`, strict), `npm run build`. Pure money/date math in `web/src/lib/` has unit tests; every feature has Testing Library tests that assert the exact request (method, URL, JSON body, `X-Moni-Request` header) sent to a mocked `fetch` (`web/src/test/mockFetch.ts`). jsdom has no layout, so verify visual changes by exercising the app.

**Mutating requests (`POST`/`PUT`/`DELETE` on `/api/*`) require an `X-Moni-Request` header**, or the backend returns 403 (`require_csrf_header`, main.py). `apiFetch` (`web/src/lib/api.ts`) adds it automatically; hand-written `curl` needs `-H 'X-Moni-Request: 1'`. This exists because the app has no auth: it blocks a cross-origin `<form>` POST to a destructive endpoint like `/api/truncate`.

## CI and deploying

`.github/workflows/build-push.yml` has two jobs. `test` runs, in order, `npm ci`, lint, typecheck, `npm test` and `npm run build` in `web/`, then pytest (it needs `web/dist` for `test_static.py`). `build` then builds and pushes to `ghcr.io/<owner>/moni` (tags `latest` + commit SHA) on every push to `main`. Production `docker-compose.yml` (on the home server, via Portainer) points `image:` at that GHCR tag instead of `build: .`; local dev keeps `build: .`. Don't rename the image without updating both, the workflow used to publish as `fondo-familiar` (copy-pasted from the sibling `fondi` repo) before being corrected to `moni`.

## Architecture

**Backend (`backend/`)** — single-file FastAPI app (`main.py`) + `db.py` for the SQLite connection/schema.
- `db.py` defines the schema inline as a `CREATE TABLE IF NOT EXISTS` script, plus a `MIGRATIONS` list of `ALTER TABLE` statements applied on startup (each wrapped in a try/except to no-op if the column already exists). **There is no migration framework** — to change a table shape, add a column to `SCHEMA` *and* append the matching `ALTER TABLE` to `MIGRATIONS` so existing databases pick it up.
- Five tables: `transacciones`, `deudas` (debts, including credit cards via `es_tarjeta`), `inversiones`, `activos`, `recurrentes`. No SQLAlchemy/ORM — raw SQL via `sqlite3.Row`.
- `register_crud()` generates POST/PUT/DELETE routes for `deuda`, `inv`, `activo`, `rec` from a `TABLES` dict of (table name, column list). `transacciones` has its own hand-written CRUD instead, because a `gasto` charged to a card (`tarjeta_id` set) must also adjust that card's `deudas.saldo_actual` (see `_ajustar_saldo_tarjeta`) — every tx create/update/delete has to undo the old balance effect before applying the new one.
- There is **no FK on `transacciones.tarjeta_id`** (SQLite can't add one via `ALTER TABLE`, and rewriting the table on an existing prod db isn't worth it). The invariant is kept in code instead: deleting a `deudas` row nulls out the `tarjeta_id` of its transactions, and `_ajustar_saldo_tarjeta` no-ops on a missing card rather than raising. Both matter — raising there used to make orphaned transactions impossible to edit *or* delete, since `delete_tx` goes through the same function.
- Pydantic models carry the domain validation (`Literal` for enums, `Field(gt=0)` for amounts, a regex for dates). Keep it there rather than trusting the frontend — the API is reachable directly.
- **"Composite actions"** (under the `── Composite actions` banner in main.py) are POST endpoints beyond plain CRUD that touch two tables in one SQLite transaction — e.g. `/api/deuda/{id}/pago` (loan payment), `/api/inv/{id}/aporte` (investment contribution), `/api/activo/{id}/venta` (asset sale). Each optionally inserts a linked row into `transacciones` (`registrar_tx` on the request body) so the ledger stays consistent with debt/investment/asset state. When adding a new money-moving action, follow this pattern rather than mutating state from the frontend.
  - Flags on the body carry *domain* meaning, and one flag can only mean one thing. `registrar_tx` is bookkeeping ("I already logged this elsewhere"); `capitaliza` (rendimiento) and `avanzar_cuota` (pago) are economics. Overloading `registrar_tx` to also decide where the money went would silently do the wrong thing for anyone who keeps part of the ledger outside Moni.
  - `/api/deuda/{id}/pago` rolls `proxima_cuota` forward a month when `avanzar_cuota` is set, and clears it when the balance reaches zero. Only the monthly cuota sets it — an extraordinary abono or a card payment must not move the due date. Without this the date froze and the debt eventually vanished from "próximas operaciones" for good.
- Every route opens its own `sqlite3` connection via `db.get_conn()` and closes it in a `finally` — no connection pooling/dependency injection.

**Frontend (`web/`)** — React 19 + TypeScript (strict, no `any`) built with Vite. Everything is plain CSS imported globally from `web/src/styles/` (tokens, layout, components, fonts) with the original class names: no Tailwind/shadcn yet, because Tailwind's preflight would change the look. Entry: `web/src/main.tsx` -> `App.tsx` (providers) -> `shell/Shell.tsx`.
  - **No CDN, ever.** Chart.js and `chartjs-chart-treemap` come from npm and are bundled (used imperatively via `useRef`/`useEffect`, no react-chartjs-2); JetBrains Mono is self-hosted in `web/public/assets/fonts/`. This runs on a LAN with no internet.
  - `web/src/shell/` — `DataProvider` (the `estado` object, same shape as the old global `S`: `transacciones`, `deudas`, `inversiones`, `activos`, `recurrentes`, loaded wholesale from `/api/all`; `reload()`, `refresh()`, banner, `loaded`/`loadOk`), `ModalProvider` (`openModal`, `closeModal`, `setModalStatus`, pending proximas-operaciones key, focus trap, backdrop click, focus restore; the form renders inside a `ContentBoundary`, so a throwing form closes the modal and shows a banner instead of blanking the app), `CategoriasProvider` (custom categories, `moni_cats`), `useMutations` (`crudOp`, `crudOpOrBanner`, `apiAction`), `openers.ts` (cross-feature form openers taking an `OpenerCtx`, obtained with `useOpenerCtx()`), `popups.ts` (single active Select/DatePicker popup, outside click, Escape), `TabBoundary` (per-tab ErrorBoundary), `Shell.tsx` (nav, drawer, FAB mapped per tab via `FAB_ACTIONS`, stale-price `has-warning` on nav buttons, Escape closes the modal and the drawer).
  - `web/src/controls/` — `Select`, `DatePicker`, `MoneyInput`, `AdvancedToggle`, `FormStatus`: the custom form controls. Use them instead of native `<select>`/date inputs.
  - `web/src/features/<tab>/` — one folder per tab (`dashboard`, `transacciones`, `deudas`, `inversiones`, `activos`, `recurrentes`, `settings`): `index.tsx` exports the tab component (`{ active }` props, renders `TabContent`) and the openers other features may call; `forms.tsx` holds the modal forms. Import another feature only through its `index.tsx`. All tabs stay mounted, so filters/periods/sort persist across tab switches.
  - `web/src/lib/` — pure logic with unit tests: `api.ts` (`apiFetch`: fetch wrapper, `X-Moni-Request` on every non-GET, error parsing of `detail` arrays), `format.ts` (money/date/percent formatting, `normDate`, money-input masking), `config.ts` (`tieneSaldo`, franquicia icons), `dinero.ts` (money definitions, below), `proximasOps.ts`, `deudas.ts`, `inversiones.ts`, `recurrentes.ts`, `transacciones.ts`. Types in `web/src/types.ts`; API field names are exactly what the backend returns.
  - `web/src/test/` — `renderWithProviders`, `mockFetch`, factories, setup.
- **State flow is unidirectional and coarse**: any mutation (`crudOp`/`apiAction`) POSTs/PUTs/DELETEs to the backend, then calls `reload()` to refetch *all* data and replace `estado`. There is no optimistic update or partial patching, don't try to patch `estado` locally and expect it to stick. On success the order is fixed: `resolvePendingProxOp()`, `closeModal()`, `reload()`.
- `crudOp`/`apiAction` propagate errors so modal forms can show them inline via `setModalStatus('err', ...)`. For mutations fired **outside** a modal (deleting from a card, pausing a recurrente) use `crudOpOrBanner`: it catches, calls `reload()` first and only then `showBanner(message)`. The order matters: a successful reload after the banner used to hide the error. A bare `crudOp` outside a modal leaves a rejected promise nobody handles.
- Each tab renders inside its own `TabBoundary`, so one broken tab shows a "No se pudo dibujar: ..." banner instead of blanking the page. Wrap new tabs the same way.
- Values read from localStorage (`moni_cats`, `moni_skipped_ops`, `moni_currency_symbol`) are not reactive: read them during render and do not memoize without `version` in the deps; call `refresh()` after changing one. Every access is wrapped in try/catch.
- **Money definitions live in one place**, `web/src/lib/dinero.ts`, and there are *two* of them, don't collapse them:
  - `flujoCartera()` — what moves available cash. A card `gasto` doesn't (it moves the card's balance), a `transfer` does. Drives the "Cartera" KPI and the savings rate.
  - `flujoPatrimonio()` — what moves net worth. A card `gasto` *does* (it raises the debt); anything in `CATEGORIAS_NEUTRAS_PATRIMONIO` doesn't, because it only shifts money between cartera and a debt/investment/asset. Drives the evolution chart and the 12-month projection.
  - `netWorth()` is the endpoint the evolution chart walks backwards from, subtracting `monthlyPatrimonio()`. Using the cartera flow there painted every debt payment as if you'd been richer the month before. Revaluations of assets and variable investments leave no transaction, so the historical curve can't see them, only the final point has them.
  - Anything scoped to a month must stay scoped: mixing an all-time total with a current-month one (the savings rate used to) yields three-digit percentages.
- **A yield counts on one side only, never both** (`/api/inv/{id}/rendimiento`, `capitaliza` flag): if it capitalizes it raises `inversiones.valor_actual` and writes no transaction; if it's paid out it writes an `Intereses` income and leaves the investment's value alone. Doing both — which it used to — inflated net worth by the same peso twice, since `netWorth()` sums the ledger *and* `valor_actual`. Same rule for any new payout-shaped action.
- Interest paid on a debt: prefer the exact `deudas.total_intereses` accumulated by the backend; `estimarInteresesPagados()` is only the fallback for debts with no payments recorded in Moni, and its output is prefixed with `~` (see `interesesPagados`/`fmtIntereses` in `web/src/lib/deudas.ts`).
- React escapes text, so there is no `escHtml`. Never use `dangerouslySetInnerHTML` or `innerHTML`.
- The dashboard's "Próximas operaciones" widget (`features/dashboard/ProximasOperaciones.tsx`, logic in `lib/proximasOps.ts`) has no backend-tracked "already handled" state: it recomputes upcoming deuda cuotas / inversion yields / recurrente charges from current `estado` on every render, filtered against a `moni_skipped_ops` localStorage set keyed by `${type}:${sourceId}:${dateISO}`. Clicking the check (the `materialize` handler in `ProximasOperaciones.tsx`) opens the matching form but only stakes a *pending* key via `setPendingProxOp`; `resolvePendingProxOp()` is what actually marks it skipped, and `useMutations` runs it only after `crudOp`/`apiAction` succeeds. `closeModal()` clears the pending key on cancel/escape/backdrop-click. Don't skip eagerly on click, that regressed to canceling the popup silently dropping the operation from the list without registering anything. The widget prunes stale keys from `moni_skipped_ops` (`podarOcultas`) only when `loadOk` is true: after a failed load `estado` is empty, and pruning then would wipe the user's hidden operations.
- Escape closes the open Select/DatePicker popup first (capture-phase listener in `shell/popups.ts`); only a second Escape closes the modal.

## Conventions specific to this repo

- **Don't block pinch-zoom.** It has been re-broken twice by two different mechanisms: `user-scalable=no`/`maximum-scale` in the viewport meta plus `preventDefault` on gesture/touch events, and then `touch-action: pan-x pan-y` on `*` (that list without `pinch-zoom` disables the gesture just as hard). Fails WCAG 1.4.4, and the amounts are set in small mono type on mobile.
- **Anything clickable must be reachable by keyboard.** Use a `<button>`/`<a>`; a `<tr onClick>` or `<th onClick>` is not focusable on its own and needs `tabIndex={0}`, a `role`, and an Enter/Space handler. Both regressed here before; the transaction rows and the sortable headers are the worked examples.
- Domain vocabulary is Spanish throughout backend and frontend (`deuda`=debt, `inversion`=investment, `activo`=asset, `recurrente`=recurring item, `tarjeta`=card, `monto`=amount, `saldo`=balance, `cuota`=installment). Keep new identifiers consistent with this rather than mixing in English domain terms — this deviates from the user's general "code in English" preference, but matches the rest of this codebase.
- Money is stored/passed as plain numbers (COP, no cents); formatting/parsing to `es-CO` locale strings happens only at the UI edges (`web/src/lib/format.ts`). The columns are SQLite `REAL`, so every computed balance goes through `pesos()` in main.py before being written — the pro-rata in a partial withdrawal produces fractions every time, and a balance "at zero" left at 1.16e-10 keeps a paid-off debt counting as active forever. On the frontend, "is there anything left to pay" is `tieneSaldo()` (`web/src/lib/config.ts`), not `> 0`: rows written before the rounding still carry the residue.
- Dates are normalized to `YYYY-MM-DD` (or `YYYY-MM-DDTHH:MM`) via `normDate()` (`web/src/lib/format.ts`) before use; don't assume raw `fecha` fields are already in that shape.
- **Never `new Date('YYYY-MM-DD')`.** That parses as midnight *UTC*, which in GMT-5 is 19:00 the day before — dates land on the wrong day and anything due today reads as overdue. Build from components (`new Date(y, m-1, d)`), as `fechaLocal` and `mediodia` in `web/src/lib/format.ts` do. Same trap on the way out: `toISOString()` on a local date re-shifts it; use `todayStr`/`isoDate`. ESLint bans `new Date('literal')`, date-string concatenation and `.toISOString()`.
- **Never `setMonth(+n)` on a day-of-month that may not exist.** "31 de febrero" silently rolls into March and the series stays shifted from then on. Anchor the day and clamp it to the month's length — see `sumarMeses()` (`web/src/lib/recurrentes.ts`) and `_sumar_un_mes()` (main.py).
