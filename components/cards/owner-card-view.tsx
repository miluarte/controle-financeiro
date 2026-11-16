'use client'

import { useMemo, useState } from 'react'
import useSWR from 'swr'
import { Button } from '@/components/ui/button'
import { ListGroup } from '@/components/ios/list-group'
import { InvoiceSheet, type InvoiceRef } from '@/components/bills/invoice-sheet'
import { MemberAvatar } from '@/components/family/member-avatar'
import { ProgressBar, toneFor } from '@/components/shared/progress-bar'
import { TransactionEditSheet } from '@/components/transactions/transaction-edit-sheet'
import { TransactionItem } from '@/components/transactions/transaction-item'
import { useCategories } from '@/hooks/use-categories'
import { useInvoices } from '@/hooks/use-data'
import { useFamily, useFamilyMembers, useSettlements } from '@/hooks/use-family'
import { useProfile } from '@/hooks/use-profile'
import { useSession } from '@/hooks/use-session'
import { transactionsApi } from '@/lib/api/transactions'
import { invoiceDueDate, openInvoiceRef } from '@/lib/invoice'
import type { FamilyMember, OwnWallet, Settlement, Transaction } from '@/lib/types'
import { formatCurrency, formatDate, monthName, todayIso } from '@/lib/utils'
import { ListRow } from '@/components/ios/list-row'
import { AssignSheet } from './assign-sheet'
import { ConfirmSettlementSheet } from './confirm-settlement-sheet'
import { SplitSheet } from './split-sheet'
import { InvoiceNavigator } from './invoice-navigator'
import { ShareCardGroup } from './share-card-group'
import { personStatementPdf, shareOrDownload } from '@/lib/person-statement-pdf'
import { useTransactionDelete } from '@/components/transactions/use-transaction-delete'

