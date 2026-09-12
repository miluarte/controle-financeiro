import { BottomNav } from './bottom-nav'

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <main className="flex-1 overflow-y-auto pb-16">{children}</main>
      <BottomNav />
    </div>
  )
}
