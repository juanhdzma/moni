from backend.seguridad import cli, password
from backend.tests.conftest import IP_TEST
from backend.tests.seguridad.helpers import login


def test_cli_blocked_y_unblock(anon_client, capsys):
    for _ in range(3):
        login(anon_client, "x")
    assert cli.main(["blocked"]) == 0
    assert IP_TEST[0] in capsys.readouterr().out
    assert cli.main(["unblock", IP_TEST[0]]) == 0
    assert "desbloqueada" in capsys.readouterr().out
    assert login(anon_client).status_code == 200
    assert cli.main(["blocked"]) == 0
    assert "Sin IPs" in capsys.readouterr().out


def test_cli_unblock_reinicia_el_conteo(anon_client):
    for _ in range(3):
        login(anon_client, "x")
    cli.main(["unblock", IP_TEST[0]])
    assert login(anon_client, "x").status_code == 401
    assert login(anon_client, "x").status_code == 401
    assert login(anon_client).status_code == 200


def test_cli_hash(monkeypatch, capsys):
    claves = iter(["una-clave-muy-larga-1", "una-clave-muy-larga-1"])
    monkeypatch.setattr(cli.getpass, "getpass", lambda _: next(claves))
    assert cli.main(["hash"]) == 0
    linea = capsys.readouterr().out.strip()
    assert linea.startswith("MONI_PASSWORD_HASH='scrypt$")
    monkeypatch.setenv("MONI_PASSWORD_HASH", linea.split("=", 1)[1])
    assert password.verificar_clave("una-clave-muy-larga-1")


def test_cli_hash_rechaza_corta_y_distinta(monkeypatch, capsys):
    monkeypatch.setattr(cli.getpass, "getpass", lambda _: "corta")
    assert cli.main(["hash"]) == 1
    claves = iter(["una-clave-muy-larga-1", "otra-clave-muy-larga-2"])
    monkeypatch.setattr(cli.getpass, "getpass", lambda _: next(claves))
    assert cli.main(["hash"]) == 1


def test_cli_uso(capsys):
    assert cli.main([]) == 2
    assert cli.main(["unblock"]) == 2
