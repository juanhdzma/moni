import type { Meta } from '@/types'
import { get } from './client'

export const cargarMeta = () => get<Meta>('/api/meta')
