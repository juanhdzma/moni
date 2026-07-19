# Moni

Personal finance tracker (Spanish UI, Colombian peso). Vanilla JS/HTML/CSS frontend served as static files by a FastAPI backend backed by SQLite. No build step, no frontend framework, no bundler.

## Running locally

```bash
python3 -m venv .venv && source .venv/bin/activate
pip install -r backend/requirements.txt
uvicorn backend.main:app --reload --port 8080
```

Open `http://localhost:8080` — FastAPI serves `index.html` and `js/`/`css/` directly, so there's no separate frontend dev server.

## Running via Docker

```bash
docker compose up --build
```

Serves on port 8080 (mapped to container port 80). SQLite file persists in the `moni-data` named volume at `/app/backend/data`.

## Deploying

`.github/workflows/build-push.yml` builds and pushes the image to `ghcr.io/<owner>/moni` (tags `latest` and the commit SHA) on every push to `main` that touches `index.html`, `Dockerfile`, `css/**`, `js/**`, or `backend/**`. In production, point `docker-compose.yml` at that image instead of `build: .`:

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

There are no automated tests, linter, or type checker configured. Verify changes by running the app and exercising the UI manually, or `curl` against `/api/*`.
