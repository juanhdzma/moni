import type { ReactNode } from 'react'

export interface TabProps {
  active: boolean
}

export function TabContent({ id, active, children }: { id: string; active: boolean; children?: ReactNode }) {
  return (
    <div id={`tab-${id}`} className={'tab-content' + (active ? ' active block' : ' hidden')}>
      {children}
    </div>
  )
}
