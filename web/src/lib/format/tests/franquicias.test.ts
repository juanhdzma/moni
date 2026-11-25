import { expect, it } from 'vitest'
import { FRANQUICIA_ICONS } from '@/lib/format'

it('cada franquicia apunta a su ícono en /assets/franquicias', () => {
  expect(FRANQUICIA_ICONS).toEqual({
    Visa: '/assets/franquicias/visa.svg',
    Mastercard: '/assets/franquicias/mastercard.svg',
    Amex: '/assets/franquicias/americanexpress.svg',
    Otra: '/assets/franquicias/otra.svg',
  })
})
