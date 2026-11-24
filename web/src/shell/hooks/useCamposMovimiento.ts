import { useState } from 'react'

export interface CamposMovimiento {
  fecha: string
  setFecha: (v: string) => void
  notas: string
  setNotas: (v: string) => void
  registrar: boolean
  setRegistrar: (v: boolean) => void
  cuerpo: () => { fecha: string; notas: string; registrar_tx: boolean }
}

export function useCamposMovimiento(fechaInicial: string): CamposMovimiento {
  const [fecha, setFecha] = useState(fechaInicial)
  const [notas, setNotas] = useState('')
  const [registrar, setRegistrar] = useState(true)
  return { fecha, setFecha, notas, setNotas, registrar, setRegistrar, cuerpo: () => ({ fecha, notas: notas.trim(), registrar_tx: registrar }) }
}
