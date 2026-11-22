import datetime

import pytest

from backend.seguridad import tiempo


class Reloj:
    def __init__(self):
        self.t = datetime.datetime(2026, 1, 1, 12, 0, 0, tzinfo=datetime.timezone.utc)

    def __call__(self):
        return self.t

    def avanzar(self, **kw):
        self.t += datetime.timedelta(**kw)


@pytest.fixture
def reloj(monkeypatch):
    r = Reloj()
    monkeypatch.setattr(tiempo, "ahora", r)
    return r
