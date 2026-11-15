-- Onboarding de novos usuários: preenchido quando a pessoa termina (ou pula) o passo a passo inicial.
alter table public.profiles add column if not exists onboarding_completed_at timestamptz;
