import pytest

from backend.core.ruta import ruta_normalizada


@pytest.mark.parametrize(
    "path,esperado",
    [
        ("/api/meta", "/api/meta"),
        ("//api/meta", "/api/meta"),
        ("/api//meta", "/api/meta"),
        ("/api/./meta", "/api/meta"),
        ("/api/auth/../meta", "/api/meta"),
        ("/api/auth/estado/../../meta", "/api/meta"),
        ("/../api/meta", "/api/meta"),
        ("/../../api", "/api"),
        ("/a/b/../../..", "/"),
        ("/API/Meta/", "/api/meta"),
        ("", "/"),
        ("/", "/"),
        ("/api/..", "/"),
        ("/api/...", "/api/..."),
        ("/api/.hidden", "/api/.hidden"),
    ],
)
def test_ruta_normalizada(path, esperado):
    assert ruta_normalizada(path) == esperado
