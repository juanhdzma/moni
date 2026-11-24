import { Login, ActivarDispositivo } from '../features/login'
import { AuthProvider, useAuth } from '@/shell/providers/AuthProvider'
import { DataProvider } from '@/shell/providers/DataProvider'
import { ModalProvider } from '@/shell/providers/ModalProvider'
import { Shell } from '../shell/layout/Shell'

function Gate() {
  const { fase } = useAuth()
  if (fase !== 'autenticado') return <Login />
  return (
    <DataProvider>
      <ModalProvider>
        <Shell />
        <ActivarDispositivo />
      </ModalProvider>
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
