from fastapi.responses import JSONResponse

from .ruta import ruta_de

CSRF_HEADER = "x-moni-request"
SAFE_METHODS = {"GET", "HEAD", "OPTIONS"}


async def require_csrf_header(request, call_next):
    if (
        request.method not in SAFE_METHODS
        and ruta_de(request).startswith("/api/")
        and CSRF_HEADER not in request.headers
    ):
        return JSONResponse({"detail": f"Falta el header {CSRF_HEADER}"}, status_code=403)
    return await call_next(request)
