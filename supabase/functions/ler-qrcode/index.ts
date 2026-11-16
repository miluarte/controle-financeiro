// Troco: leitura da NFC-e pelo QR code (spec 5.4, passo 7).
// Entrada: { url } (o texto do QR code). Abre a consulta pública da Sefaz do estado (só sites .gov.br)
// e devolve os dados da nota. O modelo padrão de página (usado pela maioria dos estados) é lido direto,
// sem IA; a categoria é sugerida no app (histórico e palavras-chave). O Gemini só entra quando a página
// vem num formato que o leitor não conhece.
// Saída: { ok: true, chave, amount (centavos), place, date, items, categoryId, payment, cardLast4, installments }
//    ou { ok: false, reason } para o app cair na leitura da foto.
import { createClient } from 'npm:@supabase/supabase-js@2.49.4'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

const MODEL = 'gemini-2.5-flash'
type Item = { name: string; amount: number }
type Payment = 'credito' | 'debito' | 'pix' | 'dinheiro' | null

const isGov = (u: URL) => (u.protocol === 'https:' || u.protocol === 'http:') && /(^|\.)gov\.br$/i.test(u.hostname)

// "1.234,56" -> 123456
const cents = (s: string | undefined | null) => {
  if (!s) return 0
  const n = Number(s.replace(/[^\d,.-]/g, '').replace(/\./g, '').replace(',', '.'))
  return Number.isFinite(n) ? Math.round(n * 100) : 0
}

const decode = (s: string) => s
  .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))

const text = (html: string) => decode(html
  .replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<br\s*\/?>/gi, '\n').replace(/<\/(tr|div|p|li|h\d)>/gi, '\n').replace(/<[^>]+>/g, ' '))
  .replace(/[ \t]+/g, ' ').replace(/\n\s*\n+/g, '\n').trim()

function paymentOf(t: string): { payment: Payment; cardLast4: string | null } {
  const n = t.normalize('NFD').replace(/\p{Diacritic}/gu, '').toUpperCase()
  const payment: Payment = /CARTAO DE CREDITO|CREDITO/.test(n) ? 'credito'
    : /CARTAO DE DEBITO|DEBITO/.test(n) ? 'debito'
    : /\bPIX\b|PAGAMENTO INSTANTANEO/.test(n) ? 'pix'
    : /DINHEIRO/.test(n) ? 'dinheiro' : null
  const last4 = n.match(/(?:\*{2,}|X{2,}|FINAL\s*)\s*(\d{4})\b/)?.[1] ?? null
  return { payment, cardLast4: last4 }
}

// Razão social mais legível: tira LTDA, ME, EIRELI, S/A e deixa só a primeira letra maiúscula.
function cleanName(name: string | null) {
  if (!name) return null
  const base = name.replace(/\s+(LTDA|ME|MEI|EPP|EIRELI|S\/?A|S\.A\.?)\.?(\s|$).*/i, '').replace(/\s+/g, ' ').trim()
  return base.toLowerCase().replace(/(^|\s)(\p{L})/gu, (_, sp, c) => sp + c.toUpperCase()) || null
}

