import datetime


def ahora() -> datetime.datetime:
    return datetime.datetime.now(datetime.timezone.utc)


def iso(dt: datetime.datetime) -> str:
    return dt.astimezone(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%S")


def desde_iso(valor: str) -> datetime.datetime:
    return datetime.datetime.strptime(valor, "%Y-%m-%dT%H:%M:%S").replace(tzinfo=datetime.timezone.utc)
