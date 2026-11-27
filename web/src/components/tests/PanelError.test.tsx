import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Panel, Resumen } from '@/components/Panel'
import { renderWithProviders } from '@/test/render'

describe('errores de vista', () => {
  it('Panel muestra el mensaje en vez del contenido', () => {
    renderWithProviders(
      <Panel id="p" titulo="T" error="Error 500">
        <p>contenido</p>
      </Panel>,
    )
    expect(screen.getByRole('alert')).toHaveTextContent('Error 500')
    expect(screen.queryByText('contenido')).toBeNull()
  })

  it('Resumen muestra el mensaje en vez del esqueleto', () => {
    renderWithProviders(<Resumen id="r" titulo="T" valor="1" segmentos={[]} color="bg-x" loaded={false} error="Sin conexión" />)
    expect(screen.getByRole('alert')).toHaveTextContent('Sin conexión')
  })

  it('las opacidades de los segmentos vienen del backend', () => {
    renderWithProviders(<Resumen id="r" titulo="T" valor="1" loaded color="bg-x" segmentos={[{ key: 'a', label: 'A', valor: 10, opacidad: 0.3 }]} />)
    const punto = document.querySelector('#r li span[aria-hidden="true"]') as HTMLElement
    expect(punto.style.opacity).toBe('0.3')
  })
})
