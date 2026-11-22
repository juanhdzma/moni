import unicodedata
from datetime import timedelta

from backend.calculos.constantes import CATEGORIAS_SISTEMA, tiene_saldo
from backend.calculos.fechas import es_desactualizado, mes_de, nombre_mes, normalizar_fecha, parse_fecha


TIPOS = tuple(CATEGORIAS_SISTEMA)
COLUMNAS_ORDEN = ("fecha", "tipo", "categoria", "descripcion", "monto")
ETIQUETAS_TIPO = {"ingreso": "Ingresos", "gasto": "Gastos"}
ETIQUETAS_TIPO_FILA = {"ingreso": "Ingreso", "gasto": "Gasto", "transfer": "Auto"}
EFECTIVO_DEBITO = "Efectivo / Débito"


class CategoriaDuplicada(ValueError):
    pass


def es_categoria_sistema(tipo, nombre):
    return nombre in CATEGORIAS_SISTEMA.get(tipo, {}).values()


def categorias_con_custom(custom_rows):
    cats = {
        tipo: [{"nombre": n, "sistema": True} for n in nombres.values()]
        for tipo, nombres in CATEGORIAS_SISTEMA.items()
    }
    for row in custom_rows:
        tipo, nombre = row["tipo"], row["nombre"]
        if tipo in cats and not any(c["nombre"] == nombre for c in cats[tipo]):
            cats[tipo].append({"nombre": nombre, "sistema": False})
    return cats


def validar_categoria(tipo, nombre, existentes):
    if tipo not in TIPOS:
        raise ValueError("tipo inválido")
    limpio = (nombre or "").strip()
    if not limpio:
        raise ValueError("nombre vacío")
    if es_categoria_sistema(tipo, limpio) or limpio in existentes:
        raise CategoriaDuplicada("categoría repetida")
    return limpio


def validar_simbolo(simbolo):
    limpio = (simbolo or "").strip()
    if not 1 <= len(limpio) <= 4 or "\n" in limpio or "\r" in limpio:
        raise ValueError("símbolo inválido")
    return limpio


def alertas(activos, inversiones, hoy):
    return {
        "activos": any(es_desactualizado(a.get("valor_actualizado_en"), hoy) for a in activos),
        "inversiones": any(
            i.get("tipo") == "variable" and es_desactualizado(i.get("valor_actualizado_en"), hoy)
            for i in inversiones
        ),
    }


def top_segmentos(items, n=4):
    orden = sorted((s for s in items if s["valor"] > 0), key=lambda s: -s["valor"])
    if len(orden) <= n + 1:
        return orden
    otros = sum(s["valor"] for s in orden[n:])
    return orden[:n] + [{"key": "__otros", "label": "Otros", "valor": otros}]


def derivar_tx(fila, deudas_por_id):
    tx = dict(fila)
    tx["fecha"] = normalizar_fecha(fila["fecha"])
    tx["mes"] = mes_de(tx["fecha"])
    tarjeta_id = fila.get("tarjeta_id")
    tx["es_gasto_cartera"] = fila["tipo"] == "gasto" and not tarjeta_id
    tarjeta = deudas_por_id.get(tarjeta_id) if fila["tipo"] == "gasto" and tarjeta_id else None
    tx["tarjeta_nombre"] = tarjeta["nombre"] if tarjeta else None
    tx["tarjeta_franquicia"] = tarjeta["franquicia"] if tarjeta else None
    if tarjeta:
        nombre = tarjeta["nombre"]
        tx["metodo_pago"] = nombre[:20] + "…" if len(nombre) > 20 else nombre
    else:
        tx["metodo_pago"] = EFECTIVO_DEBITO
    return tx


def etiqueta_mes(mes):
    anio, m = mes.split("-")
    return f"{nombre_mes(int(m)).lower()} de {anio}"


def meses_disponibles(txs):
    return sorted({mes_de(t["fecha"]) for t in txs}, reverse=True)


def categorias_disponibles(txs):
    return sorted({t["categoria"] for t in txs})


def inicio_semana(d):
    return d - timedelta(days=d.weekday())


def grupo_fecha(fecha, hoy):
    d = parse_fecha(fecha)
    if d is None:
        return ""
    diff = (hoy - d).days
    if diff == 0:
        return "Hoy"
    if diff == 1:
        return "Ayer"
    if d >= inicio_semana(hoy):
        return "Esta semana"
    if (d.year, d.month) == (hoy.year, hoy.month):
        return "Este mes"
    mes = nombre_mes(d.month).lower()
    return f"{mes[0].upper()}{mes[1:]} - {d.year}"


