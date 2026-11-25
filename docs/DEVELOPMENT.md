# Development

## Prerequisites

Python 3.12, Node 22 (`web/.nvmrc`) and, for the container, Docker. There is no venv in the repo; create one:

```bash
python3 -m venv .venv && source .venv/bin/activate
pip install -r backend/requirements-dev.txt
```

## Running locally

Backend and frontend in two terminals:

```bash
uvicorn backend.main:app --reload --port 8080
cd web && npm ci && npm run dev      # http://localhost:5173, proxies /api to 8080
```

To sign in you need `MONI_PASSWORD_HASH`. Generate it with `python -m backend.seguridad hash` and export it before starting the backend. For passkeys on localhost set `MONI_RP_ID=localhost` and `MONI_ORIGIN=http://localhost:5173` (or `:8080`).

To see what production serves, run `npm run build` in `web/` and open `http://localhost:8080`; FastAPI serves `web/dist`. Without a build the API works and `/` answers 404. The docroot is `web/dist` only: do not point `FRONTEND_DIR` elsewhere or put anything else in it.

With Docker: `docker compose up --build` serves on port 8080.

## Fictional data

`backend.scripts.seed_demo` creates a throwaway SQLite file, fills it with fictional data and serves the app on it, without touching `backend/data/moni.db`. It is how the screenshots in `docs/img/` are made.

```bash
python -m backend.scripts.seed_demo --db /tmp/moni_demo.db --port 8765 --password demo-password-123
```

## Tests

Backend:

```bash
cd web && npm ci && npm run build && cd ..   # test_static.py reads web/dist and fails without it
python -m pytest backend/tests -q
```

Tests mirror the code: `backend/tests/{api,push,seguridad}/` and `backend/tests/calculos/{base,catalogo,dinero,operaciones}/`. Each test gets a throwaway SQLite file through the `client` fixture in `backend/tests/conftest.py`, with a logged-in `client` and an `anon_client`. Row builders are `api/builders_api.py` and `calculos/builders_calculos.py`.

- `seguridad/test_csrf.py` walks `app.openapi()` and checks every `POST`/`PUT`/`DELETE` under `/api` answers 403 without `X-Moni-Request`, so a new mutating route is covered without writing a test.
- `seguridad/test_respuestas_modeladas.py` checks every route declares a response model.
- `calculos/test_parity.py` checks the Python money and date math against `fixtures/parity.json`, captured from the original TypeScript implementation. Do not regenerate it to make a failure pass.
- `test_imports.py` imports `backend.main` in a cold subprocess to catch circular imports.

Add a test when you touch anything that moves money.

Frontend, in `web/`:

```bash
npm run lint
npm run typecheck
npm test            # Vitest + Testing Library + jsdom, TZ pinned to America/Bogota
npm run build
```

Feature tests assert the exact request (method, URL, JSON body, `X-Moni-Request` header) sent to a mocked `fetch` (`web/src/test/mockFetch.ts`). There is no money or date math to test in the frontend. jsdom has no layout, so check visual changes by running the app.

CI (`.github/workflows/build-push.yml`) runs all of the above plus the types check below, then pytest, before building the image.

## API types

The frontend types come from the backend schema. After changing a request or response model:

```bash
cd web
PYTHON="$PWD/../.venv/bin/python" npm run gen:types
```

`gen:types` runs `python -m backend.openapi` and feeds it to `openapi-typescript`, writing `web/src/types/api.gen.ts`. `PYTHON` must point at the venv that has the backend dependencies; it defaults to `python3`. Commit the generated file: CI fails if it is stale.

## Calling the API by hand

Mutating requests need an `X-Moni-Request` header and, like every `/api/*` route, a session cookie. Log in first and keep the cookie:

```bash
curl -c jar -X POST localhost:8080/api/auth/login -H 'X-Moni-Request: 1' -H 'Content-Type: application/json' -d '{"clave":"..."}'
curl -b jar 'localhost:8080/api/dashboard/gastos?periodo=3M'
```

## Conventions

- Business logic goes in the backend; the frontend fetches and paints. If a number or phrase is missing, add it to an endpoint instead of computing it in React.
- Domain vocabulary is Spanish (`deuda`, `inversion`, `activo`, `recurrente`, `monto`, `saldo`, `cuota`) in backend and frontend.
- Changing a table: add the column to `SCHEMA` and append the matching `ALTER TABLE` to `MIGRATIONS` in `backend/core/db.py`.
- Money goes through `pesos()` before it is written; dates are `YYYY-MM-DD`, "today" comes from `hoy_bogota()` and never from the browser, and no `setMonth` on a day that may not exist (use `sumar_meses`).
- A new money-moving action is a composite endpoint that touches both tables in one transaction and starts with `iniciar_escritura(conn)`.
- Anything clickable must be reachable by keyboard, and pinch-zoom must stay enabled.
- No CDN: fonts and charts are bundled, the app runs on a LAN.
- `CLAUDE.md` holds the detailed rules for agents; [ARCHITECTURE.md](ARCHITECTURE.md) explains how the pieces fit.
