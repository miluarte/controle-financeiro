'use client'

import { Card, CardContent } from '@/components/ui/card'

interface TransactionFormProps {
  id?: string
}

export function TransactionForm({ id }: TransactionFormProps) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-sm text-muted-foreground">
          {id ? `Editando transação ${id}` : 'Formulário de nova transação — em breve'}
        </p>
      </CardContent>
    </Card>
  )
}
