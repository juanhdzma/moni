class ErrorDeDominio(ValueError):
    status = 400

    def __init__(self, mensaje: str, status: int | None = None):
        super().__init__(mensaje)
        self.mensaje = mensaje
        if status is not None:
            self.status = status
