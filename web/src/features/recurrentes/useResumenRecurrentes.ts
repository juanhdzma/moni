import { cargarResumenRecurrentes } from '../../lib/api'
import { useVista } from '@/shell/hooks/useVista'

export const useResumenRecurrentes = () => useVista('rec', cargarResumenRecurrentes)
