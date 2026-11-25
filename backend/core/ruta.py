from fastapi import Request


def ruta_normalizada(path: str) -> str:
    partes = []
    for seg in path.split("/"):
        if seg in ("", "."):
            continue
        if seg == "..":
            if partes:
                partes.pop()
            continue
        partes.append(seg)
    return "/" + "/".join(partes).lower()


def ruta_de(request: Request) -> str:
    return ruta_normalizada(request.scope["path"])
