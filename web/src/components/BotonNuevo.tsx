import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function BotonNuevo({ label, onClick }: { label?: string; onClick: () => void }) {
  return (
    <Button size="sm" className="add-btn hidden md:inline-flex" onClick={onClick}>
      <Plus aria-hidden="true" />
      {label}
    </Button>
  )
}
