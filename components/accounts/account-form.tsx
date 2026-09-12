'use client'

import { Card, CardContent } from '@/components/ui/card'

interface AccountFormProps {
  id?: string
}

export function AccountForm({ id }: AccountFormProps) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-sm text-muted-foreground">
          {id ? `Editando conta ${id}` : 'Formulário de nova conta — em breve'}
        </p>
      </CardContent>
    </Card>
  )
}
