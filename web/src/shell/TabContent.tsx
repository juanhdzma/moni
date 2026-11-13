import type { ReactNode } from 'react'

export interface TabProps {
  active: boolean
}

export function TabContent({ id, active, legacy = true, children }: { id: string; active: boolean; legacy?: boolean; children?: ReactNode }) {
  return (
    <div id={`tab-${id}`} className={'tab-content' + (active ? ' active' : '') + (legacy ? ' legacy legacy-tab' : '')}>
      {children}
    </div>
  )
}
