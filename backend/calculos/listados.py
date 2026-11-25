import unicodedata
from datetime import timedelta

from .fechas import es_desactualizado, mes_de, nombre_mes, normalizar_fecha, parse_fecha
from .formato import frase_flujo, top_segmentos
from .numeros import monto_firmado

COLUMNAS_ORDEN = ("fecha", "tipo", "categoria", "descripcion", "monto")
ETIQUETAS_COLUMNA = {
    "fecha": "Fecha",
    "tipo": "Tipo",
    "categoria": "Categoría",
    "descripcion": "Descripción",
    "monto": "Monto",
}
OCULTAS_EN_MOVIL = ("tipo", "categoria")
DIRECCION_INICIAL = {"fecha": -1, "tipo": 1, "categoria": 1, "descripcion": 1, "monto": -1}
ETIQUETAS_TIPO = {"ingreso": "Ingresos", "gasto": "Gastos"}
ETIQUETAS_TIPO_FILA = {"ingreso": "Ingreso", "gasto": "Gasto", "transfer": "Auto"}
TONO_TX = {"ingreso": "ingreso", "gasto": "gasto", "transfer": "neutro"}
EFECTIVO_DEBITO = "Efectivo / Débito"


def columnas_transaccion():
    columnas = [
        {
            "col": c,
            "label": ETIQUETAS_COLUMNA[c],
            "dir_defecto": DIRECCION_INICIAL[c],
            "ordenable": True,
            "oculta_en_movil": c in OCULTAS_EN_MOVIL,
        }
        for c in COLUMNAS_ORDEN
    ]
    columnas.append(
        {"col": "metodo_pago", "label": "Método de pago", "dir_defecto": 1, "ordenable": False, "oculta_en_movil": False}
    )
    return columnas


def atributos_visuales_tx(tx):
    tarjeta = tx.get("tarjeta_nombre") is not None
    return {
        "editable": tx["tipo"] != "transfer",
        "tono": TONO_TX[tx["tipo"]],
        "icono_metodo": (tx.get("tarjeta_franquicia") or "Otra") if tarjeta else "efectivo",
    }


def alertas(activos, inversiones, hoy):
    return {
        "activos": any(es_desactualizado(a.get("valor_actualizado_en"), hoy) for a in activos),
        "inversiones": any(
            i.get("tipo") == "variable" and es_desactualizado(i.get("valor_actualizado_en"), hoy)
            for i in inversiones
        ),
    }


def derivar_tx(fila, deudas_por_id):
    tx = dict(fila)
    tx["fecha"] = normalizar_fecha(fila["fecha"])
    tx["monto_firmado"] = monto_firmado(fila["tipo"], fila["monto"])
    tarjeta_id = fila.get("tarjeta_id")
    tarjeta = deudas_por_id.get(tarjeta_id) if fila["tipo"] == "gasto" and tarjeta_id else None
    tx["tarjeta_nombre"] = tarjeta["nombre"] if tarjeta else None
    tx["tarjeta_franquicia"] = tarjeta["franquicia"] if tarjeta else None
    if tarjeta:
        nombre = tarjeta["nombre"]
        tx["metodo_pago"] = nombre[:20] + "…" if len(nombre) > 20 else nombre
    else:
        tx["metodo_pago"] = EFECTIVO_DEBITO
    return {**tx, **atributos_visuales_tx(tx)}


def etiqueta_mes(mes):
    anio, m = mes.split("-")
    return f"{nombre_mes(int(m)).lower()} de {anio}"


def meses_disponibles(txs):
    return sorted({mes_de(t["fecha"]) for t in txs if parse_fecha(t["fecha"])}, reverse=True)


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


TEXTO_VACIO_TX = {"titulo": "Sin movimientos", "texto": "Agregá un ingreso o gasto con el botón de arriba."}


def texto_vacio_movimientos():
    return {"titulo": "Sin transacciones", "texto": "Registrá un ingreso o gasto y aparece acá."}


def resumen_tx(txs, simbolo="$"):
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
        "gastos_firmado": -gastos,
        "neto": ingresos - gastos,
        "dato": frase_flujo("entró", "salió", ingresos, gastos, simbolo),
        "segmentos": top_segmentos(segmentos),
    }


def _titulo_resumen(items, filtrado):
    base = "Ingresos menos gastos" if any(t.get("tarjeta_nombre") is not None for t in items) else "Te quedó"
    return f"{base} con estos filtros" if filtrado else base


def _clave_texto(v):
    plano = unicodedata.normalize("NFC", v.casefold()).replace("ñ", "n\uffff")
    base = "".join(c for c in unicodedata.normalize("NFD", plano) if not unicodedata.combining(c))
    return (base, plano, v.swapcase())


def listar_transacciones(txs, col="fecha", dir=-1, tipo="", mes="", cat="", hoy=None, simbolo="$"):
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
        "resumen": {**resumen_tx(items, simbolo), "titulo": _titulo_resumen(items, bool(pills))},
        "texto_vacio": TEXTO_VACIO_TX,
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
