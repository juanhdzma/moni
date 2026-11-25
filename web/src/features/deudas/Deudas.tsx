import { PartyPopper, Plus, CreditCard } from 'lucide-react'
import { EmptyCard } from '@/components/EmptyCard'
import { Panel, Resumen } from '@/components/panel'
import { Button } from '@/components/ui/button'
import { cargarResumenDeudas } from '@/lib/api'
import { useMoneda } from '@/shell/hooks/useMoneda'
import { useData } from '@/shell/providers/DataProvider'
import { useOpenerCtx } from '@/shell/hooks/openers'
import { TabContent, type TabProps } from '@/shell/layout/TabContent'
import { useVista } from '@/shell/hooks/useVista'
import { DEPENDENCIAS_DE_VISTA } from '@/shell/invalidacion'
import { PrestamoCard, TarjetaCard, Terminada } from './DeudaCards'
import { openDeudaForm } from './forms/openers'

export function Deudas({ active }: TabProps) {
  const { cop } = useMoneda()
  const ctx = useOpenerCtx()
  const { loaded: cargado } = useData()
  const { data } = useVista('deudas', cargarResumenDeudas, DEPENDENCIAS_DE_VISTA.resumenDeudas)
  const loaded = cargado && data !== null
  const total = data?.total ?? 0
  const creditos = data?.creditos ?? []
  const tarjetas = data?.tarjetas ?? []
  const terminadas = data?.terminadas ?? []

  return (
    <TabContent id="deudas" active={active}>
      <div className="space-y-4">
        <Resumen
          id="deudas-total"
          titulo="Lo que debés"
          loaded={loaded}
          valor={cop(total)}
          valorClassName="text-deudas"
          color="bg-deudas"
          segmentos={data?.segmentos ?? []}
          dato={
            data && (
              <span className="text-muted-foreground">
                <strong className="font-semibold text-foreground">{data.dato.cuotas}</strong>
                {data.dato.cuotas_sufijo}
                {data.dato.intereses && (
                  <>
                    {' · '}
                    <strong className="font-semibold text-deudas">{data.dato.intereses}</strong> {data.dato.intereses_sufijo}
                  </>
                )}
              </span>
            )
          }
          extra={
            <Button size="sm" className="add-btn hidden md:inline-flex" onClick={() => openDeudaForm(ctx)}>
              <Plus aria-hidden="true" />
              Nueva deuda
            </Button>
          }
        />
        <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
          <Panel id="deudas-creditos" titulo="Créditos">
            <div id="deudas-grid-credito" className="space-y-3">
              {loaded &&
                (creditos.length ? (
                  creditos.map((d) => <PrestamoCard key={d.id} d={d} />)
                ) : data && (
                  <EmptyCard
                    icono={<PartyPopper aria-hidden="true" className="size-6" />}
                    titulo={data.texto_vacio_creditos.titulo}
                    texto={data.texto_vacio_creditos.texto}
                  />
                ))}
            </div>
          </Panel>
          <Panel id="deudas-tarjetas" titulo="Tarjetas">
            <div id="deudas-grid-tarjeta" className="space-y-3">
              {loaded &&
                (tarjetas.length ? (
                  tarjetas.map((d) => <TarjetaCard key={d.id} d={d} />)
                ) : data && (
                  <EmptyCard
                    icono={<CreditCard aria-hidden="true" className="size-6" />}
                    titulo={data.texto_vacio_tarjetas.titulo}
                    texto={data.texto_vacio_tarjetas.texto}
                  />
                ))}
            </div>
          </Panel>
        </div>
        <div id="deudas-terminados">
          {loaded && terminadas.length > 0 && (
            <Panel id="deudas-terminadas" titulo="Préstamos terminados">
              <div className="grid gap-3 md:grid-cols-2">
                {terminadas.map((d) => (
                  <Terminada key={d.id} d={d} />
                ))}
              </div>
            </Panel>
          )}
        </div>
      </div>
    </TabContent>
  )
}
