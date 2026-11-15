import { LargeTitleHeader } from '@/components/ios/large-title-header'
import { AccountGroup } from '@/components/config/account-group'
import { ProfileCard } from '@/components/config/profile-card'

export default function ConfigPage() {
  return (
    <>
      <LargeTitleHeader title="Config" />
      <div className="space-y-7 px-4 pt-2">
        <ProfileCard />
        <AccountGroup />
      </div>
    </>
  )
}
