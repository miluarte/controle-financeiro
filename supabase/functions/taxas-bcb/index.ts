// Troco: taxas médias de juros por banco e produto (pessoa física), do Banco Central.
// Fonte: API Olinda "TaxasJurosDiariaPorInicioPeriodo" (média de 5 dias úteis, publicada toda semana).
// Chamada pelo pg_cron toda segunda (cabeçalho x-cron-secret). Grava a semana mais recente em institution_rates.
import { createClient } from 'npm:@supabase/supabase-js@2.49.4'

const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
  auth: { persistSession: false },
})

const PRODUCTS: Record<string, string> = {
  'Cartão de crédito - rotativo total - Prefixado': 'card_revolving',
  'Cartão de crédito - parcelado - Prefixado': 'card_installment',
  'Cheque especial - Prefixado': 'overdraft',
  'Crédito pessoal não consignado - Prefixado': 'personal_loan',
  'Crédito pessoal consignado INSS - Prefixado': 'payroll_inss',
  'Crédito pessoal consignado privado - Prefixado': 'payroll_private',
  'Crédito pessoal consignado público - Prefixado': 'payroll_public',
  'Aquisição de veículos - Prefixado': 'vehicle',
  'Aquisição de outros bens - Prefixado': 'other_goods',
}

type Row = { InicioPeriodo: string; FimPeriodo: string; Segmento: string; Modalidade: string; InstituicaoFinanceira: string; TaxaJurosAoMes: number }

Deno.serve(async req => {
  const { data: cfg } = await supabase.rpc('get_push_config')
  const secret = (cfg as Record<string, string> | null)?.cron_secret
  if (!secret || req.headers.get('x-cron-secret') !== secret) return new Response('unauthorized', { status: 401 })

  const since = new Date(Date.now() - 45 * 86400000).toISOString().slice(0, 10)
  const url = 'https://olinda.bcb.gov.br/olinda/servico/taxaJuros/versao/v2/odata/TaxasJurosDiariaPorInicioPeriodo'
    + `?$top=20000&$format=json&$filter=${encodeURIComponent(`InicioPeriodo ge '${since}' and Segmento eq 'PESSOA FÍSICA'`)}`
  const res = await fetch(url)
  if (!res.ok) return new Response(`bcb ${res.status}`, { status: 502 })
  const rows = ((await res.json()).value as Row[]).filter(r => PRODUCTS[r.Modalidade])
  if (!rows.length) return new Response(JSON.stringify({ ok: true, updated: 0 }))

  const latest = rows.reduce((m, r) => (r.InicioPeriodo > m ? r.InicioPeriodo : m), '')
  const week = rows.filter(r => r.InicioPeriodo === latest)

  const { data: institutions } = await supabase.from('institutions').select('id, bcb_names')
  const upserts = []
  for (const inst of institutions ?? []) {
    const names = (inst.bcb_names as string[]).map(n => n.toUpperCase())
    if (!names.length) continue
    for (const [modality, product] of Object.entries(PRODUCTS)) {
      const candidates = week.filter(r => r.Modalidade === modality)
      let match: Row | undefined
      for (const n of names) {
        match = candidates.find(r => r.InstituicaoFinanceira.toUpperCase() === n)
          ?? candidates.find(r => r.InstituicaoFinanceira.toUpperCase().includes(n))
        if (match) break
      }
      if (match) upserts.push({
        institution_id: inst.id, product, monthly_rate: match.TaxaJurosAoMes,
        period_start: match.InicioPeriodo, period_end: match.FimPeriodo, bcb_name: match.InstituicaoFinanceira,
        updated_at: new Date().toISOString(),
      })
    }
  }
  if (upserts.length) {
    const { error } = await supabase.from('institution_rates').upsert(upserts, { onConflict: 'institution_id,product' })
    if (error) return new Response(error.message, { status: 500 })
  }
  return new Response(JSON.stringify({ ok: true, week: latest, updated: upserts.length }), { headers: { 'Content-Type': 'application/json' } })
})
