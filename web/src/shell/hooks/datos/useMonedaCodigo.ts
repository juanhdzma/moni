import { useMeta } from './useMeta'

export function useEtiquetaMoneda(): (label: string | undefined) => string {
  const codigo = useMeta()?.textos.moneda_codigo ?? ''
  return (label) => (label === undefined ? '' : `${label} (${codigo})`)
}
