import collections
import threading
import time

from fastapi import HTTPException


def nuevo_registro() -> tuple[threading.Lock, dict[str, collections.deque]]:
    return threading.Lock(), collections.defaultdict(collections.deque)


def limitar(lock, registro, clave: str, maximo: int, ventana_s: int, mensaje: str) -> None:
    ahora = time.monotonic()
    with lock:
        for k in [k for k, c in registro.items() if not c or ahora - c[-1] > ventana_s]:
            del registro[k]
        cola = registro[clave]
        while cola and ahora - cola[0] > ventana_s:
            cola.popleft()
        if len(cola) >= maximo:
            raise HTTPException(429, mensaje, headers={"Retry-After": str(ventana_s)})
        cola.append(ahora)
