import { createContext, useContext } from 'react'

const TabActivaContext = createContext(true)

export const TabActivaProvider = TabActivaContext.Provider
export const useTabActiva = (): boolean => useContext(TabActivaContext)
