


def test_bearer_push_invalido_cuenta_fallo(anon_client, monkeypatch):
    monkeypatch.setenv("MONI_PUSH_TOKEN", "t" * 40)
    for _ in range(3):
        r = anon_client.post("/api/push/enviar", json={"title": "a", "body": ""}, headers={"Authorization": "Bearer mal"})
        assert r.status_code == 401
    assert anon_client.post("/api/push/enviar", json={"title": "a", "body": ""}).status_code == 403


def test_bearer_push_sin_token_configurado_falla_cerrado(anon_client, monkeypatch):
    monkeypatch.delenv("MONI_PUSH_TOKEN", raising=False)
    r = anon_client.post("/api/push/enviar", json={"title": "a", "body": ""}, headers={"Authorization": "Bearer " + "t" * 40})
    assert r.status_code == 401


def test_bearer_push_corto_se_rechaza(anon_client, monkeypatch):
    monkeypatch.setenv("MONI_PUSH_TOKEN", "corto")
    r = anon_client.post("/api/push/enviar", json={"title": "a", "body": ""}, headers={"Authorization": "Bearer corto"})
    assert r.status_code == 401


def test_bearer_no_abre_otras_rutas(anon_client, monkeypatch):
    token = "t" * 40
    monkeypatch.setenv("MONI_PUSH_TOKEN", token)
    h = {"Authorization": f"Bearer {token}"}
    for p in ("/api/all", "/api/push/test", "/api/truncate"):
        assert anon_client.request("POST" if p != "/api/all" else "GET", p, headers=h).status_code == 401


def test_bearer_valido_llega_a_la_ruta(anon_client, monkeypatch):
    token = "t" * 40
    monkeypatch.setenv("MONI_PUSH_TOKEN", token)
    r = anon_client.post("/api/push/enviar", json={"title": "a", "body": ""}, headers={"Authorization": f"Bearer {token}"})
    assert r.status_code != 401 and r.status_code != 403
