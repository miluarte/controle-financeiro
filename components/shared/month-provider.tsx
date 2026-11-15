'use client'

import { createContext, useState } from 'react'
import { currentMonth } from '@/lib/utils'

// NAV-2: mês escolhido, compartilhado entre Home, Contas, Transações e Análise.
export const MonthContext = createContext<{ month: string; setMonth: (m: string) => void }>({
  month: currentMonth(),
  setMonth: () => {},
})

export function MonthProvider({ children }: { children: React.ReactNode }) {
  const [month, setMonth] = useState(currentMonth)
  return <MonthContext.Provider value={{ month, setMonth }}>{children}</MonthContext.Provider>
}
