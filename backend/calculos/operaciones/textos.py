from ..formato import plural, porcentaje_texto


def categoria_sugerida(rec: dict, nombres_por_tipo: dict) -> str:
    nombres = [c["nombre"] for c in nombres_por_tipo[rec["tipo"]]]
    return rec["nombre"] if rec["nombre"] in nombres else nombres[-1]


def texto_activos(resumen: dict, cantidad: int) -> dict:
    variacion = f"{porcentaje_texto(abs(resumen['variacion_pct']))}% sobre lo pagado" if resumen["total_inicial"] > 0 else ""
    return {"texto_variacion": variacion, "texto_conteo": plural(cantidad, "activo", "activos")}


def texto_posiciones(resumen: dict) -> str:
    return plural(len(resumen["fijas"]) + len(resumen["variables"]), "posición", "posiciones")
