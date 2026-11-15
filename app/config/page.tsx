import { PageHeader } from '@/components/layout/page-header'
import { ProfileCard } from '@/components/config/profile-card'
import { SignOutButton } from '@/components/config/sign-out-button'

export default function ConfigPage() {
  return (
    <>
      <PageHeader title="Config" />
      <div className="space-y-6 p-4">
        <ProfileCard />
        <section className="space-y-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Conta</h2>
          <SignOutButton />
        </section>
      </div>
    </>
  )
}
