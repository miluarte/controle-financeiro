import { BottomNav } from './bottom-nav'

// Respeita as áreas seguras do iPhone (notch em cima, indicador de início embaixo).
export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <main className="flex-1 pt-[env(safe-area-inset-top)] pb-[calc(var(--spacing-tabbar)+env(safe-area-inset-bottom)+1.5rem)]">
        {children}
      </main>
      <BottomNav />
    </div>
  )
}
