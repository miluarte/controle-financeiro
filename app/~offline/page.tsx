import type { Metadata } from 'next'
import { WiFiCrossBoldDuotoneIcon } from '@solar-icons/react'
import { PageHeader } from '@/components/layout/page-header'
import { Card, CardContent } from '@/components/ui/card'

export const metadata: Metadata = {
  title: 'Sem conexão',
}

export default function OfflinePage() {
  return (
    <>
      <PageHeader title="Sem conexão" />
      <div className="p-4">
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
            <WiFiCrossBoldDuotoneIcon className="h-10 w-10 text-muted-foreground" />
            <p className="font-medium">Você está offline</p>
            <p className="text-sm text-muted-foreground">
              Esta página ainda não foi carregada antes. Conecte-se à internet e tente novamente.
            </p>
          </CardContent>
        </Card>
      </div>
    </>
  )
}
