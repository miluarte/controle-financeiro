'use client'

import { useState } from 'react'
import { ChartSquareLinearIcon, CheckCircleLinearIcon, WalletMoneyLinearIcon } from '@solar-icons/react'
import { billsApi } from '@/lib/api/bills'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FormRow } from '@/components/ios/form-row'
import { ListGroup } from '@/components/ios/list-group'
import { StepDots } from '@/components/ios/step-dots'
import { AppLogo } from '@/components/shared/app-logo'
import { CurrencyInput } from '@/components/shared/currency-input'
import { useProfile } from '@/hooks/use-profile'
import { useRefresh } from '@/hooks/use-refresh'
import { useSession } from '@/hooks/use-session'
import { analysisApi } from '@/lib/api/analysis'
import { profileApi } from '@/lib/api/profile'
import { addMonths, currentMonth, todayIso } from '@/lib/utils'
import { CardsStep } from './cards-step'
import { IncomeStep, type IncomeDraft } from './income-step'
import { SecurityStep } from './security-step'
import { NotificationsStep } from './notifications-step'
import { OnboardingStep, StepIcon } from './onboarding-step'
import { ButtonRow } from '@/components/ios/button-row'

const STEPS = ['welcome', 'name', 'cards', 'income', 'budget', 'notifications', 'security', 'done'] as const

const HIGHLIGHTS = [
  { title: 'Registro em segundos', text: 'Pelo +, pela foto da nota ou sozinho pelo Apple Pay.' },
  { title: 'Contas e faturas', text: 'Contas e receitas fixas, parcelas e a fatura conferida pelo PDF.' },
  { title: 'Análise do mês', text: 'Orçamento, ritmo, metas e objetivos.' },
  { title: 'Família', text: 'Compartilhe cartões. Cada pessoa vê só o que é seu.' },
]

const TIPS = [
  'Toque no + para registrar um gasto ou uma receita, avulsos ou fixos.',
  'Já tem compras parceladas? No gasto, informe a parcela atual.',
  'Apple Pay e toque duplo: Ajustes > Automações.',
]

// Passo a passo para quem acabou de criar a conta. Tudo depois das boas-vindas pode ser pulado.
export function OnboardingFlow() {
  const { session } = useSession()
  const { profile } = useProfile()
  const refresh = useRefresh()
  const [i, setI] = useState(0)
  const [name, setName] = useState(profile?.name ?? '')
  const [budget, setBudget] = useState(0)
  const [income, setIncome] = useState<IncomeDraft>({ name: 'Salário', amount: 0, day: 5 })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const step = STEPS[i]
  const month = currentMonth()

  async function finish() {
    setBusy(true)
    try {
      await profileApi.update(profile!.id, { onboarding_completed_at: new Date().toISOString() })
      await refresh()
    } finally { setBusy(false) }
  }

  // Salva o que a etapa pediu e avança.
  async function next() {
    setError(null)
    setBusy(true)
    try {
      if (step === 'name' && name.trim() && name.trim() !== profile?.name) {
        await profileApi.update(profile!.id, { name: name.trim() })
      }
      if (step === 'income' && income.amount > 0) {
        await billsApi.create({
          type: 'income', name: income.name.trim() || 'Salário', amount: income.amount, dueDay: income.day, dueNextMonth: false,
          categoryId: null, recurring: true,
          // dia de receber que já passou: este mês provavelmente já caiu, começa no próximo
          startMonth: `${income.day < Number(todayIso().slice(8, 10)) ? addMonths(month, 1) : month}-01`, installmentCurrent: null, installmentsTotal: null, endMonth: null,
        })
      }
      if (step === 'budget' && budget > 0) {
        await analysisApi.setBudget(session!.user.id, month, budget)
      }
      if (step === 'done') { await finish(); return }
      await refresh()
      setI(i + 1)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível salvar.')
    } finally { setBusy(false) }
  }

  const skip = () => { setError(null); setI(i + 1) }
  const optional = step !== 'welcome' && step !== 'done' && step !== 'name'
  const nextLabel = step === 'welcome' ? 'Começar' : step === 'done' ? 'Começar a usar' : 'Continuar'

  return (
    <div className="flex min-h-dvh flex-col px-4 lg:mx-auto lg:w-full lg:max-w-md lg:py-12 pt-safe-top-page pb-safe-bottom-page">
      <div className="flex items-center justify-between">
        <span className="w-16" />
        <StepDots step={i} total={STEPS.length} />
        {step !== 'done' ? (
          <button type="button" onClick={finish} className="w-16 text-right text-body text-muted-foreground" disabled={busy}>
            Sair
          </button>
        ) : <span className="w-16" />}
      </div>

      <div className="flex-1 overflow-y-auto py-8">
        {step === 'welcome' && (
          <OnboardingStep icon={<AppLogo size="lg" />} title="Boas-vindas ao Troco"
            text="Seu dinheiro, mês a mês.">
            <ListGroup>
              {HIGHLIGHTS.map(h => (
                <li key={h.title} className="border-b border-separator px-4 py-3 last:border-b-0">
                  <p className="text-headline">{h.title}</p>
                  <p className="text-subheadline text-muted-foreground">{h.text}</p>
                </li>
              ))}
            </ListGroup>
          </OnboardingStep>
        )}

        {step === 'name' && (
          <OnboardingStep icon={<StepIcon><WalletMoneyLinearIcon /></StepIcon>} title="Qual é o seu nome?"
            text="Seu nome aparece na saudação.">
            <ListGroup>
              <FormRow label="Nome" htmlFor="ob-name">
                <Input id="ob-name" variant="bare" value={name} onChange={e => setName(e.target.value)} placeholder="Seu nome" className="text-right" />
              </FormRow>
            </ListGroup>
          </OnboardingStep>
        )}

        {step === 'cards' && <CardsStep />}

        {step === 'income' && <IncomeStep value={income} onChange={setIncome} />}

        {step === 'budget' && (
          <OnboardingStep icon={<StepIcon><ChartSquareLinearIcon /></StepIcon>} title="Orçamento do mês"
            text="Quanto quer gastar este mês?">
            <CurrencyInput id="ob-budget" aria-label="Orçamento do mês" variant="display" value={budget} onChange={setBudget} />
            <p className="text-center text-footnote text-muted-foreground">Pode definir depois na Análise.</p>
          </OnboardingStep>
        )}

        {step === 'notifications' && <NotificationsStep />}

        {step === 'security' && <SecurityStep />}

        {step === 'done' && (
          <OnboardingStep icon={<StepIcon><CheckCircleLinearIcon /></StepIcon>} title="Tudo pronto">
            <ListGroup>
              {TIPS.map(t => <li key={t} className="border-b border-separator px-4 py-3 text-subheadline last:border-b-0">{t}</li>)}
            </ListGroup>
          </OnboardingStep>
        )}
      </div>

      {error && <p className="pb-2 text-center text-footnote text-destructive">{error}</p>}
      <ButtonRow>
        {optional && (
          <Button variant="secondary" size="lg" onClick={skip} disabled={busy}>Pular</Button>
        )}
        <Button size="lg" onClick={next} disabled={busy || (step === 'name' && !name.trim())}>
          {nextLabel}
        </Button>
      </ButtonRow>
    </div>
  )
}
