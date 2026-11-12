import { CategoriasProvider } from './shell/CategoriasProvider'
import { DataProvider } from './shell/DataProvider'
import { ModalProvider } from './shell/ModalProvider'
import { Shell } from './shell/Shell'

export default function App() {
  return (
    <DataProvider>
      <CategoriasProvider>
        <ModalProvider>
          <Shell />
        </ModalProvider>
      </CategoriasProvider>
    </DataProvider>
  )
}
