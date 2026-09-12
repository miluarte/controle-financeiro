'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export function MonthlySummaryCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Resumo do mês</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">Em breve</p>
      </CardContent>
    </Card>
  )
}
