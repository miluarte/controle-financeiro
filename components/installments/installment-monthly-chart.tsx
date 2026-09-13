'use client'

import { useEffect, useMemo, useState } from 'react'
import { useInstallments } from '@/hooks/use-installments'
import { formatCurrency, effectivePaidCount } from '@/lib/utils'
import { AltArrowLeftBoldDuotoneIcon, AltArrowRightBoldDuotoneIcon } from '@solar-icons/react'

const FULL_MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]
const SHORT_MONTH_NAMES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

function addMonths(dateStr: string, n: number): string {
  // startDate às vezes vem como timestamp ISO completo da planilha
  // (2026-09-10T00:00:00.000Z) em vez de só "2026-09-10" — pegar os
  // 10 primeiros caracteres cobre os dois formatos.
  const d = new Date(dateStr.slice(0, 10) + 'T12:00:00')
  d.setMonth(d.getMonth() + n)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function shortMonthLabel(ym: string): string {
  const [, month] = ym.split('-')
  return SHORT_MONTH_NAMES[parseInt(month) - 1]
}

function fullMonthLabel(ym: string): string {
  const [year, month] = ym.split('-')
  return `${FULL_MONTH_NAMES[parseInt(month) - 1]} ${year}`
}

function currentYM(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

// Separa "R$ 1.024,35" em { main: "R$ 1.024", cents: "35" } pra exibir os
// centavos como sobrescrito, menor que o valor principal.
function splitCurrency(value: number): { main: string; cents: string } {
  const formatted = formatCurrency(value)
  const lastComma = formatted.lastIndexOf(',')
  if (lastComma === -1) return { main: formatted, cents: '00' }
  return { main: formatted.slice(0, lastComma), cents: formatted.slice(lastComma + 1) }
}

// Rótulo compacto do eixo, sem centavos: "R$ 3.441"
function axisLabel(value: number): string {
  return `R$ ${Math.round(value / 100).toLocaleString('pt-BR')}`
}

const TRACK_HEIGHT = 132 // px
const MIN_FILL_HEIGHT = 22 // px
const WINDOW_SIZE = 8

interface InstallmentMonthlyChartProps {
  onMonthChange?: (ym: string) => void
}

export function InstallmentMonthlyChart({ onMonthChange }: InstallmentMonthlyChartProps) {
  const { groups, loading } = useInstallments()
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)

  const monthlyTotals = useMemo(() => {
    const totals: Record<string, number> = {}

    for (const group of groups) {
      if (group.status !== 'active') continue

      const paidCount = effectivePaidCount(group.paidCount, group.installmentCount, group.startDate)
      const remaining = group.installmentCount - paidCount
      if (remaining <= 0) continue

      // primeira parcela não paga = startDate + paidCount meses
      for (let i = 0; i < remaining; i++) {
        const ym = addMonths(group.startDate, paidCount + i)
        totals[ym] = (totals[ym] ?? 0) + group.installmentAmount
      }
    }

    return totals
  }, [groups])

  const months = useMemo(() => Object.keys(monthlyTotals).sort(), [monthlyTotals])

  const defaultIndex = useMemo(() => {
    if (months.length === 0) return 0
    const today = currentYM()
    const exact = months.indexOf(today)
    if (exact !== -1) return exact
    const next = months.findIndex(m => m >= today)
    return next === -1 ? months.length - 1 : next
  }, [months])

  const index = loading || months.length === 0 ? 0 : Math.min(selectedIndex ?? defaultIndex, months.length - 1)
  const selectedYm = months[index] ?? null

  useEffect(() => {
    if (selectedYm) onMonthChange?.(selectedYm)
  }, [selectedYm, onMonthChange])

  if (loading || months.length === 0) return null
  const selectedValue = monthlyTotals[selectedYm]
  const maxValue = Math.max(...months.map(m => monthlyTotals[m]))
  const { main, cents } = splitCurrency(selectedValue)

  // Janela de até 8 meses ao redor do mês selecionado, deslizando conforme navega.
  const windowStart = Math.max(
    0,
    Math.min(index - Math.floor(WINDOW_SIZE / 2), months.length - WINDOW_SIZE),
  )
  const visibleMonths = months.slice(windowStart, windowStart + WINDOW_SIZE)

  function goTo(newIndex: number) {
    setSelectedIndex(Math.max(0, Math.min(newIndex, months.length - 1)))
  }

  return (
    <div className="mb-4 rounded-xl border bg-card p-5">
      <div>
        <p className="text-sm text-muted-foreground">Total até o momento</p>
        <p className="mt-1 text-3xl font-bold leading-none tracking-tight">
          {main}
          <sup className="ml-0.5 text-base font-semibold">{cents}</sup>
        </p>
      </div>

      <div className="mt-6 flex items-end gap-2">
        <div className="flex h-[132px] flex-col justify-between pb-5 pr-2 text-right text-xs text-muted-foreground">
          <span>{axisLabel(maxValue)}</span>
          <span>{axisLabel(maxValue / 2)}</span>
        </div>

        <div className="relative flex-1">
          <div className="pointer-events-none absolute inset-x-0 top-0 flex h-[132px] flex-col justify-between">
            <div className="border-t border-dashed border-muted-foreground/25" />
            <div className="border-t border-dashed border-muted-foreground/25" />
          </div>

          <div className="flex items-end justify-between gap-2">
            {visibleMonths.map(ym => {
              const value = monthlyTotals[ym]
              const fillHeight = Math.max(MIN_FILL_HEIGHT, Math.round((value / maxValue) * TRACK_HEIGHT))
              const isSelected = ym === selectedYm

              return (
                <button
                  key={ym}
                  type="button"
                  onClick={() => goTo(months.indexOf(ym))}
                  className="flex min-w-0 flex-1 flex-col items-center gap-1.5"
                >
                  <div
                    className="relative w-full max-w-9 overflow-hidden rounded-full bg-muted"
                    style={{ height: TRACK_HEIGHT }}
                  >
                    <div
                      className={`absolute inset-x-0 bottom-0 rounded-full transition-all ${
                        isSelected ? 'bg-foreground' : 'bg-foreground/25'
                      }`}
                      style={{ height: fillHeight }}
                    />
                  </div>
                  {isSelected && (
                    <div className="size-0 border-x-4 border-t-4 border-x-transparent border-t-foreground" />
                  )}
                  <span
                    className={`text-[10px] leading-none ${
                      isSelected ? 'font-semibold text-foreground' : 'text-muted-foreground'
                    }`}
                  >
                    {shortMonthLabel(ym)}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <button
          type="button"
          onClick={() => goTo(index - 1)}
          disabled={index === 0}
          className="flex size-9 items-center justify-center rounded-full bg-muted text-foreground disabled:opacity-30"
        >
          <AltArrowLeftBoldDuotoneIcon className="size-4" />
        </button>
        <span className="text-base font-semibold">{fullMonthLabel(selectedYm)}</span>
        <button
          type="button"
          onClick={() => goTo(index + 1)}
          disabled={index === months.length - 1}
          className="flex size-9 items-center justify-center rounded-full bg-muted text-foreground disabled:opacity-30"
        >
          <AltArrowRightBoldDuotoneIcon className="size-4" />
        </button>
      </div>
    </div>
  )
}
