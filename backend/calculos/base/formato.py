from .fechas import redondear_js


def _miles(n: int) -> str:
    return f"{n:,}".replace(",", ".")


def cop(n: float, simbolo: str = "$") -> str:
    redondeado = redondear_js(abs(n))
    return simbolo + ("-" if n < 0 and redondeado else "") + _miles(redondeado)


def cop_corto(n: float, simbolo: str = "$") -> str:
    absoluto = abs(n)
    signo = "−" if n < 0 else ""
    if absoluto >= 1e12:
        return f"{signo}{simbolo}{absoluto / 1e12:.1f}".replace(".", ",") + "B"
    if absoluto >= 1e9:
        return f"{signo}{simbolo}{absoluto / 1e9:.1f}".replace(".", ",") + "MM"
    if absoluto >= 1e6:
        return f"{signo}{simbolo}{absoluto / 1e6:.1f}".replace(".", ",") + "M"
    if absoluto >= 1e3:
        return f"{signo}{simbolo}{redondear_js(absoluto / 1e3)}k"
    return signo + cop(absoluto, simbolo)


def porcentaje_texto(n: float, decimales: int = 1) -> str:
    return f"{n or 0:,.{decimales}f}".translate({ord(","): ".", ord("."): ","})


def tono_de_valor(valor: float) -> str:
    return "positivo" if valor > 0 else "negativo" if valor < 0 else "neutro"


def signo_de(valor: float) -> str:
    return "" if valor == 0 else "+" if valor > 0 else "−"


def con_variacion(datos: dict, *campos: str) -> dict:
    return {
        **datos,
        **{f"{c}_tono": tono_de_valor(datos[c]) for c in campos},
        **{f"{c}_signo": signo_de(datos[c]) for c in campos},
    }


def pct_barra(valor: float, maximo: float, minimo: float = 2) -> float:
    if maximo <= 0:
        return 0
    return max(abs(valor) / maximo * 100, minimo if valor else 0)


def plural(n: int, singular: str, plural_: str) -> str:
    return f"{n} {singular if n == 1 else plural_}"


def frase(*partes: str | tuple[str, str]) -> dict:
    items = [{"texto": p, "tono": None} if isinstance(p, str) else {"texto": p[0], "tono": p[1]} for p in partes]
    return {"texto": "".join(i["texto"] for i in items), "partes": items}


def frase_flujo(verbo_entra, verbo_sale, ingresos, gastos, simbolo="$", sufijo=""):
    return frase(
        f"{verbo_entra} ", (cop(ingresos, simbolo), "positivo"), f" · {verbo_sale} ", (cop(gastos, simbolo), "fuerte"), sufijo,
    )


OPACIDADES_SEGMENTO = (1, 0.65, 0.45, 0.3, 0.2)


def top_segmentos(items, n=4):
    orden = sorted((s for s in items if s["valor"] > 0), key=lambda s: -s["valor"])
    if len(orden) > n + 1:
        otros = sum(s["valor"] for s in orden[n:])
        orden = orden[:n] + [{"key": "__otros", "label": "Otros", "valor": otros}]
    return [{**s, "opacidad": OPACIDADES_SEGMENTO[min(i, len(OPACIDADES_SEGMENTO) - 1)]} for i, s in enumerate(orden)]
