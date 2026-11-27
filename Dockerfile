FROM node:22.23.4-slim AS build

WORKDIR /app/web

COPY web/package.json web/package-lock.json ./
RUN npm ci

COPY web/ ./
RUN npm run build


FROM python:3.15.1-slim

WORKDIR /app

RUN useradd --create-home --uid 1000 moni

COPY backend/requirements.txt backend/constraints.txt backend/
RUN pip install --no-cache-dir -c backend/constraints.txt -r backend/requirements.txt

COPY --chown=moni:moni backend backend
COPY --chown=moni:moni --from=build /app/web/dist /app/web/dist

# El volumen de datos se monta acá; el usuario sin privilegios tiene que poder escribirlo.
RUN install -d -o moni -g moni /app/backend/data
USER moni

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:80/api/auth/estado').read()"

CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "80", "--no-proxy-headers"]
