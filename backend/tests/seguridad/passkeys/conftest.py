import pytest

from backend.tests.seguridad.passkeys.helpers import ORIGIN, RP_ID


@pytest.fixture(autouse=True)
def webauthn_env(monkeypatch):
    monkeypatch.setenv("MONI_RP_ID", RP_ID)
    monkeypatch.setenv("MONI_ORIGIN", ORIGIN)
