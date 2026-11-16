import { supabase, unwrap, SUPABASE_URL } from '../supabase/client'

// Endereço que o Atalhos do iPhone chama (Edge Function `atalho`).
export const AUTOMATION_URL = `${SUPABASE_URL}/functions/v1/atalho`

export const automationsApi = {
  // Há token ativo? (o texto do token só aparece na hora de gerar)
  status: async () => {
    const rows = unwrap(await supabase.from('automation_tokens').select('created_at, last_used_at').is('revoked_at', null).limit(1))
    return rows[0] ? { createdAt: rows[0].created_at as string, lastUsedAt: (rows[0].last_used_at as string | null) ?? null } : null
  },
  createToken: async () => unwrap(await supabase.rpc('create_automation_token')) as string,
  // aprende o nome que o Apple Pay usa para o cartão
  rememberCard: async (userId: string, alias: string, walletId: string) => {
    await supabase.from('wallet_aliases').upsert(
      { user_id: userId, source: 'apple_pay', alias, wallet_id: walletId },
      { onConflict: 'user_id,source,alias' },
    )
  },
}
