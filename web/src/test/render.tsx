import { render, type RenderResult } from '@testing-library/react'
import type { ReactElement, ReactNode } from 'react'
import { AuthProvider } from '@/shell/providers/AuthProvider'
import { CategoriasProvider } from '@/shell/providers/CategoriasProvider'
import { DataProvider } from '@/shell/providers/DataProvider'
import { ModalProvider } from '@/shell/providers/ModalProvider'
import type { EstadoAuth } from '../lib/seguridad/auth'
import type { Estado } from '../types'
import { estado as estadoVacio } from './factories'

export const ESTADO_AUTENTICADO: EstadoAuth = { configurado: true, autenticado: true, passkeys: 0, bloqueada: false }

export function Providers({ children, estado, loaded }: { children: ReactNode; estado?: Estado; loaded?: boolean }) {
  return (
    <AuthProvider initialEstado={ESTADO_AUTENTICADO}>
      <DataProvider initialEstado={estado ?? estadoVacio()} initialLoaded={loaded ?? true}>
        <CategoriasProvider>
          <ModalProvider>{children}</ModalProvider>
        </CategoriasProvider>
      </DataProvider>
    </AuthProvider>
  )
}

export function renderWithProviders(ui: ReactElement, opts: { estado?: Estado; loaded?: boolean } = {}): RenderResult {
  return render(ui, { wrapper: ({ children }) => <Providers estado={opts.estado} loaded={opts.loaded}>{children}</Providers> })
}
