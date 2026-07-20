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

Then open `http://localhost:8080` — FastAPI serves `index.html` and `js/`/`css/` directly via `StaticFiles` mounted at `/` (backend/main.py:536), so there is no separate frontend dev server.

Via Docker:
```bash
docker compose up --build
```
Serves on port 8080 (mapped to container port 80). SQLite file persists in the `moni-data` named volume at `/app/backend/data`.

There are **no tests, linter, or type checker configured** in this repo. Verify changes by running the app and exercising the UI manually (or `curl` against `/api/*`).

## Deploying

`.github/workflows/build-push.yml` builds and pushes to `ghcr.io/<owner>/moni` (tags `latest` + commit SHA) on every push to `main` touching `index.html`, `Dockerfile`, `css/**`, `js/**`, or `backend/**`. Production `docker-compose.yml` (on the home server, via Portainer) points `image:` at that GHCR tag instead of `build: .`; local dev keeps `build: .`. Don't rename the image without updating both — the workflow used to publish as `fondo-familiar` (copy-pasted from the sibling `fondi` repo) before being corrected to `moni`.

## Architecture

**Backend (`backend/`)** — single-file FastAPI app (`main.py`) + `db.py` for the SQLite connection/schema.
- `db.py` defines the schema inline as a `CREATE TABLE IF NOT EXISTS` script, plus a `MIGRATIONS` list of `ALTER TABLE` statements applied on startup (each wrapped in a try/except to no-op if the column already exists). **There is no migration framework** — to change a table shape, add a column to `SCHEMA` *and* append the matching `ALTER TABLE` to `MIGRATIONS` so existing databases pick it up.
- Five tables: `transacciones`, `deudas` (debts, including credit cards via `es_tarjeta`), `inversiones`, `activos`, `recurrentes`. No SQLAlchemy/ORM — raw SQL via `sqlite3.Row`.
- `register_crud()` (main.py:196) generates POST/PUT/DELETE routes for `deuda`, `inv`, `activo`, `rec` from a `TABLES` dict of (table name, column list). `transacciones` has its own hand-written CRUD instead, because a `gasto` charged to a card (`tarjeta_id` set) must also adjust that card's `deudas.saldo_actual` (see `_ajustar_saldo_tarjeta`, main.py:261) — every tx create/update/delete has to undo the old balance effect before applying the new one.
- "Composite actions" (main.py:319+) are POST endpoints beyond plain CRUD that touch two tables in one SQLite transaction — e.g. `/api/deuda/{id}/pago` (loan payment), `/api/inv/{id}/aporte` (investment contribution), `/api/activo/{id}/venta` (asset sale). Each optionally inserts a linked row into `transacciones` (`registrar_tx` flag on the request body) so the ledger stays consistent with debt/investment/asset state. When adding a new money-moving action, follow this pattern rather than mutating state from the frontend.
- Every route opens its own `sqlite3` connection via `db.get_conn()` and closes it in a `finally` — no connection pooling/dependency injection.

**Frontend (`js/`, `css/`, `index.html`)** — no modules, no bundler. Every file is loaded as a plain `<script>` tag in `index.html` in dependency order (config → state → services → features → ui-controls → app), and all functions/consts live in global scope. When adding a new file, add its `<script>` tag in the right position relative to what it depends on.
  - `js/config.js` — static config: `CATEGORIES` by tx type, franquicia icon paths, custom-category persistence (localStorage).
  - `js/state.js` — the single global state object `S` (`transacciones`, `deudas`, `inversiones`, `activos`, `recurrentes`), populated wholesale from `/api/all`.
  - `js/services/api.js` — `apiFetch` (fetch wrapper + error parsing), `fetchAll()` (repopulates `S` and calls `renderAll()`), `crudOp()`/`apiAction()` generic helpers every feature form submits through.
  - `js/services/format.js` — money/date/percent formatting helpers (`cop`, `copShort`, `pct`, `fmtDate`, `normDate`, money-input masking, `escHtml`, etc.) used throughout.
  - `js/features/*.js` — one file per domain tab (`dashboard`, `transacciones`, `deudas`, `inversiones`, `activos`, `recurrentes`). Each owns its own render function(s) and modal form builder(s) that generate HTML via template literals and open through `openModal()`.
  - `js/ui-controls.js` — generic form-control enhancements (custom selects/inputs) applied to modal content via `enhanceFormControls()`.
  - `js/app.js` — glue: modal open/close, tab navigation, the FAB button (mobile primary action, mapped per-tab via `FAB_ACTIONS`), `renderAll()` (calls every feature's render fn), stale-price nav warnings, `DOMContentLoaded` bootstrap.
- **State flow is unidirectional and coarse**: any mutation (`crudOp`/`apiAction`) POSTs/PUTs/DELETEs to the backend, then calls `fetchAll()` to refetch *all* data and re-render everything (`renderAll()`). There is no optimistic update or partial re-render — don't try to patch `S` locally and expect it to stick.
- HTML is built with raw template literals + `escHtml()` for user content — no templating engine, no virtual DOM.
- `dashboard.js`'s "Próximas operaciones" widget has no backend-tracked "already handled" state — it recomputes upcoming deuda cuotas / inversion yields / recurrente charges from current `S` on every render, filtered against a `moni_skipped_ops` localStorage set keyed by `${type}:${sourceId}:${dateISO}`. Clicking ✓ (`materializeProximaOperacion`) opens the matching form but only stakes a *pending* key — `resolvePendingProxOp()` is what actually marks it skipped, and it only runs after `crudOp`/`apiAction` succeeds. `closeModal()` clears the pending key on cancel/escape/backdrop-click. Don't skip eagerly on click again — that regressed to canceling the popup silently dropping the operation from the list without registering anything.

## Conventions specific to this repo

- Domain vocabulary is Spanish throughout backend and frontend (`deuda`=debt, `inversion`=investment, `activo`=asset, `recurrente`=recurring item, `tarjeta`=card, `monto`=amount, `saldo`=balance, `cuota`=installment). Keep new identifiers consistent with this rather than mixing in English domain terms — this deviates from the user's general "code in English" preference, but matches the rest of this codebase.
- Money is stored/passed as plain numbers (COP, no cents); formatting/parsing to `es-CO` locale strings happens only at the UI edges (`format.js`).
- Dates are normalized to `YYYY-MM-DD` (or `YYYY-MM-DDTHH:MM`) via `normDate()` before use; don't assume raw `fecha` fields are already in that shape.
