import { AccountGroup } from '@/components/config/account-group'
import { DataGroup } from '@/components/config/data-group'
import { AppearanceGroup, RegistryGroup } from '@/components/config/preferences-groups'
import { ProfileCard } from '@/components/config/profile-card'
import { FamilyGroup, NotificationsGroup } from '@/components/config/v2-groups'
import { LargeTitleHeader } from '@/components/ios/large-title-header'

// 5.15: estrutura de Config. Automações e segurança (Face ID) ainda não existem.
export default function ConfigPage() {
  return (
    <>
      <LargeTitleHeader title="Config" />
      <div className="space-y-7 px-4 pt-2">
        <ProfileCard />
        <AppearanceGroup />
        <RegistryGroup />
        <FamilyGroup />
        <NotificationsGroup />
        <DataGroup />
        <AccountGroup />
      </div>
    </>
  )
}
