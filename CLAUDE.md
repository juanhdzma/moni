# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Moni: a personal finance tracker (Spanish UI, Colombian peso). Vanilla JS/HTML/CSS frontend served as static files by a FastAPI backend backed by SQLite. No build step, no frontend framework, no bundler.

## Running locally

No installed venv/conda env in the repo — set one up ad hoc:

```bash
python3 -m venv .venv && source .venv/bin/activate   # or use conda per user global prefs
pip install -r backend/requirements.txt
uvicorn backend.main:app --reload --port 8080
```

Then open `http://localhost:8080` — FastAPI serves `public/` via `StaticFiles` mounted at `/` (`FRONTEND_DIR` in backend/main.py), so there is no separate frontend dev server. **The docroot is `public/`, not the repo root**: everything under it is downloadable by anyone who can reach the port, and everything outside it (backend code, the SQLite file, `.git`) is not. Don't move served assets out of `public/`, and don't put anything else in.

Via Docker:
```bash
docker compose up --build
```
Serves on port 8080 (mapped to container port 80). SQLite file persists in the `moni-data` named volume at `/app/backend/data`.

Backend tests: `pip install -r backend/requirements-dev.txt && python -m pytest backend/tests -q`. They cover card-balance adjustment, the composite actions, input validation and the backup round-trip; each test gets a throwaway SQLite file via the `client` fixture in `backend/tests/conftest.py`. CI runs them before building the image. **Add a test when you touch anything that moves money.**