// CAR-5 e VIS-3: visão do titular. Fatura total, fatia de cada pessoa, limite, compras e compartilhamento.
export function OwnerCardView({ wallet }: { wallet: OwnWallet }) {
  const { session } = useSession()
  const { profile } = useProfile()
  const { family, status } = useFamily()
  const inFamily = !!family && status === 'active'
  const members = useFamilyMembers(inFamily)
  const { categories } = useCategories()
  const today = todayIso()
  const openRef = openInvoiceRef(wallet, today)
  const [ref, setRef] = useState(openRef)
  const [paying, setPaying] = useState<InvoiceRef | null>(null)
  const [assigning, setAssigning] = useState<Transaction | null>(null)
  const [editing, setEditing] = useState<Transaction | null>(null)
  const delTx = useTransactionDelete()
  const [splitting, setSplitting] = useState<Transaction | null>(null)
  const [confirming, setConfirming] = useState<Settlement | null>(null)
  const settlements = useSettlements(wallet.id)
  const { totals, paid } = useInvoices(today.slice(0, 7))
  const { data: purchases } = useSWR(['invoice-tx', wallet.id, ref], () => transactionsApi.getByInvoice(wallet.id, `${ref}-01`))
  const me = session?.user.id

  const people: FamilyMember[] = useMemo(() => {
    const self: FamilyMember = { userId: me ?? '', name: profile?.name || 'Você', avatarColor: profile?.avatarColor ?? 'gray', role: 'member', status: 'active', joinedAt: null }
    return [self, ...members.filter(m => m.status === 'active' && m.userId !== me)]
  }, [members, me, profile?.avatarColor, profile?.name])
  const nameOf = (id: string) => (id === me ? 'Você' : people.find(p => p.userId === id)?.name ?? 'Membro')

  const list = purchases ?? []
  const total = list.reduce((s, t) => s + t.amount, 0)
  const byPerson = new Map<string, number>()
  for (const t of list) byPerson.set(t.owner, (byPerson.get(t.owner) ?? 0) + t.amount)
  const settledBy = new Map<string, number>()
  for (const st of settlements) if (st.status === 'confirmed' && st.invoiceRef.slice(0, 7) === ref) settledBy.set(st.debtorId, (settledBy.get(st.debtorId) ?? 0) + st.amount)
  const reported = settlements.filter(st => st.status === 'reported')
  const paidAt = paid.find(p => p.walletId === wallet.id && p.refMonth.slice(0, 7) === ref)?.paidAt ?? null
  const closed = ref < openRef
  const shared = wallet.shareScope !== 'none'

  // limite usado: faturas ainda não pagas, da aberta em diante (inclui parcelas futuras)
  const used = totals
    .filter(t => t.walletId === wallet.id && t.invoiceRef.slice(0, 7) >= openRef)
    .filter(t => !paid.some(p => p.walletId === wallet.id && p.refMonth === t.invoiceRef && p.paidAt))
    .reduce((s, t) => s + t.total - t.prepaid, 0)
  const catById = new Map(categories.map(c => [c.id, c]))
  const due = invoiceDueDate(wallet, ref)

  // fatura só da pessoa (ex.: quem não tem o app) para ela conferir e pagar
  async function exportFor(id: string) {
    const person = people.find(p => p.userId === id)
    const blob = await personStatementPdf({
      cardName: wallet.name, cardLast4: wallet.last4, ownerName: profile?.name || 'titular',
      personName: id === me ? (profile?.name || 'você') : person?.name ?? 'Membro',
      invoiceRef: ref, dueDate: due, purchases: list.filter(t => t.owner === id),
    })
    await shareOrDownload(blob, `Fatura ${wallet.name} ${ref} - ${person?.name ?? 'membro'}.pdf`)
  }

  return (
    <div className="space-y-7">
      {delTx.sheet}
      <InvoiceNavigator value={ref} onChange={setRef}
        caption={`${paidAt ? `Paga em ${formatDate(paidAt)}` : closed ? 'Fechada' : ref === openRef ? 'Aberta' : 'Futura'} · vence ${formatDate(due)}`} />

      <section className="space-y-3 rounded-3xl bg-grouped p-4">
        <div className="text-center">
          <p className="text-large-title font-bold tabular-nums">{formatCurrency(total)}</p>
          <p className="text-footnote text-muted-foreground">{list.length} {list.length === 1 ? 'compra' : 'compras'}</p>
        </div>
        {shared && byPerson.size > 0 && (
          <ul className="space-y-2 border-t border-separator pt-3">
            {[...byPerson.entries()].sort((a, b) => b[1] - a[1]).map(([id, v]) => {
              const p = people.find(x => x.userId === id)
              return (
                <li key={id} className="flex items-center gap-2">
                  <MemberAvatar name={p?.name ?? 'M'} color={p?.avatarColor ?? 'gray'} size="sm" />
                  <span className="flex-1 text-subheadline">
                    {nameOf(id)}
                    {settledBy.get(id) ? <span className="text-footnote text-success"> · {formatCurrency(settledBy.get(id)!)} acertado</span> : null}
                  </span>
                  <span className="text-subheadline font-semibold tabular-nums">{formatCurrency(v)}</span>
                  <Button variant="plain" size="nav" aria-label={`Fatura de ${nameOf(id)} em PDF`} onClick={() => exportFor(id)}>PDF</Button>
                </li>
              )
            })}
          </ul>
        )}
        {!paidAt && total > 0 && (
          <Button size="lg" className="w-full"
            onClick={() => setPaying({ wallet, ref, dueDate: due, total, paidAt })}>
            Pagar fatura
          </Button>
        )}
      </section>

      {reported.length > 0 && (
        <ListGroup header="Pagamentos para confirmar">
          {reported.map(st => (
            <ListRow key={st.id} onClick={() => setConfirming(st)} chevron
              leading={<MemberAvatar name={nameOf(st.debtorId)} color={people.find(p => p.userId === st.debtorId)?.avatarColor ?? 'gray'} />}
              title={`${nameOf(st.debtorId)} pagou ${formatCurrency(st.amount)}`}
              subtitle={`Fatura de ${monthName(st.invoiceRef.slice(0, 7))}`} />
          ))}
        </ListGroup>
      )}

      {wallet.spendingLimit ? (
        <section className="space-y-2 rounded-3xl bg-grouped p-4">
          <div className="flex justify-between text-subheadline">
            <span className="text-muted-foreground">Limite usado</span>
            <span className="font-semibold tabular-nums">{formatCurrency(used)} de {formatCurrency(wallet.spendingLimit)}</span>
          </div>
          <ProgressBar value={used / wallet.spendingLimit} tone={toneFor(used / wallet.spendingLimit)} />
          <p className="text-footnote text-muted-foreground">Disponível: {formatCurrency(wallet.spendingLimit - used)}</p>
        </section>
      ) : null}

      <ListGroup header="Compras" footer={shared && !paidAt ? 'Toque para dizer de quem é.' : undefined}>
        {list.length === 0 && <li className="p-4 text-center text-subheadline text-muted-foreground">Nenhuma compra nesta fatura.</li>}
        {list.map(t => (
          <TransactionItem key={t.id} transaction={t}
            category={t.categoryId ? catById.get(t.categoryId) : undefined}
            note={shared ? `de ${nameOf(t.owner)}` : undefined}
            onClick={() => (shared && !paidAt ? setAssigning(t) : t.owner === me ? setEditing(t) : undefined)}
            onDelete={() => delTx.ask(t)} />
        ))}
      </ListGroup>

      {inFamily && <ShareCardGroup wallet={wallet} scope={wallet.shareScope} members={members.filter(m => m.userId !== me && m.status === 'active')} />}


      <InvoiceSheet invoice={paying} onClose={() => setPaying(null)} />
      <AssignSheet transaction={assigning} people={people} me={me} onClose={() => setAssigning(null)}
        onSplit={t => { setAssigning(null); setSplitting(t) }} />
      <SplitSheet transaction={splitting} people={people} me={me} onClose={() => setSplitting(null)} />
      <ConfirmSettlementSheet settlement={confirming} debtorName={confirming ? nameOf(confirming.debtorId) : ''} onClose={() => setConfirming(null)} />
      <TransactionEditSheet transaction={editing} onClose={() => setEditing(null)} />
    </div>
  )
}
