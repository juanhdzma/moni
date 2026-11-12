import type { CSSProperties } from 'react'
import { useModalStatus } from '../shell/ModalProvider'

export function FormStatus({ style = { marginTop: 8 } }: { style?: CSSProperties }) {
  const { cls, msg } = useModalStatus()
  return (
    <div className={'form-status' + (cls ? ' ' + cls : '')} id="m-status" style={style}>
      {msg}
    </div>
  )
}
