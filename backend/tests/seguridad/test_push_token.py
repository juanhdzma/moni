def test_bearer_push_corto_se_rechaza(anon_client, monkeypatch):
    monkeypatch.setenv("MONI_PUSH_TOKEN", "corto")
    r = anon_client.post("/api/push/enviar", json={"title": "a", "body": ""}, headers={"Authorization": "Bearer corto"})
    assert r.status_code == 401


def test_bearer_no_abre_otras_rutas(anon_client, monkeypatch):
    token = "t" * 40
    monkeypatch.setenv("MONI_PUSH_TOKEN", token)
    h = {"Authorization": f"Bearer {token}"}
    for p in ("/api/backup", "/api/push/test", "/api/truncate"):
        assert anon_client.request("POST" if p != "/api/backup" else "GET", p, headers=h).status_code == 401
