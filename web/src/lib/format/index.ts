export * from './dinero'
export * from './fechas'
export * from './inputs'

export const errMsg = (e: unknown): string => (e instanceof Error ? e.message : String(e))
