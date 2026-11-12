import { Component, type ReactNode } from 'react'
import { TabContent } from './TabContent'

interface Props {
  name: string
  active: boolean
  resetKeys: unknown[]
  onFail: (name: string) => void
  children: ReactNode
}

export class TabBoundary extends Component<Props, { failed: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(err: unknown) {
    console.error(`render ${this.props.name} falló:`, err)
    this.props.onFail(this.props.name)
  }

  componentDidUpdate(prev: Props) {
    if (this.state.failed && prev.resetKeys.some((k, i) => k !== this.props.resetKeys[i])) this.setState({ failed: false })
  }

  render() {
    if (this.state.failed) return <TabContent id={this.props.name} active={this.props.active} />
    return this.props.children
  }
}
