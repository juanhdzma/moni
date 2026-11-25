from pydantic import BaseModel

from .comun import Ok


class EstadoAuth(BaseModel):
    configurado: bool
    autenticado: bool
    tiene_passkeys: bool


class Sesion(BaseModel):
    id: int
    creada: str
    ultimo_uso: str
    ip: str
    user_agent: str
    metodo: str
    creada_texto: str
    ultimo_uso_texto: str
    actual: bool


class PasskeyFila(BaseModel):
    id: int
    nombre: str
    creada: str
    ultimo_uso: str
    creada_texto: str
    ultimo_uso_texto: str


class PasskeyCreado(Ok):
    id: int


class DescriptorCredencial(BaseModel):
    id: str
    type: str
    transports: list[str] | None = None


class OpcionesLoginPasskey(BaseModel):
    challenge: str
    timeout: int
    rpId: str
    allowCredentials: list[DescriptorCredencial]
    userVerification: str


class RpPasskey(BaseModel):
    name: str
    id: str


class UsuarioPasskey(BaseModel):
    id: str
    name: str
    displayName: str


class ParametroCredencial(BaseModel):
    type: str
    alg: int


class SeleccionAutenticador(BaseModel):
    authenticatorAttachment: str
    residentKey: str
    requireResidentKey: bool
    userVerification: str


class OpcionesRegistroPasskey(BaseModel):
    rp: RpPasskey
    user: UsuarioPasskey
    challenge: str
    pubKeyCredParams: list[ParametroCredencial]
    timeout: int
    excludeCredentials: list[DescriptorCredencial]
    authenticatorSelection: SeleccionAutenticador
    attestation: str


class ClavePush(BaseModel):
    key: str


class PushEnviado(BaseModel):
    enviadas: int
    eliminadas: int


class PushProbado(BaseModel):
    enviadas: int