Frontend tests: `node --test tests/frontend` (no deps, no install — Node's built-in runner). They cover the money/date math only (`nextPaymentDate`, `flujoCartera`, `flujoPatrimonio`, `toMensual`); `tests/frontend/harness.mjs` loads the plain `public/js/` scripts into a `node:vm` context and pins `TZ=America/Bogota`, so timezone bugs surface on any machine. There is no linter, no type checker and no DOM/rendering test — verify UI changes by exercising the app.

**Mutating requests (`POST`/`PUT`/`DELETE` on `/api/*`) require an `X-Moni-Request` header**, or the backend returns 403 (`require_csrf_header`, main.py). `apiFetch` adds it automatically; hand-written `curl` needs `-H 'X-Moni-Request: 1'`. This exists because the app has no auth: it blocks a cross-origin `<form>` POST to a destructive endpoint like `/api/truncate`.

## Deploying

`.github/workflows/build-push.yml` builds and pushes to `ghcr.io/<owner>/moni` (tags `latest` + commit SHA) on every push to `main`. Production `docker-compose.yml` (on the home server, via Portainer) points `image:` at that GHCR tag instead of `build: .`; local dev keeps `build: .`. Don't rename the image without updating both — the workflow used to publish as `fondo-familiar` (copy-pasted from the sibling `fondi` repo) before being corrected to `moni`.

## Architecture

**Backend (`backend/`)** — single-file FastAPI app (`main.py`) + `db.py` for the SQLite connection/schema.
- `db.py` defines the schema inline as a `CREATE TABLE IF NOT EXISTS` script, plus a `MIGRATIONS` list of `ALTER TABLE` statements applied on startup (each wrapped in a try/except to no-op if the column already exists). **There is no migration framework** — to change a table shape, add a column to `SCHEMA` *and* append the matching `ALTER TABLE` to `MIGRATIONS` so existing databases pick it up.
- Five tables: `transacciones`, `deudas` (debts, including credit cards via `es_tarjeta`), `inversiones`, `activos`, `recurrentes`. No SQLAlchemy/ORM — raw SQL via `sqlite3.Row`.
- `register_crud()` generates POST/PUT/DELETE routes for `deuda`, `inv`, `activo`, `rec` from a `TABLES` dict of (table name, column list). `transacciones` has its own hand-written CRUD instead, because a `gasto` charged to a card (`tarjeta_id` set) must also adjust that card's `deudas.saldo_actual` (see `_ajustar_saldo_tarjeta`) — every tx create/update/delete has to undo the old balance effect before applying the new one.
- There is **no FK on `transacciones.tarjeta_id`** (SQLite can't add one via `ALTER TABLE`, and rewriting the table on an existing prod db isn't worth it). The invariant is kept in code instead: deleting a `deudas` row nulls out the `tarjeta_id` of its transactions, and `_ajustar_saldo_tarjeta` no-ops on a missing card rather than raising. Both matter — raising there used to make orphaned transactions impossible to edit *or* delete, since `delete_tx` goes through the same function.
- Pydantic models carry the domain validation (`Literal` for enums, `Field(gt=0)` for amounts, a regex for dates). Keep it there rather than trusting the frontend — the API is reachable directly.
- "Composite actions" (main.py:319+) are POST endpoints beyond plain CRUD that touch two tables in one SQLite transaction — e.g. `/api/deuda/{id}/pago` (loan payment), `/api/inv/{id}/aporte` (investment contribution), `/api/activo/{id}/venta` (asset sale). Each optionally inserts a linked row into `transacciones` (`registrar_tx` flag on the request body) so the ledger stays consistent with debt/investment/asset state. When adding a new money-moving action, follow this pattern rather than mutating state from the frontend.
- Every route opens its own `sqlite3` connection via `db.get_conn()` and closes it in a `finally` — no connection pooling/dependency injection.

**Frontend (`public/`: `index.html`, `js/`, `css/`, `assets/`, `vendor/`)** — no modules, no bundler. Every file is loaded as a plain `<script>` tag in `index.html` in dependency order (config → state → services → features → ui-controls → app), and all functions/consts live in global scope. When adding a new file, add its `<script>` tag in the right position relative to what it depends on.
  - Chart.js + the treemap plugin live in `public/vendor/`, and JetBrains Mono in `public/assets/fonts/` (`public/css/fonts.css`). **Don't reintroduce CDN `<script>`/`<link>` tags** — this runs self-hosted on a LAN, and a missing `Chart` global used to take the whole UI down with it.
  - `public/js/config.js` — static config: `CATEGORIES` by tx type, franquicia icon paths, custom-category persistence (localStorage).
  - `public/js/state.js` — the single global state object `S` (`transacciones`, `deudas`, `inversiones`, `activos`, `recurrentes`), populated wholesale from `/api/all`.
  - `public/js/services/api.js` — `apiFetch` (fetch wrapper + error parsing), `fetchAll()` (repopulates `S` and calls `renderAll()`), `crudOp()`/`apiAction()` generic helpers every feature form submits through.
  - `public/js/services/format.js` — money/date/percent formatting helpers (`cop`, `copShort`, `pct`, `fmtDate`, `normDate`, money-input masking, `escHtml`, etc.) used throughout.
  - `public/js/features/*.js` — one file per domain tab (`dashboard`, `transacciones`, `deudas`, `inversiones`, `activos`, `recurrentes`). Each owns its own render function(s) and modal form builder(s) that generate HTML via template literals and open through `openModal()`.
  - `public/js/ui-controls.js` — generic form-control enhancements (custom selects/inputs) applied to modal content via `enhanceFormControls()`.
  - `public/js/app.js` — glue: modal open/close, tab navigation, the FAB button (mobile primary action, mapped per-tab via `FAB_ACTIONS`), `renderAll()` (calls every feature's render fn), stale-price nav warnings, `DOMContentLoaded` bootstrap.
- **State flow is unidirectional and coarse**: any mutation (`crudOp`/`apiAction`) POSTs/PUTs/DELETEs to the backend, then calls `fetchAll()` to refetch *all* data and re-render everything (`renderAll()`). There is no optimistic update or partial re-render — don't try to patch `S` locally and expect it to stick.
- `crudOp` propagates errors so modal forms can show them inline via `setModalStatus`. For mutations fired **outside** a modal (deleting from a card, pausing a recurrente) use `crudOpOrBanner` — a bare `crudOp` there leaves a rejected promise nobody handles and the user sees nothing.
- `renderAll()` runs each tab's renderer inside its own try/catch (`RENDERERS` in app.js) so one broken tab degrades instead of blanking the page. Keep new renderers on that list rather than calling them directly.
- **Money definitions live in one place**, all in dashboard.js, and there are *two* of them — don't collapse them:
  - `flujoCartera()` — what moves available cash. A card `gasto` doesn't (it moves the card's balance), a `transfer` does. Drives the "Cartera" KPI and the savings rate.
  - `flujoPatrimonio()` — what moves net worth. A card `gasto` *does* (it raises the debt); anything in `CATEGORIAS_NEUTRAS_PATRIMONIO` doesn't, because it only shifts money between cartera and a debt/investment/asset. Drives the evolution chart and the 12-month projection.
  - `netWorth()` is the endpoint the evolution chart walks backwards from, subtracting `monthlyPatrimonio()`. Using the cartera flow there painted every debt payment as if you'd been richer the month before. Revaluations of assets and variable investments leave no transaction, so the historical curve can't see them — only the final point has them.
  - Anything scoped to a month must stay scoped: mixing an all-time total with a current-month one (the savings rate used to) yields three-digit percentages.
- **A yield counts on one side only, never both** (`/api/inv/{id}/rendimiento`, `capitaliza` flag): if it capitalizes it raises `inversiones.valor_actual` and writes no transaction; if it's paid out it writes an `Intereses` income and leaves the investment's value alone. Doing both — which it used to — inflated net worth by the same peso twice, since `netWorth()` sums the ledger *and* `valor_actual`. Same rule for any new payout-shaped action.
- Interest paid on a debt: prefer the exact `deudas.total_intereses` accumulated by the backend; `estimarInteresesPagados()` is only the fallback for debts with no payments recorded in Moni, and its output is prefixed with `~` (see `interesesPagados`/`fmtIntereses` in deudas.js).
- HTML is built with raw template literals + `escHtml()` for user content — no templating engine, no virtual DOM.
- `dashboard.js`'s "Próximas operaciones" widget has no backend-tracked "already handled" state — it recomputes upcoming deuda cuotas / inversion yields / recurrente charges from current `S` on every render, filtered against a `moni_skipped_ops` localStorage set keyed by `${type}:${sourceId}:${dateISO}`. Clicking ✓ (`materializeProximaOperacion`) opens the matching form but only stakes a *pending* key — `resolvePendingProxOp()` is what actually marks it skipped, and it only runs after `crudOp`/`apiAction` succeeds. `closeModal()` clears the pending key on cancel/escape/backdrop-click. Don't skip eagerly on click again — that regressed to canceling the popup silently dropping the operation from the list without registering anything.

## Conventions specific to this repo

- Domain vocabulary is Spanish throughout backend and frontend (`deuda`=debt, `inversion`=investment, `activo`=asset, `recurrente`=recurring item, `tarjeta`=card, `monto`=amount, `saldo`=balance, `cuota`=installment). Keep new identifiers consistent with this rather than mixing in English domain terms — this deviates from the user's general "code in English" preference, but matches the rest of this codebase.
- Money is stored/passed as plain numbers (COP, no cents); formatting/parsing to `es-CO` locale strings happens only at the UI edges (`format.js`). The columns are SQLite `REAL`, so every computed balance goes through `pesos()` in main.py before being written — the pro-rata in a partial withdrawal produces fractions every time, and a balance "at zero" left at 1.16e-10 keeps a paid-off debt counting as active forever. On the frontend, "is there anything left to pay" is `tieneSaldo()` (config.js), not `> 0`: rows written before the rounding still carry the residue.
- Dates are normalized to `YYYY-MM-DD` (or `YYYY-MM-DDTHH:MM`) via `normDate()` before use; don't assume raw `fecha` fields are already in that shape.
