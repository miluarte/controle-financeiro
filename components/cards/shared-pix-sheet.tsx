'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ListGroup } from '@/components/ios/list-group'
import { ListRow } from '@/components/ios/list-row'
import { ModalSheet } from '@/components/ios/modal-sheet'
import { useConfirmDelete } from '@/components/ios/use-delete-action'
import { useCardPeople } from '@/hooks/use-card-people'
import { useFamilyMembers } from '@/hooks/use-family'
import { sharedApi } from '@/lib/api/shared'
import { familyApi } from '@/lib/api/family'
import type { SharedDebt } from '@/lib/types'
import { formatCurrency, formatDate } from '@/lib/utils'
import { SharedSettlementSheet } from './shared-settlement-sheet'

// Um Pix dividido com uma pessoa: quanto falta, a parte de cada um e o acerto.
// Quem deve informa o acerto; quem pagou registra o que recebeu de quem não tem o app.
export function SharedPixSheet({ debt, onClose }: { debt: SharedDebt | null; onClose: () => void }) {
  const [paying, setPaying] = useState(false)
  const { me } = useCardPeople()
  const remove = useConfirmDelete()
  const canDelete = !!debt && (debt.payerId === me || debt.createdBy === me)
  return (
    <>
      <ModalSheet open={!!debt && !paying} onOpenChange={o => { if (!o) onClose() }} title="Pix dividido"
        onDelete={canDelete ? () => remove.ask({
          title: 'Excluir este Pix? Sai a parte de todas as pessoas.', label: 'Excluir',
          remove: async () => { await sharedApi.remove(debt!.sharedPaymentId); onClose() },
        }) : undefined}>
        {debt && <Body key={`${debt.sharedPaymentId}-${debt.debtorId}`} debt={debt} me={me} onPay={() => setPaying(true)} />}
      </ModalSheet>
      {remove.sheet}
      {debt && (
        <SharedSettlementSheet open={paying} onOpenChange={o => { setPaying(o); if (!o) onClose() }} debt={debt}
          mode={debt.debtorId === me ? 'report' : 'receive'} />
      )}
    </>
  )
}

function Body({ debt, me, onPay }: { debt: SharedDebt; me: string; onPay: () => void }) {
  const { nameOf } = useCardPeople()
  const members = useFamilyMembers()
  const id = debt.sharedPaymentId
  const { data: parts } = useSWR(['shared-parts', id], () => sharedApi.parts(id))
  const { data: settlements } = useSWR(['shared-settlements', id], () => sharedApi.settlements(id))
  const cancel = useConfirmDelete()
  const owe = debt.debtorId === me
  const payer = nameOf(debt.payerId)
  const debtor = nameOf(debt.debtorId)
  const paid = debt.open <= 0
  const toReport = Math.max(debt.open - debt.reported, 0)
  const guest = members.find(m => m.userId === debt.debtorId)?.isGuest ?? false
  // acerto que eu informei e quem pagou ainda não confirmou (um por vez: para informar outro, cancela este)
  const waiting = (settlements ?? []).filter(s => s.status === 'reported' && s.debtorId === me)

  return (
    <div className="space-y-6">
      <div className="text-center">
        <p className="text-large-title font-bold tabular-nums">{formatCurrency(paid ? debt.part : debt.open)}</p>
        <p className="text-subheadline text-muted-foreground">
          {owe ? (paid ? `Acertado com ${payer}` : `Você deve a ${payer}`) : (paid ? `${debtor} acertou` : `${debtor} te deve`)}
        </p>
        {!paid && debt.reported > 0 && (
          <Badge variant="warning" className="mt-2">{owe ? 'Aguardando confirmação' : 'Para confirmar'}</Badge>
        )}
        {!paid && debt.settled > 0 && (
          <p className="text-footnote text-muted-foreground">{formatCurrency(debt.settled)} já acertado de {formatCurrency(debt.part)}</p>
        )}
      </div>

      {owe && !paid && debt.reported === 0 && toReport > 0 && (
        <Button size="lg" className="w-full" onClick={onPay}>Informar acerto</Button>
      )}
      {!owe && guest && !paid && toReport > 0 && (
        <Button size="lg" className="w-full" onClick={onPay}>Registrar recebimento</Button>
      )}

      {waiting.length > 0 && (
        <ListGroup header="Aguardando confirmação" footer={`${payer} recebeu um aviso para confirmar.`}>
          {waiting.map(st => (
            <ListRow key={st.id} title={formatCurrency(st.amount)}
              subtitle={st.paidOn ? `Pago em ${formatDate(st.paidOn)}` : undefined}
              trailing={
                <Button type="button" variant="plain-destructive"
                  onClick={() => cancel.ask({ title: 'Cancelar este acerto?', label: 'Cancelar acerto', remove: () => familyApi.cancelSettlement(st.id) })}>
                  Cancelar
                </Button>
              } />
          ))}
        </ListGroup>
      )}
      {cancel.sheet}

      <ListGroup header={`${debt.place ?? 'Pix'} · ${formatDate(debt.date)}`}
        footer={`${payer === 'Você' ? 'Você pagou' : `${payer} pagou`} ${formatCurrency(debt.total)} por Pix.`}>
        {(parts ?? []).map(p => (
          <ListRow key={p.userId} title={nameOf(p.userId)}
            subtitle={p.userId === debt.payerId ? 'Pagou o Pix' : p.open <= 0 ? 'Acertado' : p.settled > 0 ? `Falta ${formatCurrency(p.open)}` : undefined}
            trailing={<span className="text-body tabular-nums text-foreground">{formatCurrency(p.part)}</span>} />
        ))}
      </ListGroup>
    </div>
  )
}
