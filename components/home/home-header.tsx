'use client'

import { useProfile } from '@/hooks/use-profile'
import { greeting } from '@/lib/utils'

export function HomeHeader() {
  const { profile } = useProfile()
  return (
    <header className="px-4 pt-6 pb-2">
      <p className="text-sm text-muted-foreground">{greeting()},</p>
      <h1 className="text-2xl font-semibold">{profile?.name || ' '}</h1>
    </header>
  )
}
