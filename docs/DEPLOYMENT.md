# Deployment

Moni runs as one container: FastAPI serves the API and the built frontend on port 80 inside the container. State lives in one named volume.

## Image and compose

`.github/workflows/build-push.yml` runs lint, typecheck, frontend tests and build, `npm audit` and `pip-audit`, checks that `web/src/types/api.gen.ts` is up to date, and runs pytest (installing with `backend/constraints.txt`, the same pins as the image), on every push and pull request. It then builds and pushes `ghcr.io/<owner>/moni` (tags `latest` and the commit SHA) only on pushes to `main`.

In production, point the compose file at that image instead of `build: .`:

```yaml
services:
  moni-page:
    image: ghcr.io/juanhdzma/moni:latest
    ports:
      - "8080:80"
    restart: unless-stopped
    # add the environment block from docker-compose.yml; the variables are listed under Configuration
    volumes:
      - moni-data:/app/backend/data

volumes:
  moni-data:
```

The image runs as an unprivileged user (uid 1000) and has a healthcheck on `GET /api/auth/estado`. Inside the container it listens on port 80, which an unprivileged user can only bind when the kernel has `net.ipv4.ip_unprivileged_port_start=0` (the default in Docker 20.10 and later). On runtimes that do not set it, such as rootless Podman, set that sysctl on the container (`sysctls: [net.ipv4.ip_unprivileged_port_start=0]`) or the server will not start. Uvicorn runs with `--no-proxy-headers`: the client IP and scheme come only from `MONI_TRUSTED_PROXIES`. Run a single instance: the daily push job assumes one process and would send duplicates otherwise.

## Configuration

| Variable | Default | Purpose |
|---|---|---|
| `MONI_PASSWORD_HASH` | empty | Owner password hash. Generate with `python -m backend.seguridad hash` and wrap it in single quotes (it contains `$`, which Compose would interpolate). Empty means every `/api/*` route answers 401. |
| `MONI_RP_ID` | `moni.nufi.com.co` | WebAuthn relying party id: the domain users see, without scheme or port. Use `localhost` locally. |
| `MONI_ORIGIN` | `https://moni.nufi.com.co` | WebAuthn origin. Must match the URL in the browser exactly. |
| `MONI_TRUSTED_PROXIES` | `127.0.0.0/8,::1/128` | CIDRs allowed to set `X-Forwarded-For` and `X-Forwarded-Proto`. Set the exact reverse proxy address (for example `172.18.0.5/32`), never a whole private range: any LAN host could then fake its IP and dodge the lockout. |
| `MONI_BLOCK_HOURS` | `24` | Hours an IP stays blocked after 3 failed attempts within an hour. |
| `MONI_PUSH_TOKEN` | empty | Bearer token (32+ characters) for `POST /api/push/enviar` from scripts without a session. Generate with `python -c "import secrets; print(secrets.token_urlsafe(32))"`. |
| `VAPID_SUBJECT` | `https://moni.nufi.com.co` | Contact (`https:` or `mailto:`) sent to push services in the VAPID claim. Set your own domain. |

If the reverse proxy is not listed in `MONI_TRUSTED_PROXIES`, every client shares the proxy's IP (three failures block everyone), the session cookie is not marked `Secure` and HSTS is not sent. If the proxy is the only entry point, publish the port as `127.0.0.1:8080:80`.

Blocked IPs are managed from inside the container:

```bash
docker exec -it <container> python -m backend.seguridad blocked
docker exec -it <container> python -m backend.seguridad unblock <ip>
```

## HTTPS and push notifications

Service workers and the Notification API need a secure origin, so put an HTTPS reverse proxy in front for push (and for passkeys, which also need the origin to match `MONI_ORIGIN`). On iOS, push only works from the PWA added to the home screen, on iOS 16.4 or later.

VAPID keys are generated on first start and saved as `vapid_private.pem` in the data volume. Keep the volume: if the key is lost, every device has to subscribe again. Subscriptions are only accepted for the browsers' push services and are deleted when the service reports them expired.

## Backup and restore

All state is in the `moni-data` volume (mounted at `/app/backend/data`): `moni.db` with its `-wal` and `-shm` files, and `vapid_private.pem`. Compose may prefix the volume name with the project or stack name (check with `docker volume ls | grep moni-data`).

Back up the volume to a tarball in the current directory. Stop the container first so the SQLite file is not written during the copy:

```bash
docker compose stop moni-page
docker run --rm -v moni-data:/data -v "$PWD":/backup alpine \
  tar czf /backup/moni-data-$(date +%F).tgz -C /data .
docker compose start moni-page
```

Restore into an empty or existing volume (this overwrites the files in it):

```bash
docker compose stop moni-page
docker run --rm -v moni-data:/data -v "$PWD":/backup alpine \
  sh -c "rm -rf /data/* && tar xzf /backup/moni-data-YYYY-MM-DD.tgz -C /data && chown -R 1000:1000 /data"
docker compose start moni-page
```

The `chown` matters: the app runs as uid 1000 and cannot write files owned by root.

There is also a logical backup that needs no shell access. In Ajustes, Backup, "Exportar JSON" downloads the five collections, custom categories, hidden operations and the currency setting (`GET /api/backup`, the same rows `POST /api/import` accepts). It does not include sessions, passkeys, push subscriptions or the VAPID key. Importing adds the file's rows to the existing data (it does not replace them, and colliding ids fail) and asks for the password again; to restore into a clean install, start from an empty database or wipe it first from Ajustes, "Zona de peligro".

## Upgrades and migrations

Pull the new image and recreate the container; there is no separate migration step. On startup the app creates missing tables and applies the `ALTER TABLE` statements in `MIGRATIONS` (`backend/core/db.py`) that the database has not seen yet. `PRAGMA user_version` stores how many have been applied, so each runs once; check it with:

```bash
docker exec <container> python -c "import sqlite3; print(sqlite3.connect('/app/backend/data/moni.db').execute('PRAGMA user_version').fetchone()[0])"
```

Migrations only move forward. Take a volume backup before upgrading across a release that adds one, because an older image does not know the new columns.