// Página no modelo padrão das Sefaz (txtTopo, txtTit, valor, totalNumb, "Emissão:").
function parseTemplate(html: string) {
  const place = decode(html.match(/class="txtTopo"[^>]*>([^<]+)</i)?.[1] ?? '').trim() || null
  const items: Item[] = []
  for (const row of html.split(/<tr[^>]*id="Item\s*\+?\s*\d+"/i).slice(1)) {
    const name = decode(row.match(/class="txtTit[^"]*"[^>]*>([^<]+)</i)?.[1] ?? '').trim()
    const value = row.match(/class="valor"[^>]*>([^<]+)</i)?.[1]
    if (name && value) items.push({ name: name.slice(0, 60), amount: cents(value) })
  }
  const plain = text(html)
  const total = plain.match(/Valor a pagar R\$:?\s*([\d.]+,\d{2})/i)?.[1] ?? plain.match(/Valor total R\$:?\s*([\d.]+,\d{2})/i)?.[1]
  const d = plain.match(/Emiss[aã]o:?\s*(\d{2})\/(\d{2})\/(\d{4})/i)
  const payBlock = plain.match(/Forma de pagamento[\s\S]{0,300}/i)?.[0] ?? ''
  return {
    place, items, amount: cents(total),
    date: d ? `${d[3]}-${d[2]}-${d[1]}` : null,
    ...paymentOf(payBlock),
  }
}

async function askGemini(key: string, pageText: string, categories: string[]) {
  const prompt = `Este é o texto da consulta pública de uma NFC-e (nota fiscal do consumidor) do Brasil.
Extraia:
- total: valor a pagar, em reais, como número.
- place: nome do estabelecimento como as pessoas chamam (nome fantasia, curto), sem CNPJ.
- date: data de emissão AAAA-MM-DD.
- items: até 30 itens com nome curto e valor total do item em reais.
- category: a categoria mais provável entre estas, exatamente como escrita: ${categories.join(', ')}.
- payment: "credito", "debito", "pix", "dinheiro" ou vazio.
- installments: número de parcelas, ou 1.
Nunca inclua CPF, CNPJ ou dados pessoais.

${pageText.slice(0, 30000)}`
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${key}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0,
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'OBJECT',
          properties: {
            total: { type: 'NUMBER' }, place: { type: 'STRING' }, date: { type: 'STRING' }, category: { type: 'STRING' },
            payment: { type: 'STRING' }, installments: { type: 'NUMBER' },
            items: { type: 'ARRAY', items: { type: 'OBJECT', properties: { name: { type: 'STRING' }, amount: { type: 'NUMBER' } } } },
          },
          required: ['total', 'place', 'date', 'category', 'items'],
        },
      },
    }),
  })
  if (!res.ok) return null
  const out = await res.json()
  try {
    return JSON.parse(out?.candidates?.[0]?.content?.parts?.[0]?.text) as {
      total?: number; place?: string; date?: string; category?: string; payment?: string; installments?: number
      items?: { name: string; amount: number }[]
    }
  } catch { return null }
}

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
    auth: { persistSession: false },
  })
  const { data: user } = await supabase.auth.getUser()
  if (!user?.user) return json({ ok: false, reason: 'unauthorized' }, 401)

  const { url } = await req.json().catch(() => ({}))
  let target: URL
  try { target = new URL(String(url ?? '').trim()) } catch { return json({ ok: false, reason: 'not_url' }) }
  if (!isGov(target)) return json({ ok: false, reason: 'not_sefaz' })

  // chave de acesso (44 dígitos): primeiro campo de p= ou parâmetro chNFe
  const p = target.searchParams.get('p') ?? ''
  const chave = (p.split('|')[0].match(/\d{44}/) ?? target.searchParams.get('chNFe')?.match(/\d{44}/) ?? target.href.match(/\d{44}/))?.[0] ?? null
  // QR de emissão offline traz data e valor no próprio código: chave|2|amb|dia|valor|...
  const parts = p.split('|')
  const offlineAmount = parts.length >= 6 && /^\d+(\.\d{1,2})?$/.test(parts[4]) ? Math.round(Number(parts[4]) * 100) : 0

  let html = ''
  try {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), 15_000)
    const res = await fetch(target.href, {
      signal: ctrl.signal, redirect: 'follow',
      headers: { 'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148', 'Accept-Language': 'pt-BR' },
    })
    clearTimeout(timer)
    if (!isGov(new URL(res.url))) return json({ ok: false, reason: 'not_sefaz' })
    if (!res.ok) return json({ ok: false, reason: 'sefaz_error', status: res.status, chave })
    const buf = new Uint8Array(await res.arrayBuffer())
    // algumas Sefaz ainda respondem em ISO-8859-1
    const charset = res.headers.get('content-type')?.match(/charset=([\w-]+)/i)?.[1] ?? 'utf-8'
    try { html = new TextDecoder(charset).decode(buf) } catch { html = new TextDecoder().decode(buf) }
  } catch {
    return json({ ok: false, reason: 'sefaz_unreachable', chave })
  }

  const t = parseTemplate(html)
  const readByTemplate = t.amount > 0 && (!!t.place || t.items.length > 0)
  let cats: { id: string; name: string }[] = []
  let g: Awaited<ReturnType<typeof askGemini>> = null
  const key = Deno.env.get('GEMINI_API_KEY')
  if (!readByTemplate && key) {
    cats = (await supabase.from('categories').select('id, name').eq('type', 'expense').eq('active', true)).data ?? []
    g = await askGemini(key, text(html), cats.map(c => c.name)).catch(() => null)
  }

  const amount = t.amount || Math.round(Number(g?.total || 0) * 100) || offlineAmount
  if (!amount) return json({ ok: false, reason: 'unreadable', chave })

  const gItems = (g?.items ?? []).map(i => ({ name: String(i.name ?? '').slice(0, 60), amount: Math.round(Number(i.amount || 0) * 100) }))
  const gDate = /^\d{4}-\d{2}-\d{2}$/.test(g?.date ?? '') ? g!.date! : null
  const gPay = ['credito', 'debito', 'pix', 'dinheiro'].includes(g?.payment ?? '') ? g!.payment as Payment : null
  const category = cats.find(c => c.name.toLowerCase() === (g?.category ?? '').toLowerCase())

  return json({
    ok: true,
    chave,
    amount,
    place: (cleanName(t.place) || (g?.place ?? '').trim()).slice(0, 80) || null,
    date: t.date ?? gDate,
    items: (t.items.length ? t.items : gItems).slice(0, 30),
    categoryId: category?.id ?? null,
    payment: t.payment ?? gPay,
    cardLast4: t.cardLast4,
    installments: Math.min(48, Math.max(1, Math.round(Number(g?.installments) || 1))),
  })
})
