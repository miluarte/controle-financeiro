'use client'

import { useState } from 'react'
import {
  AddBoldIcon,
  AddLinearIcon,
  BillListLinearIcon,
  CartLargeMinimalisticLinearIcon,
  SafeSquareLinearIcon,
  WalletMoneyLinearIcon,
} from '@solar-icons/react'
import { BillFormSheet } from '@/components/bills/bill-form-sheet'
import { buttonVariants } from '@/components/ui/button'
import { QuickAddSheet, type QuickAddMode } from '@/components/transactions/quick-add-sheet'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { BillType } from '@/lib/types'
import { cn } from '@/lib/utils'
import { FabMenu } from './fab-menu'

type SolarIcon = React.ComponentType<{ className?: string }>

const QUICK: { mode: QuickAddMode; label: string; icon: SolarIcon }[] = [
  { mode: 'expense', label: 'Gasto',   icon: CartLargeMinimalisticLinearIcon },
  { mode: 'income',  label: 'Receita', icon: WalletMoneyLinearIcon },
  { mode: 'save',    label: 'Guardar', icon: SafeSquareLinearIcon },
]

const FIXED: { type: BillType; label: string; icon: SolarIcon }[] = [
  { type: 'expense', label: 'Conta fixa',   icon: BillListLinearIcon },
]

// Botão + da barra de abas (FabMenu, opções empilhadas acima) ou "Adicionar" no menu lateral do desktop (menu suspenso).
export function AddMenu({ variant = 'tab' }: { variant?: 'tab' | 'sidebar' }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [quick, setQuick] = useState<{ mode: QuickAddMode; n: number } | null>(null)
  const [quickOpen, setQuickOpen] = useState(false)
  const [billType, setBillType] = useState<BillType>('expense')
  const [billOpen, setBillOpen] = useState(false)

  function openQuick(mode: QuickAddMode) {
    // a chave nova recria o formulário já no tipo escolhido
    setQuick(q => ({ mode, n: (q?.n ?? 0) + 1 }))
    setQuickOpen(true)
  }

  function openBill(type: BillType) {
    setBillType(type)
    setBillOpen(true)
  }

  const Icon = menuOpen ? AddBoldIcon : AddLinearIcon

  // celular: opções empilhadas acima do + (de cima para baixo; Gasto fica mais perto do dedo)
  const fabItems = [
    ...FIXED.map(({ type, label, icon }) => ({ key: `bill-${type}`, label, icon, onSelect: () => openBill(type) })),
    ...[...QUICK].reverse().map(({ mode, label, icon }) => ({ key: mode, label, icon, onSelect: () => openQuick(mode) })),
  ]

  return (
    <>
      {variant === 'tab' ? <FabMenu items={fabItems} /> : (
      <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
        <DropdownMenuTrigger aria-label="Adicionar" className={cn(buttonVariants({ size: 'lg' }), 'w-full rounded-full')}>
          <Icon />Adicionar
        </DropdownMenuTrigger>
        <DropdownMenuContent side="bottom" align="start">
          <DropdownMenuGroup>
            <DropdownMenuLabel>Registrar</DropdownMenuLabel>
            {QUICK.map(({ mode, label, icon: ItemIcon }) => (
              <DropdownMenuItem key={mode} onClick={() => openQuick(mode)}>
                <ItemIcon />{label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuLabel>Todo mês</DropdownMenuLabel>
            {FIXED.map(({ type, label, icon: ItemIcon }) => (
              <DropdownMenuItem key={type} onClick={() => openBill(type)}>
                <ItemIcon />{label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
      )}

      {quick && (
        <QuickAddSheet key={quick.n} open={quickOpen} onOpenChange={setQuickOpen} initialMode={quick.mode} />
      )}
      <BillFormSheet open={billOpen} onOpenChange={setBillOpen} type={billType} />
    </>
  )
}
