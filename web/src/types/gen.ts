import type { components } from './api.gen'

export type Schemas = components['schemas']
export type Opcional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>
export type Refinar<T, R> = Omit<T, keyof R> & R
