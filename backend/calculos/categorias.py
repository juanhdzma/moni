from .constantes import CATEGORIA_LARGO_MAX, CATEGORIAS_SISTEMA, MONEDAS, valores
from .errores import ErrorDeDominio

TIPOS = tuple(CATEGORIAS_SISTEMA)
NOMBRES_SISTEMA = frozenset(n for nombres in CATEGORIAS_SISTEMA.values() for n in nombres.values())


class CategoriaDuplicada(ErrorDeDominio):
    status = 409


class CategoriaInvalida(ErrorDeDominio):
    status = 422


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
        raise CategoriaInvalida("Tipo inválido")
    limpio = (nombre or "").strip()
    if not limpio:
        raise CategoriaInvalida("Nombre vacío")
    if len(limpio) > CATEGORIA_LARGO_MAX:
        raise CategoriaInvalida(f"Nombre demasiado largo (máximo {CATEGORIA_LARGO_MAX} caracteres)")
    if limpio in NOMBRES_SISTEMA or limpio in existentes:
        raise CategoriaDuplicada("Categoría repetida")
    return limpio


def validar_simbolo(simbolo):
    limpio = (simbolo or "").strip()
    if limpio not in valores(MONEDAS):
        raise ErrorDeDominio("símbolo inválido")
    return limpio
