import { Login } from './features/login'
import { OfertaFaceId } from './features/login/OfertaFaceId'
import { AuthProvider, useAuth } from './shell/AuthProvider'
import { CategoriasProvider } from './shell/CategoriasProvider'
import { DataProvider } from './shell/DataProvider'
import { ModalProvider } from './shell/ModalProvider'
import { Shell } from './shell/Shell'

function Gate() {
  const { fase } = useAuth()
  if (fase !== 'autenticado') return <Login />
  return (
    <DataProvider>
      <CategoriasProvider>
        <ModalProvider>
          <Shell />
          <OfertaFaceId />
        </ModalProvider>
      </CategoriasProvider>
    </DataProvider>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <Gate />
    </AuthProvider>
  )
}
