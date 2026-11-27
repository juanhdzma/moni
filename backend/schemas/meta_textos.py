from pydantic import BaseModel


class TextosRetiro(BaseModel):
    label_tipo: str
    label_monto_total: str
    hint_monto_total: str
    label_monto_parcial: str
    label_saldo_queda: str
    hint_saldo_queda: str
    label_fecha: str
    placeholder_notas: str
    guardar: str


class TextosAdelanto(BaseModel):
    label_debes: str
    label_disponible: str
    label_monto: str
    hint_monto: str
    label_disponible_nuevo: str
    placeholder_disponible_nuevo: str
    label_saldo_nuevo: str
    placeholder_saldo_nuevo: str
    label_deuda_total: str
    label_comision: str
    label_fecha: str
    placeholder_notas: str
    label_registrar: str
    guardar: str


class TextosPago(BaseModel):
    label_saldo_pendiente: str
    label_cuota_mensual: str
    label_monto: str
    label_saldo_nuevo: str
    placeholder_saldo_nuevo: str
    label_capital: str
    label_intereses: str
    label_fecha: str
    label_editar: str


class TextosMaterializar(BaseModel):
    ayuda_monto: str
    guardar: str


class TextosActivo(BaseModel):
    placeholder_nombre: str
    label_valor_inicial_nuevo: str
    label_valor_inicial_edicion: str
    label_valor_actual: str
    placeholder_valor_actual: str
    label_fecha: str
    guardar: str


class TextosRegistro(BaseModel):
    titulo: str
    label_crear_tx: str
    hint_crear_tx: str
    label_registrar_tx: str
    hint_registrar_tx: str


class TextosInversion(BaseModel):
    label_pago: str


class TextosTransacciones(BaseModel):
    titulo_panel: str
    boton_nuevo: str
    aria_filtros: str
    aria_mes: str
    aria_tipo: str
    aria_categoria: str
    todos_meses: str
    todos_tipos: str
    todas_categorias: str
    label_pagado_con: str


class TextosMoneda(BaseModel):
    titulo: str
    label: str
    hint: str


class TextosBackup(BaseModel):
    titulo: str
    exportar: str
    importar: str
    hint: str
    titulo_modal: str
    etiqueta_confirmar: str
    descripcion_confirmar: str
    archivo_invalido: str


class TextosPeligro(BaseModel):
    titulo: str
    boton: str
    nota: str
    titulo_modal: str
    etiqueta_confirmar: str
    descripcion_confirmar: str
    label_palabra: str
    error_palabra: str


class TextosMeta(BaseModel):
    moneda_codigo: str
    retiro: TextosRetiro
    adelanto: TextosAdelanto
    pago: TextosPago
    materializar: TextosMaterializar
    activo: TextosActivo
    registro: TextosRegistro
    inversion: TextosInversion
    transacciones: TextosTransacciones
    moneda: TextosMoneda
    backup: TextosBackup
    peligro: TextosPeligro
