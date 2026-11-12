import { within } from '@testing-library/react'
import { expect } from 'vitest'

export function expectLabels(container: HTMLElement, labels: Record<string, string>): void {
  for (const [text, id] of Object.entries(labels)) {
    expect(within(container).getByLabelText(text).id).toBe(id)
  }
}

export const modalBody = (): HTMLElement => document.getElementById('modal-body') as HTMLElement
