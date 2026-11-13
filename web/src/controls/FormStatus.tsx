import type { CSSProperties } from 'react'
import { CircleAlert, CircleCheck } from 'lucide-react'
import { useModalStatus } from '../shell/ModalProvider'

export function FormStatus({ style = { marginTop: 12 } }: { style?: CSSProperties }) {
  const { cls, msg } = useModalStatus()
  const Icon = cls === 'err' ? CircleAlert : cls === 'ok' ? CircleCheck : null
  return (
    <div className={'form-status flex items-start gap-1.5' + (cls ? ' ' + cls : '')} id="m-status" role={cls === 'err' ? 'alert' : undefined} style={style}>
      {Icon && msg && <Icon aria-hidden="true" className="mt-0.5 size-4 shrink-0" />}
      {msg}
    </div>
  )
}
