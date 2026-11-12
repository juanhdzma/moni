import re
from pathlib import Path

from backend import main

LIB = Path(__file__).resolve().parents[2] / "web" / "src" / "lib"


def _literal(path, name, opener):
    src = (LIB / path).read_text(encoding="utf-8")
    start = src.index(name)
    start = src.index(opener, start)
    depth, i = 0, start
    while True:
        depth += {"{": 1, "[": 1, "}": -1, "]": -1}.get(src[i], 0)
        i += 1
        if depth == 0:
            return src[start:i]


def _quoted(text):
    return re.findall(r"'([^']*)'", text)


def test_categorias_del_frontend_coinciden_con_el_backend():
    body = _literal("config.ts", "export const SYSTEM_CATEGORIES", "{")
    front = {
        tipo: set(_quoted(lista))
        for tipo, lista in re.findall(r"(\w+):\s*(\[[^\]]*\])", body)
    }
    back = {tipo: set(cats.values()) for tipo, cats in main.CATEGORIAS_SISTEMA.items()}
    assert front == back


def test_categorias_neutras_son_categorias_de_sistema():
    body = _literal("dinero.ts", "export const CATEGORIAS_NEUTRAS_PATRIMONIO", "[")
    neutras = set(_quoted(body))
    sistema = {c for cats in main.CATEGORIAS_SISTEMA.values() for c in cats.values()}
    assert neutras
    assert neutras <= sistema
