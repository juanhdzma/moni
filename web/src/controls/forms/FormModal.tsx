import { createContext, useCallback, useContext, useRef, type ReactNode } from 'react'

type Registrar = (guardar: (() => void) | null) => void

const FormContext = createContext<Registrar | null>(null)

export const useRegistrarGuardado = (): Registrar | null => useContext(FormContext)

export function FormModal({ children }: { children: ReactNode }) {
  const guardar = useRef<(() => void) | null>(null)
  const registrar = useCallback<Registrar>((fn) => {
    guardar.current = fn
  }, [])
  return (
    <FormContext.Provider value={registrar}>
      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault()
          guardar.current?.()
        }}
      >
        {children}
      </form>
    </FormContext.Provider>
  )
}
