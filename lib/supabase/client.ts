import { createClient } from '@supabase/supabase-js'

// URL e chave publicável do Supabase são públicas por design (vão pro bundle do
// navegador de qualquer forma). A segurança dos dados vem do RLS no banco:
// cada usuário só lê e grava as próprias linhas. As variáveis de ambiente
// sobrescrevem os valores padrão se definidas (.env.local ou painel da Vercel).
export const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://ievipjugroamsrxolvip.supabase.co'
export const SUPABASE_PUBLISHABLE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? 'sb_publishable_YqB4o4diCY3xigGAmcLWGg_yG4abJvL'

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true },
})

// Lança o erro do Supabase como Error comum, pra que os hooks/forms continuem
// tratando falha do mesmo jeito que tratavam com o Apps Script.
export function unwrap<T>(res: { data: T; error: { message: string } | null }): NonNullable<T> {
  if (res.error) throw new Error(res.error.message)
  return res.data as NonNullable<T>
}
