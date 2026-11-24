'use client'

import { useState } from 'react'
import {
  CameraLinearIcon, CartLargeMinimalisticLinearIcon, SafeSquareLinearIcon, WalletMoneyLinearIcon,
} from '@solar-icons/react'
import { cva } from 'class-variance-authority'
import { QuickAddSheet, type QuickAddMode } from '@/components/transactions/quick-add-sheet'

type SolarIcon = React.ComponentType<{ className?: string }>

const ACTIONS: { mode: QuickAddMode; label: string; icon: SolarIcon }[] = [
  { mode: 'expense', label: 'Gasto', icon: CartLargeMinimalisticLinearIcon },
  { mode: 'income', label: 'Receita', icon: WalletMoneyLinearIcon },
  { mode: 'save', label: 'Guardar', icon: SafeSquareLinearIcon },
]

const action = cva('flex w-18 shrink-0 cursor-pointer flex-col items-center gap-2 text-center text-footnote font-medium active:opacity-60')
const circle = cva('flex size-16 items-center justify-center rounded-full bg-grouped text-tint [&_svg]:size-7')

// Atalhos do Início em círculos: os mesmos do botão +, com alvo maior.
export function QuickActions() {
  const [quick, setQuick] = useState<{ mode: QuickAddMode; n: number; receipt?: File } | null>(null)
  const [open, setOpen] = useState(false)

  function start(mode: QuickAddMode, receipt?: File) {
    setQuick(q => ({ mode, n: (q?.n ?? 0) + 1, receipt }))
    setOpen(true)
  }

  return (
    <>
      <nav aria-label="Adicionar" className="-mx-4 flex justify-between gap-2 overflow-x-auto px-4 sm:justify-start sm:gap-4">
        <label className={action()}>
          <span className={circle()}><CameraLinearIcon /></span>
          Ler nota fiscal
          <input type="file" accept="image/*" className="sr-only"
            onChange={e => { const file = e.target.files?.[0]; e.target.value = ''; if (file) start('expense', file) }} />
        </label>
        {ACTIONS.map(({ mode, label, icon: Icon }) => (
          <button key={mode} type="button" className={action()} onClick={() => start(mode)}>
            <span className={circle()}><Icon /></span>
            {label}
          </button>
        ))}
      </nav>
      {quick && (
        <QuickAddSheet key={quick.n} open={open} onOpenChange={setOpen} initialMode={quick.mode} initialReceipt={quick.receipt} />
      )}
    </>
  )
}
