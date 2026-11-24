from .fechas import redondear_js


def _miles(n: int) -> str:
    return f"{n:,}".replace(",", ".")


def cop(n: float, simbolo: str = "$") -> str:
    return simbolo + ("-" if n < 0 else "") + _miles(redondear_js(abs(n)))


def cop_corto(n: float, simbolo: str = "$") -> str:
    absoluto = abs(n)
    signo = "−" if n < 0 else ""
    if absoluto >= 1e9:
        return f"{signo}{simbolo}{absoluto / 1e9:.1f}".replace(".", ",") + "B"
    if absoluto >= 1e6:
        return f"{signo}{simbolo}{absoluto / 1e6:.1f}".replace(".", ",") + "M"
    if absoluto >= 1e3:
        return f"{signo}{simbolo}{redondear_js(absoluto / 1e3)}k"
    return signo + cop(absoluto, simbolo)


def porcentaje_texto(n: float, decimales: int = 1) -> str:
    return f"{n or 0:,.{decimales}f}".translate({ord(","): ".", ord("."): ","})


def plural(n: int, singular: str, plural_: str) -> str:
    return f"{n} {singular if n == 1 else plural_}"


def frase(*partes: str | tuple[str, str]) -> dict:
    items = [{"texto": p, "tono": None} if isinstance(p, str) else {"texto": p[0], "tono": p[1]} for p in partes]
    return {"texto": "".join(i["texto"] for i in items), "partes": items}


def frase_flujo(verbo_entra, verbo_sale, ingresos, gastos, simbolo="$", sufijo=""):
    return frase(
        f"{verbo_entra} ", (cop(ingresos, simbolo), "positivo"), f" · {verbo_sale} ", (cop(gastos, simbolo), "fuerte"), sufijo,
    )


def top_segmentos(items, n=4):
    orden = sorted((s for s in items if s["valor"] > 0), key=lambda s: -s["valor"])
    if len(orden) <= n + 1:
        return orden
    otros = sum(s["valor"] for s in orden[n:])
    return orden[:n] + [{"key": "__otros", "label": "Otros", "valor": otros}]
