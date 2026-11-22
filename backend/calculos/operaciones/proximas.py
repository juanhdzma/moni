import datetime

from ..fechas import mes_corto, parse_fecha, texto_dias
from ..constantes import tiene_saldo
from ..formato import cop, frase, plural
from .finanzas import proxima_fecha_inversion, rendimiento_mensual_fija
from .frecuencias import frecuencia_label, proxima_fecha_recurrente

PROX_OP_OVERDUE_DAYS = 10
PROX_OP_ADELANTE_DIAS = 45
PROX_OP_MAX_ITEMS = 20
PROX_OP_VISIBLES = 5


def clave_op(tipo: str, fuente_id: int, fecha_iso: str) -> str:
    return f"{tipo}:{fuente_id}:{fecha_iso}"


def _candidato(fecha: datetime.date, etiqueta: str, sub: str, monto: float, tipo: str, fuente_id: int) -> dict:
    iso = fecha.isoformat()
    return {
        "fecha": fecha,
        "fecha_iso": iso,
        "etiqueta": etiqueta,
        "sub": sub,
        "monto": monto,
        "tipo": tipo,
        "fuente_id": fuente_id,
        "clave": clave_op(tipo, fuente_id, iso),
    }


def calcular_proximas_operaciones(deudas: list, inversiones: list, recurrentes: list, hoy: datetime.date) -> list[dict]:
    pasado = hoy - datetime.timedelta(days=PROX_OP_OVERDUE_DAYS)
    limite = hoy + datetime.timedelta(days=PROX_OP_ADELANTE_DIAS)
    ops = []

    for d in deudas:
        if not (tiene_saldo(d) and d.get("proxima_cuota")):
            continue
        f = parse_fecha(d["proxima_cuota"])
        if f and pasado <= f <= limite:
            ops.append(_candidato(f, d["nombre"], "Cuota deuda", -d["cuota_mensual"], "deuda", d["id"]))

    for i in inversiones:
        if not (i["tipo"] == "fija" and i.get("pago") == "mensual" and i.get("dia_pago") and i.get("tasa_ea")):
            continue
        f = proxima_fecha_inversion(i["dia_pago"], hoy)
        if f <= limite:
            ops.append(
                _candidato(f, i["nombre"], "Rendimiento", rendimiento_mensual_fija(i["monto_invertido"], i["tasa_ea"]), "inversion", i["id"])
            )

    for r in recurrentes:
        if not (r["activo"] and r.get("fecha_inicio")):
            continue
        f = proxima_fecha_recurrente(r["fecha_inicio"], r["frecuencia"], hoy)
        if f and pasado <= f <= limite:
            monto = r["monto"] if r["tipo"] == "ingreso" else -r["monto"]
            ops.append(_candidato(f, r["nombre"], frecuencia_label(r["frecuencia"]), monto, "recurrente", r["id"]))

    return sorted(ops, key=lambda o: o["fecha"])


def _frase_proximas(vencidas: int, salen_total: float, simbolo: str) -> dict:
    por_pagar = (cop(salen_total, simbolo), "fuerte")
    if vencidas:
        pagos = (plural(vencidas, "pago vencido", "pagos vencidos"), "negativo")
        return frase("Tenés ", pagos, " y ", por_pagar, f" por pagar en {PROX_OP_ADELANTE_DIAS} días.")
    return frase(por_pagar, f" por pagar en los próximos {PROX_OP_ADELANTE_DIAS} días.")


def armar_proximas(candidatas: list[dict], ocultas: set[str], hoy: datetime.date, simbolo: str = "$") -> dict:
    items = []
    for c in candidatas:
        if c["clave"] in ocultas:
            continue
        dias = (c["fecha"] - hoy).days
        items.append(
            {
                "clave": c["clave"],
                "tipo": c["tipo"],
                "fuente_id": c["fuente_id"],
                "fecha": c["fecha_iso"],
                "dia": c["fecha"].day,
                "mes_corto": mes_corto(c["fecha"].month),
                "etiqueta": c["etiqueta"],
                "sub": c["sub"],
                "monto": c["monto"],
                "dias": dias,
                "texto_dias": texto_dias(dias),
                "vencida": dias < 0,
            }
        )
    vencidas = sum(1 for i in items if i["dias"] < 0)
    salen_total = sum(-i["monto"] for i in items if i["monto"] < 0)
    return {
        "hoy": hoy.isoformat(),
        "items": items[:PROX_OP_MAX_ITEMS],
        "vencidas": vencidas,
        "salen_total": salen_total,
        "dias_ventana": PROX_OP_ADELANTE_DIAS,
        "visibles": PROX_OP_VISIBLES,
        "frase": _frase_proximas(vencidas, salen_total, simbolo) if items else None,
        "texto_vacio": f"Sin operaciones en los próximos {PROX_OP_ADELANTE_DIAS} días.",
    }


def claves_vigentes(candidatas: list[dict]) -> set[str]:
    return {c["clave"] for c in candidatas}


def operaciones_proximas(
    deudas: list, inversiones: list, recurrentes: list, hoy: datetime.date, dias: int = 1
) -> list[tuple[datetime.date, str, float]]:
    limite = hoy + datetime.timedelta(days=dias)
    return [
        (c["fecha"], c["etiqueta"], c["monto"])
        for c in calcular_proximas_operaciones(deudas, inversiones, recurrentes, hoy)
        if hoy <= c["fecha"] <= limite
    ]
