'use client'

import { useState } from 'react'
import { InstallmentMonthlyChart } from './installment-monthly-chart'
import { InstallmentList } from './installment-list'

export function InstallmentView() {
  const [selectedMonth, setSelectedMonth] = useState<string | undefined>(undefined)

  return (
    <>
      <InstallmentMonthlyChart onMonthChange={setSelectedMonth} />
      <InstallmentList selectedMonth={selectedMonth} />
    </>
  )
}
