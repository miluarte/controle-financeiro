'use client'

import { LockKeyholeLinearIcon } from '@solar-icons/react'
import { SecurityGroup } from '@/components/config/security-group'
import { OnboardingStep, StepIcon } from './onboarding-step'

// Bloqueio com Face ID neste aparelho.
export function SecurityStep() {
  return (
    <OnboardingStep icon={<StepIcon><LockKeyholeLinearIcon /></StepIcon>} title="Face ID"
      text="Peça o Face ID para abrir o Troco.">
      <SecurityGroup />
    </OnboardingStep>
  )
}
