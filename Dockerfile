FROM python:3.12-slim

WORKDIR /app

COPY backend/requirements.txt backend/requirements.txt
RUN pip install --no-cache-dir -r backend/requirements.txt

COPY . .

# El volumen de datos se monta acá; el usuario sin privilegios tiene que poder escribirlo.
RUN useradd --create-home --uid 1000 moni \
    && mkdir -p /app/backend/data \
    && chown -R moni:moni /app
USER moni

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:80/api/all').read()"

CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "80"]
