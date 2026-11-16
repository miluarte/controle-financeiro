// Troco: entrada das automações do iPhone (Atalhos). Sem login: autentica pelo token pessoal
// gerado em Config > Automações. Cria um gasto pendente para confirmar no app.
//
// Aceita GET (query) ou POST (JSON ou formulário) com:
//   t      token (obrigatório)
//   s      origem: apple_pay | back_tap | notification
//   v      valor ("45,90", "R$ 1.234,56", "45.9")
//   l      local / comerciante
//   c      nome do cartão (Apple Pay)
//   x      texto livre (SMS do banco): o valor e o local saem daqui quando v/l não vierem
import { createClient } from 'npm:@supabase/supabase-js@2.49.4'

const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
  auth: { persistSession: false },
})

const brl = (c: number) => (c / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const reply = (text: string, status = 200) =>
  new Response(text, { status, headers: { 'Content-Type': 'text/plain; charset=utf-8' } })

// "R$ 1.234,56" -> 123456; "45.9" -> 4590; "45,90" -> 4590
export function parseAmount(raw: string | null | undefined): number | null {
  if (!raw) return null
  const s = String(raw).replace(/[^\d,.]/g, '')
  if (!s) return null
  let normalized: string
  const lastComma = s.lastIndexOf(',')
  const lastDot = s.lastIndexOf('.')
  if (lastComma >= 0 && lastDot >= 0) {
    normalized = lastComma > lastDot ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '')
  } else if (lastComma >= 0) {
    normalized = s.replace(/\./g, '').replace(',', '.')
  } else if (lastDot >= 0) {
    const decimals = s.length - lastDot - 1
    normalized = decimals === 3 ? s.replace(/\./g, '') : s
  } else {
    normalized = s
  }
  const n = Math.round(Number(normalized) * 100)
  return Number.isFinite(n) && n > 0 ? n : null
}

// SMS do banco: "Compra aprovada no valor de R$ 45,90 em PADARIA CENTRAL em 16/11 às 10:32"
export function parseText(text: string) {
  const money = text.match(/R\$\s*([\d.]+,\d{2})/i) ?? text.match(/(\d{1,3}(?:\.\d{3})*,\d{2})/)
  const amount = money ? parseAmount(money[1]) : null
  const after = money ? text.slice((money.index ?? 0) + money[0].length) : text
  const place =
    after.match(/\b(?:em|no|na|local:?|estabelecimento:?)\s+(.+?)(?:\s+(?:em\s+\d|no dia|dia\s+\d|às|as\s+\d|com o cart|cart[aã]o|final|para|pelo|via)|[,.;\n]|$)/i)?.[1] ??
    text.match(/\b(?:em|no estabelecimento)\s+([A-Z0-9][A-Z0-9 *&'.-]{2,})/)?.[1] ??
    // "R$ 89,90, 16/11 10:31, MERCADO LIVRE.": trecho com letras e sem números depois do valor
    after.split(/[,;\n]/).map(x => x.trim().replace(/\.$/, '')).find(x => /[A-Za-z]{3}/.test(x) && !/\d/.test(x)) ??
    null
  return { amount, place: place?.trim().replace(/\s+/g, ' ').slice(0, 80) || null }
}

async function readParams(req: Request): Promise<Record<string, string>> {
  const params: Record<string, string> = Object.fromEntries(new URL(req.url).searchParams)
  if (req.method === 'POST') {
    const type = req.headers.get('content-type') ?? ''
    try {
      if (type.includes('json')) Object.assign(params, await req.json())
      else if (type.includes('form')) Object.assign(params, Object.fromEntries(await req.formData()))
      else {
        const body = await req.text()
        if (body.trim().startsWith('{')) Object.assign(params, JSON.parse(body))
        else if (body.trim()) params.x ??= body
      }
    } catch { /* corpo inválido: segue com a query */ }
  }
  for (const k of Object.keys(params)) params[k] = String(params[k] ?? '')
  return params
}

Deno.serve(async req => {
  const p = await readParams(req)
  const token = p.t || p.token || ''
  const text = p.x || p.texto || p.text || ''
  const fromText = text ? parseText(text) : { amount: null, place: null }
  const amount = parseAmount(p.v || p.valor || p.amount) ?? fromText.amount
  const place = p.l || p.local || p.place || fromText.place

  if (!token) return reply('Falta o token. Copie em Config > Automações.', 401)
  if (!amount) return reply('Não achei o valor.', 400)

  const { data, error } = await supabase.rpc('automation_capture', {
    p_token: token, p_source: p.s || p.source || 'back_tap', p_amount: amount,
    p_place: place || null, p_card: p.c || p.cartao || p.card || null, p_text: text || null,
  })
  if (error) {
    if (error.message.includes('token')) return reply('Token inválido. Gere outro em Config > Automações.', 401)
    return reply('Não deu para anotar agora.', 500)
  }
  const result = data as { duplicate: boolean }
  if (result.duplicate) return reply(`Já anotado: ${brl(amount)}`)
  return reply(`Anotado: ${brl(amount)}${place ? ` · ${place}` : ''}. Confirme no Troco.`)
})
