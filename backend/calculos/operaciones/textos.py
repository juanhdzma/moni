from ..formato import cop, plural, porcentaje_texto
from ..numeros import porcentaje

DESCRIPCION_RENDIMIENTO = "Un rendimiento cuenta de un solo lado: si capitaliza sube valor_actual sin transacción; si se paga, es un ingreso y el valor no cambia."

PREFIJOS_TX = {
    "inversion_nueva": "Nueva inversión",
    "aporte": "Aporte",
    "rendimiento": "Rendimiento",
    "retiro_total": "Retiro total",
    "retiro_parcial": "Retiro parcial",
    "compra": "Compra",
    "venta": "Venta",
}


def descripcion_tx(prefijo: str, nombre: str) -> str:
    return f"{PREFIJOS_TX[prefijo]} · {nombre}"


def texto_estimado_aporte(estimado: float | None, simbolo: str) -> str:
    if estimado is None:
        return "Estimado como valor actual + aporte. Ajustá si el mercado se movió."
    return f"Estimado: {cop(estimado, simbolo)}. Ajustá si el mercado se movió."


def categoria_sugerida(rec: dict, nombres_por_tipo: dict) -> str:
    nombres = [c["nombre"] for c in nombres_por_tipo[rec["tipo"]]]
    return rec["nombre"] if rec["nombre"] in nombres else nombres[-1]


def texto_activos(resumen: dict, cantidad: int) -> dict:
    variacion_pct = porcentaje(resumen["variacion"], resumen["total_inicial"])
    variacion = f"{porcentaje_texto(abs(variacion_pct))}% sobre lo pagado" if resumen["mostrar_variacion"] else ""
    return {"texto_variacion": variacion, "texto_conteo": plural(cantidad, "activo", "activos")}


def texto_posiciones(resumen: dict) -> str:
    return plural(len(resumen["fijas"]) + len(resumen["variables"]), "posición", "posiciones")
