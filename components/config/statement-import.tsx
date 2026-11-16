'use client'

import { useEffect, useState } from 'react'
import { ListGroup } from '@/components/ios/list-group'
import { WalletPicker } from '@/components/shared/wallet-picker'
import { askPdfPassword, Reconcile } from '@/components/bills/reconcile-sheet'
import { useOwnWallets } from '@/hooks/use-data'
import { invoiceDueDate, invoiceRefDueIn } from '@/lib/invoice'
import { findDueDate, pdfLines } from '@/lib/statement'
import { LoadingDots } from '@/components/shared/loading-dots'

// Importar a fatura do cartão em PDF (o do app do banco ou o que chega por e-mail): escolhe o cartão
// e mostra as compras para adicionar, com quem fez cada uma quando o cartão é compartilhado.
export function StatementImport({ file }: { file: File }) {
  const { wallets } = useOwnWallets()
  const cards = wallets.filter(w => w.type === 'credit' && w.active)
  const [walletId, setWalletId] = useState<string | null>(null)
  const [due, setDue] = useState<string | null>(null)
  const [status, setStatus] = useState('Lendo o PDF…')
  const card = cards.find(w => w.id === walletId) ?? (cards.length === 1 ? cards[0] : undefined)

  useEffect(() => {
    let alive = true
    file.arrayBuffer().then(buf => pdfLines(buf, askPdfPassword)).then(lines => {
      if (!alive) return
      setDue(findDueDate(lines)); setStatus('')
    }).catch(() => alive && setStatus('Não consegui ler este PDF.'))
    return () => { alive = false }
  }, [file])

  if (status) return (
    <p className="flex flex-col items-center gap-3 px-4 py-6 text-center text-subheadline text-muted-foreground">
      {status.startsWith('Lendo') && <LoadingDots size="lg" />}{status}
    </p>
  )
  if (!cards.length) return <p className="px-4 text-center text-subheadline text-muted-foreground">Cadastre o cartão em Config &gt; Carteiras antes.</p>

  // vencimento lido no PDF; se não achar, usa a próxima fatura do cartão escolhido
  const dueDate = card ? (due ?? invoiceDueDate(card, invoiceRefDueIn(card, new Date().toISOString().slice(0, 7)))) : null
  const invoiceRef = card && dueDate ? invoiceRefDueIn(card, dueDate.slice(0, 7)) : null

  return (
    <div className="space-y-6">
      <ListGroup header="De qual cartão é esta fatura?">
        <WalletPicker wallets={cards} value={card?.id ?? null} onChange={setWalletId} />
      </ListGroup>
      {card && dueDate && invoiceRef && (
        <Reconcile key={card.id} wallet={card} invoiceRef={invoiceRef} dueDate={dueDate} initialFile={file} />
      )}
    </div>
  )
}
