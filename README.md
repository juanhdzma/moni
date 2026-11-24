# Moni

Personal finance tracker for a single household: spending, credit cards, loans, investments, other assets, and recurring income/expenses — one dashboard instead of five spreadsheets. Spanish UI, Colombian peso (COP).

![License: AGPL-3.0](https://img.shields.io/badge/license-AGPL--3.0-blue) ![Python](https://img.shields.io/badge/backend-FastAPI%20%2B%20SQLite-009688) ![Frontend](https://img.shields.io/badge/frontend-React%20%2B%20TypeScript-3178c6)

![Dashboard](docs/img/dashboard.png)

> ## Single-owner login
> Every `/api/*` route requires a session; with no `MONI_PASSWORD_HASH` set nothing can sign in and the API answers 401 (fail closed). There is no user registration. Passkey sign-in is an optional WebAuthn credential registered from Ajustes after signing in with the password. Three failures from one IP within an hour block that IP for `MONI_BLOCK_HOURS` (default 24); a blocked client gets a `403` with a ready-to-show Spanish `texto` and a `Retry-After` header.

## Contents

- [Features](#features)
- [How it fits together](#how-it-fits-together)
- [Running locally](#running-locally)
- [Running via Docker](#running-via-docker)
- [Security configuration](#security-configuration)
- [Notifications](#notifications)
- [Deploying](#deploying)
- [Testing](#testing)
- [License](#license)

## Features

Six data tabs plus Ajustes (custom categories, currency symbol, push notifications, backup import/export), all reading from and writing to the same dataset — a debt payment, an investment contribution, or an asset sale can each optionally drop a linked entry into the transaction ledger, so the numbers stay consistent everywhere.

**Dashboard** — compact cards that each open with one plain sentence: net worth with a composition bar (activos, inversiones, cartera, deudas), how it moved over time (area chart), where the money goes by category for a chosen period (tap one to see its movements), this month's cash as a sum (in − out = left) with six months of bars, recent transactions, and a "próximas operaciones" list that projects upcoming debt installments, investment yields, and recurring charges so you can confirm or skip them before they happen.

**Transacciones** — the income/expense ledger, filterable by month, type, and category, grouped by date (ayer / este mes / …), tracking payment method (cash/debit vs. a specific card).

![Transacciones](docs/img/transacciones.png)

**Deudas** — two columns, créditos and tarjetas (`es_tarjeta`), each with pending balance, monthly installment, interest paid, per-debt cuota payments, card advances (adelanto), and payoff (liquidar); settled loans drop into a "terminados" section below. Registering the monthly cuota rolls the due date forward a month and clears it once the debt is settled; an extraordinary abono pays down the balance without moving the date.

![Deudas](docs/img/deudas.png)

**Inversiones** — fixed-rate (CDT-style, with EA/MV rate conversion and yield tracking) and variable investments (funds, crypto), each with capital invested, current value, gain/loss, and contribution/withdrawal actions. A yield is recorded as either capitalizing (raises the investment's value, no ledger entry) or paid out (income in the ledger, investment value unchanged) — never both, since counting it twice would inflate net worth.

![Inversiones](docs/img/inversiones.png)

**Activos** — physical/other assets (real estate, vehicles, …) with purchase cost vs. current value, value updates, and sale tracking.

![Activos](docs/img/activos.png)

**Recurrentes** — recurring incomes and fixed expenses (subscriptions, salary, …), with monthly income/expense/net totals and pause/resume.

![Recurrentes](docs/img/recurrentes.png)

Screenshots use dummy data inserted directly via the API for illustration, not real figures.

### Mobile

Below 1024px the header nav collapses into a menu button and a slide-out drawer.

<table>
<tr>
<td><img src="docs/img/mobile-dashboard.png" width="260" alt="Dashboard, mobile"></td>
<td><img src="docs/img/mobile-menu.png" width="260" alt="Nav drawer, mobile"></td>
</tr>
</table>

## How it fits together

FastAPI (`backend/main.py`) serves a small REST API over SQLite (`backend/core/db.py`) and, at the same time, serves the built frontend (`web/dist`) as static files: one process, one port in production.

All business logic lives in the backend: the money definitions (cash flow vs. net worth), date handling in the `America/Bogota` time zone, derived fields and the upcoming-operations projection are pure functions in `backend/calculos/`, exposed through read endpoints that return data ready to render (`/api/bootstrap`, `/api/meta`, `/api/dashboard/*`, `/api/tx`, `/api/*/resumen`, `/api/proximas-operaciones`, and `GET /api/<resource>/<id>` for edit forms). `/api/meta` serves every option list the forms use (frequencies, card networks, investment and debt types, currencies, sortable columns, periods), so the frontend hard-codes none. Validation errors are returned as `422` with Spanish messages. `GET /api/backup` exports the raw rows (the format `POST /api/import` takes back). Domain errors raised from the calculation layer (`ErrorDeDominio`) are answered by one global handler with their status and a Spanish message. Custom categories, hidden operations and the currency symbol are stored in SQLite too, not in the browser.

The frontend (`web/`) is React + TypeScript built with Vite, and only fetches and paints. Every tab is one folder under `web/src/features/` that owns its own component and modal forms; the shared session context (today, categories, currency symbol, alerts) comes from `GET /api/bootstrap` through a `DataProvider`, static form options from `GET /api/meta`, and each view refetches its own calculated endpoint when its filters change or when a mutation touches an entity it depends on. Each feature keeps its modal forms in a `forms/` folder. There's no optimistic UI and no partial state patching by design; the tradeoff is simplicity over snappiness, which is fine at personal-finance data volumes.

Styling is Tailwind CSS + shadcn/ui with Recharts charts; Recharts and the Archivo webfont are bundled from npm, so the app works on a LAN with no internet access. Only `web/dist` is reachable over HTTP; the backend code, the SQLite file and the frontend sources are not.

See `CLAUDE.md` for the full architecture rundown (schema/migrations, composite money-moving actions, per-tab conventions).

## Running locally

Needs Python 3.12 and Node 22. No installed venv/conda env in the repo, set one up ad hoc:

```bash
python3 -m venv .venv && source .venv/bin/activate
pip install -r backend/requirements.txt
uvicorn backend.main:app --reload --port 8080
```

Then, in another terminal, the frontend dev server (proxies `/api` to the backend on 8080):

```bash
cd web
npm ci
npm run dev
```

Open `http://localhost:5173`. To check what production serves, run `npm run build` in `web/` and open `http://localhost:8080`: FastAPI serves `web/dist`. Without a build the API still works, but `/` answers 404.

## Running via Docker

```bash
docker compose up --build
```

Serves on port 8080 (mapped to container port 80). The image is built in two stages: Node builds `web/`, and the final Python image carries only `backend/` and `web/dist`. SQLite file persists in the `moni-data` named volume at `/app/backend/data`.

## Security configuration

| Variable | Purpose |
| --- | --- |
| `MONI_PASSWORD_HASH` | Owner password hash. Generate with `python -m backend.seguridad hash` and quote it (it contains `$`). |
| `MONI_RP_ID`, `MONI_ORIGIN` | WebAuthn relying party (default `moni.nufi.com.co`, `https://moni.nufi.com.co`). |
| `MONI_TRUSTED_PROXIES` | CIDRs allowed to set `X-Forwarded-For`/`X-Forwarded-Proto`. Default is loopback only; set the exact reverse proxy address. |
| `MONI_BLOCK_HOURS` | Block duration after 3 failures in 1 hour (default 24). |
| `MONI_PUSH_TOKEN` | Optional bearer token (32+ chars) for `POST /api/push/enviar` without a session. |

Manage blocked IPs with `python -m backend.seguridad blocked` and `python -m backend.seguridad unblock <ip>`. Port 8080 is published on all interfaces by default; if a reverse proxy is the only entry point, publish `127.0.0.1:8080:80` instead.

## Notifications

Moni can send a push notification at 8:00 (America/Bogota) with the operations due today and tomorrow (debt installments, investment yields, recurring charges), minus the ones you already skipped or confirmed in the dashboard. The job runs inside the backend process, so run a single instance.

To enable them, open Ajustes, go to Notificaciones, tap activate and accept the browser permission. "Probar" sends a test notification. Each browser or device subscribes on its own.

- **HTTPS is required.** Service workers and the Notification API only work on a secure origin (or `localhost`), so serve the app behind an HTTPS reverse proxy, for example `https://moni.nufi.com.co`. Over plain HTTP on the LAN the panel can't subscribe.
- **iOS:** push only works from the installed PWA (Safari, Share, Add to Home Screen) and on iOS 16.4 or later; open Moni from the home screen icon and enable notifications from there.
- **`VAPID_SUBJECT`:** optional env var with the contact (`https://...` or `mailto:...`) sent to the push service in the VAPID claim. Defaults to `https://moni.nufi.com.co`; set your own domain.
- **VAPID keys** are generated on first start and saved as `vapid_private.pem` in the data volume (`/app/backend/data`). Keep the volume: if the key is lost, every device has to subscribe again.
- Subscriptions are only accepted for the browsers' push services (FCM, Apple, Mozilla, Windows) and are deleted automatically when the service reports them expired.

```yaml
    environment:
      VAPID_SUBJECT: "https://moni.example.com"
```

## Deploying

`.github/workflows/build-push.yml` runs lint, typecheck, tests and the frontend build, then the backend tests, and, if all pass, builds and pushes the image to `ghcr.io/<owner>/moni` (tags `latest` and the commit SHA) on every push to `main`. In production, point `docker-compose.yml` at that image instead of `build: .`:

```yaml
services:
  moni-page:
    image: ghcr.io/juanhdzma/moni:latest
    ports:
      - "8080:80"
    restart: unless-stopped
    volumes:
      - moni-data:/app/backend/data

volumes:
  moni-data:
```

## Testing

The backend has a pytest suite covering the money-moving paths (card balance adjustments, the composite actions: payment, contribution, withdrawal, sale), the `calculos` modules and the calculated endpoints, push, input validation, the export/import round-trip and the static docroot. `test_parity.py` checks the Python money and date math against fixtures captured from the original TypeScript implementation. `seguridad/test_csrf.py` derives the list of mutating routes from the OpenAPI schema, so every new `POST`/`PUT`/`DELETE` is checked for the `X-Moni-Request` header automatically. `test_static.py` reads `web/dist`, so build the frontend first.

```bash
cd web && npm ci && npm run build && cd ..
pip install -r backend/requirements-dev.txt
python -m pytest backend/tests -q
```

The frontend runs on Vitest + Testing Library. It covers formatting helpers, the shared components and controls, the data and view providers and each tab's key flows, asserting the exact request sent to a mocked `fetch`; the calculations themselves are tested in the backend. The test script pins the timezone to `America/Bogota`, so date bugs don't depend on where you run it.

```bash
cd web
npm run lint
npm run typecheck
npm test
```

CI runs all of the above before building the image. Each backend test gets a throwaway SQLite file, so runs never touch your real data. jsdom has no layout, so verify visual changes by exercising the app.

### Calling the API by hand

Mutating requests need an `X-Moni-Request` header. Without it the backend answers `403`; this is what stops a cross-origin `<form>` from hitting a destructive endpoint (see `require_csrf_header` in `backend/core/csrf.py`). Reads need nothing.

```bash
curl localhost:8080/api/bootstrap
curl 'localhost:8080/api/dashboard/gastos?periodo=3M'
curl -X POST localhost:8080/api/tx -H 'X-Moni-Request: 1' -H 'Content-Type: application/json' \
  -d '{"fecha":"2026-07-31","tipo":"gasto","categoria":"Mercado","monto":50000}'
```

## License

[AGPL-3.0](LICENSE)
