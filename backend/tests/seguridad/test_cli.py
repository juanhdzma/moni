import pytest

from backend.core import db
from backend.seguridad import cli, password
from backend.seguridad.password import MIN_CLAVE
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


USO = "uso: python -m backend.seguridad hash | unblock <ip> | blocked\n"


def _claves(monkeypatch, *valores):
    pedidos = []
    it = iter(valores)
    monkeypatch.setattr(cli.getpass, "getpass", lambda prompt: pedidos.append(prompt) or next(it))
    return pedidos


def _sql(consulta, *params):
    conn = db.get_conn()
    try:
        filas = [tuple(f) for f in conn.execute(consulta, params).fetchall()]
        conn.commit()
        return filas
    finally:
        conn.close()


def test_hash_clave_corta_mensaje_exacto_en_stderr(monkeypatch, capsys):
    pedidos = _claves(monkeypatch, "x" * (MIN_CLAVE - 1))
    assert cli.main(["hash"]) == 1
    salida = capsys.readouterr()
    assert salida.err == "La clave debe tener al menos 12 caracteres\n"
    assert salida.out == ""
    assert pedidos == ["Clave: "]


def test_hash_clave_de_largo_exacto_min_clave_se_acepta(monkeypatch, capsys):
    clave = "x" * MIN_CLAVE
    pedidos = _claves(monkeypatch, clave, clave)
    assert cli.main(["hash"]) == 0
    assert pedidos == ["Clave: ", "Repetir clave: "]
    assert capsys.readouterr().err == ""


def test_hash_claves_distintas_mensaje_exacto_en_stderr(monkeypatch, capsys):
    _claves(monkeypatch, "a" * 12, "b" * 12)
    assert cli.main(["hash"]) == 1
    salida = capsys.readouterr()
    assert salida.err == "Las claves no coinciden\n" and salida.out == ""


def test_hash_imprime_solo_la_linea_con_comillas_simples(monkeypatch, capsys):
    _claves(monkeypatch, "a" * 12, "a" * 12)
    cli.main(["hash"])
    salida = capsys.readouterr().out
    assert salida.count("\n") == 1
    assert salida.startswith("MONI_PASSWORD_HASH='scrypt$32768$8$1$") and salida.endswith("'\n")


def test_unblock_ip_que_no_estaba_bloqueada_mensaje_exacto(entorno, capsys):
    assert cli.main(["unblock", "203.0.113.5"]) == 0
    assert capsys.readouterr().out == "203.0.113.5: no estaba bloqueada\n"


def test_unblock_normaliza_ipv6_al_64_y_ipv4_mapeada(entorno, capsys):
    _sql("INSERT INTO ips_bloqueadas (ip, desde, hasta, motivo) VALUES ('2001:db8:1:2::/64', 'a', 'b', 'clave')")
    assert cli.main(["unblock", "2001:db8:1:2::77"]) == 0
    assert capsys.readouterr().out == "2001:db8:1:2::/64: desbloqueada\n"
    assert cli.main(["unblock", " ::ffff:203.0.113.9 "]) == 0
    assert capsys.readouterr().out == "203.0.113.9: no estaba bloqueada\n"


def test_unblock_limpia_intentos_solo_de_esa_ip(entorno, capsys):
    _sql("INSERT INTO intentos_fallidos (ip, ts, motivo) VALUES ('203.0.113.5', 't', 'clave'), ('203.0.113.6', 't', 'clave')")
    cli.main(["unblock", "203.0.113.5"])
    assert _sql("SELECT ip FROM intentos_fallidos") == [("203.0.113.6",)]


def test_blocked_sin_filas_mensaje_exacto(entorno, capsys):
    assert cli.main(["blocked"]) == 0
    assert capsys.readouterr().out == "Sin IPs bloqueadas\n"


def test_blocked_formato_exacto_y_orden_por_desde(entorno, capsys):
    _sql("INSERT INTO ips_bloqueadas (ip, desde, hasta, motivo) VALUES ('2.2.2.2', '2026-01-02T00:00:00', '2026-01-03T00:00:00', 'passkey')")
    _sql("INSERT INTO ips_bloqueadas (ip, desde, hasta, motivo) VALUES ('1.1.1.1', '2026-01-01T00:00:00', '2026-01-02T00:00:00', 'clave')")
    assert cli.main(["blocked"]) == 0
    assert capsys.readouterr().out == (
        "1.1.1.1\tdesde=2026-01-01T00:00:00\thasta=2026-01-02T00:00:00\tmotivo=clave\n"
        "2.2.2.2\tdesde=2026-01-02T00:00:00\thasta=2026-01-03T00:00:00\tmotivo=passkey\n"
    )


@pytest.mark.parametrize("argv", [[], ["unblock"], ["unblock", "1.1.1.1", "2.2.2.2"], ["hash", "x"], ["blocked", "x"], ["otra"]])
def test_uso_exacto_en_stderr_y_codigo_2(argv, capsys):
    assert cli.main(argv) == 2
    salida = capsys.readouterr()
    assert salida.err == USO and salida.out == ""