def resumen_tx(txs):
    ingresos = 0
    gastos = 0
    por_cat = {}
    for t in txs:
        if t["tipo"] == "ingreso":
            ingresos += t["monto"]
        elif t["tipo"] == "gasto":
            gastos += t["monto"]
            por_cat[t["categoria"]] = por_cat.get(t["categoria"], 0) + t["monto"]
    segmentos = [{"key": c, "label": c, "valor": v} for c, v in por_cat.items()]
    return {
        "ingresos": ingresos,
        "gastos": gastos,
        "neto": ingresos - gastos,
        "segmentos": top_segmentos(segmentos),
    }


def _clave_texto(v):
    plano = unicodedata.normalize("NFC", v.casefold()).replace("ñ", "n\uffff")
    base = "".join(c for c in unicodedata.normalize("NFD", plano) if not unicodedata.combining(c))
    return (base, plano, v.swapcase())


def listar_transacciones(txs, col="fecha", dir=-1, tipo="", mes="", cat="", hoy=None):
    if col not in COLUMNAS_ORDEN:
        raise ValueError("columna inválida")
    meses = meses_disponibles(txs)
    categorias = categorias_disponibles(txs)
    tipo = tipo if tipo in ETIQUETAS_TIPO else ""
    mes = mes if mes in meses else ""
    cat = cat if cat in categorias else ""

    if col == "monto":
        def clave(t):
            return t["monto"]
    else:
        def clave(t):
            return _clave_texto(str(t.get(col) or ""))

    items = sorted((t for t in txs if t["tipo"] != "transfer"), key=clave, reverse=dir == -1)
    if tipo:
        items = [t for t in items if t["tipo"] == tipo]
    if mes:
        items = [t for t in items if mes_de(t["fecha"]) == mes]
    if cat:
        items = [t for t in items if t["categoria"] == cat]

    items = [
        {
            **t,
            "mes": mes_de(t["fecha"]),
            "tipo_label": ETIQUETAS_TIPO_FILA[t["tipo"]],
            "grupo": grupo_fecha(t["fecha"], hoy) if col == "fecha" else None,
        }
        for t in items
    ]
    pills = []
    if mes:
        pills.append({"campo": "mes", "label": etiqueta_mes(mes)})
    if tipo:
        pills.append({"campo": "tipo", "label": ETIQUETAS_TIPO[tipo]})
    if cat:
        pills.append({"campo": "cat", "label": cat})
    return {
        "items": items,
        "filtros": {"tipo": tipo, "mes": mes, "cat": cat},
        "opciones": {
            "meses": [{"value": m, "label": etiqueta_mes(m)} for m in meses],
            "categorias": categorias,
            "tipos": [{"value": k, "label": v} for k, v in ETIQUETAS_TIPO.items()],
        },
        "pills": pills,
        "resumen": resumen_tx(items),
    }


def _fecha_con_hora(fecha):
    f = normalizar_fecha(fecha)
    if len(f) == 10:
        return f"{f}T00:00"
    return f if len(f) == 16 else ""


def opciones_tx(categorias, deudas, tx, ahora):
    tipo = "ingreso" if tx and tx["tipo"] == "ingreso" else "gasto"
    nombres = {t: [c["nombre"] for c in categorias[t]] for t in ("ingreso", "gasto")}
    if tx and tx["categoria"] not in nombres[tipo]:
        nombres[tipo].append(tx["categoria"])
    por_defecto = {t: n[0] if n else "" for t, n in nombres.items()}
    tarjetas = [{"id": d["id"], "nombre": d["nombre"]} for d in deudas if d["es_tarjeta"]]
    tarjeta_id = tx["tarjeta_id"] if tx and any(t["id"] == tx["tarjeta_id"] for t in tarjetas) else None
    return {
        "tarjetas": tarjetas,
        "categorias": nombres,
        "categoria_default": por_defecto,
        "inicial": {
            "tipo": tipo,
            "categoria": tx["categoria"] if tx and tx["categoria"] else por_defecto[tipo],
            "tarjeta_id": tarjeta_id,
            "fecha": _fecha_con_hora(tx["fecha"]) if tx else ahora,
        },
    }
