import { render, type RenderResult } from '@testing-library/react'
import type { ReactElement, ReactNode } from 'react'
import { CategoriasProvider } from '../shell/CategoriasProvider'
import { DataProvider } from '../shell/DataProvider'
import { ModalProvider } from '../shell/ModalProvider'
import type { Estado } from '../types'
import { estado as estadoVacio } from './factories'

export function Providers({ children, estado }: { children: ReactNode; estado?: Estado }) {
  return (
    <DataProvider initialEstado={estado ?? estadoVacio()}>
      <CategoriasProvider>
        <ModalProvider>{children}</ModalProvider>
      </CategoriasProvider>
    </DataProvider>
  )
}

export function renderWithProviders(ui: ReactElement, opts: { estado?: Estado } = {}): RenderResult {
  return render(ui, { wrapper: ({ children }) => <Providers estado={opts.estado}>{children}</Providers> })
}
