import { render, type RenderResult } from '@testing-library/react'
import type { ReactElement, ReactNode } from 'react'
import { CategoriasProvider } from '../shell/CategoriasProvider'
import { DataProvider } from '../shell/DataProvider'
import { ModalProvider } from '../shell/ModalProvider'
import type { Estado } from '../types'
import { estado as estadoVacio } from './factories'

export function Providers({ children, estado, loaded }: { children: ReactNode; estado?: Estado; loaded?: boolean }) {
  return (
    <DataProvider initialEstado={estado ?? estadoVacio()} initialLoaded={loaded ?? true}>
      <CategoriasProvider>
        <ModalProvider>{children}</ModalProvider>
      </CategoriasProvider>
    </DataProvider>
  )
}

export function renderWithProviders(ui: ReactElement, opts: { estado?: Estado; loaded?: boolean } = {}): RenderResult {
  return render(ui, { wrapper: ({ children }) => <Providers estado={opts.estado} loaded={opts.loaded}>{children}</Providers> })
}
