import { render } from '@testing-library/react'
import { expect, it } from 'vitest'
import { Skeleton } from './Skeleton'

it('conserva el hook skeleton y acepta clases y atributos', () => {
  const { container } = render(<Skeleton className="h-4 w-8" aria-label="Cargando" />)
  expect(container.firstChild).toHaveClass('skeleton', 'animate-pulse', 'h-4', 'w-8')
  expect(container.firstChild).toHaveAttribute('aria-label', 'Cargando')
})
