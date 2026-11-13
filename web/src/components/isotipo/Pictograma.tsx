import type { CSSProperties, ReactNode } from 'react'
import type { PictoNombre } from '@/lib/isotipo'

export const EXTENSION: Record<PictoNombre, [number, number]> = {
  moneda: [2.5, 21.5],
  billete: [1.5, 22.5],
  casa: [1.5, 22.5],
  planta: [3.5, 20.5],
  pesa: [4.5, 19.5],
  cubiertos: [5, 19.2],
  carro: [1.9, 22.1],
  rayo: [3.5, 20.5],
  cruz: [2.5, 21.5],
  boleta: [2, 22],
  libro: [2, 22],
  camisa: [2, 22],
  cuadro: [4, 20],
}

const FORMAS: Record<PictoNombre, ReactNode> = {
  cuadro: <rect x="4" y="4" width="16" height="16" />,
  moneda: <path fillRule="evenodd" d="M12 2.5a9.5 9.5 0 1 0 0 19 9.5 9.5 0 0 0 0-19Zm0 4a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11Z" />,
  billete: <path fillRule="evenodd" d="M1.5 6h21v12h-21V6Zm10.5 3a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z" />,
  casa: <path d="M12 2.5 1.5 11.5h3v10h5.5v-6.5h4v6.5h5.5v-10h3L12 2.5Z" />,
  planta: (
    <>
      <path d="M11 11h2v11h-2z" />
      <path d="M11 13.5C6.6 13.5 3.5 10.4 3.5 6c4.4 0 7.5 3.1 7.5 7.5Z" />
      <path d="M13 11c0-4.4 3.1-7.5 7.5-7.5 0 4.4-3.1 7.5-7.5 7.5Z" />
    </>
  ),
  pesa: <path fillRule="evenodd" d="M12 2a4.5 4.5 0 0 0-4.5 4.5v1.9a7.5 7.5 0 1 0 9 0V6.5A4.5 4.5 0 0 0 12 2Zm0 2.5a2 2 0 0 1 2 2v.86a7.6 7.6 0 0 0-4 0V6.5a2 2 0 0 1 2-2Z" />,
  cubiertos: (
    <>
      <path d="M5 2h1.3v6.2h1V2h1.4v6.2h1V2H11v7.3a2.4 2.4 0 0 1-1.8 2.3V22H7.1V11.6A2.4 2.4 0 0 1 5 9.3V2Z" />
      <path d="M18.5 2C16 3.1 14.5 6.4 14.5 11h2.4v11h2.3V2h-.7Z" />
    </>
  ),
  carro: (
    <>
      <path fillRule="evenodd" d="M6.4 5h11.2l2.2 5.5h1.2c.6 0 1 .4 1 1v5H1.9v-5c0-.6.4-1 1-1h1.3L6.4 5Zm1.3 1.8-1.5 3.7h11.6l-1.5-3.7H7.7Z" />
      <circle cx="6.5" cy="18.5" r="2.5" />
      <circle cx="17.5" cy="18.5" r="2.5" />
    </>
  ),
  rayo: <path d="M13.5 1.5 3.5 14h7l-1.5 8.5L20.5 9.5h-7l0-8Z" />,
  cruz: <path d="M8.5 2.5h7v6h6v7h-6v6h-7v-6h-6v-7h6v-6Z" />,
  boleta: <path d="M2 6.5c0-.6.4-1 1-1h18c.6 0 1 .4 1 1v3.2a2.3 2.3 0 0 0 0 4.6v3.2c0 .6-.4 1-1 1H3c-.6 0-1-.4-1-1v-3.2a2.3 2.3 0 0 0 0-4.6V6.5Z" />,
  libro: (
    <>
      <path d="M2 4h6.5A2.5 2.5 0 0 1 11 6.5V21a2.5 2.5 0 0 0-2.5-2.5H2V4Z" />
      <path d="M22 4h-6.5A2.5 2.5 0 0 0 13 6.5V21a2.5 2.5 0 0 1 2.5-2.5H22V4Z" />
    </>
  ),
  camisa: <path d="M8.5 2.5 2 6l2.5 5 2.5-1.2V21.5h10V9.8l2.5 1.2L22 6l-6.5-3.5a3.5 3.5 0 0 1-7 0Z" />,
}

export function Pictograma({ nombre, className, style }: { nombre: PictoNombre; className?: string; style?: CSSProperties }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false" className={className} style={style}>
      {FORMAS[nombre]}
    </svg>
  )
}
