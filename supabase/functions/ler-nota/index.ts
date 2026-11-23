// Troco: leitura de nota fiscal por foto (spec 5.4), com o Gemini no plano gratuito.
// Entrada: { image: base64 (JPEG), mimeType }. A imagem não é guardada aqui.
// Saída: { ok: true, amount (centavos), place, date (AAAA-MM-DD), items, categoryId, payment, cardLast4, installments }
//    ou { ok: false, reason } para o app cair na leitura local (Tesseract.js).
import { createClient } from 'npm:@supabase/supabase-js@2.49.4'
import { captureGeminiGeneration } from '../_shared/posthog-ai.ts'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

const MODEL = 'gemini-2.5-flash'

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  const auth = req.headers.get('Authorization') ?? ''
  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: auth } },
    auth: { persistSession: false },
  })
  const { data: user } = await supabase.auth.getUser()
  if (!user?.user) return json({ ok: false, reason: 'unauthorized' }, 401)

  const key = Deno.env.get('GEMINI_API_KEY')
  if (!key) return json({ ok: false, reason: 'not_configured' })

  const { image, mimeType } = await req.json().catch(() => ({}))
  if (!image || typeof image !== 'string' || image.length > 7_000_000) return json({ ok: false, reason: 'bad_image' }, 400)

  // categorias de gasto da própria pessoa (o RLS garante)
  const { data: cats } = await supabase.from('categories').select('id, name').eq('type', 'expense').eq('active', true)
  const names = (cats ?? []).map(c => c.name)

  const prompt = `Você lê fotos de notas fiscais e cupons do Brasil (NFC-e, cupom fiscal, recibo).
Extraia:
- total: valor total pago, em reais, como número (ex.: 45.9). Use o "VALOR A PAGAR" ou "TOTAL"; ignore troco e valor recebido.
- place: nome do estabelecimento como as pessoas o chamam (nome fantasia, curto), sem CNPJ.
- date: data da compra no formato AAAA-MM-DD, ou vazio se não aparecer.
- items: até 15 itens com nome curto e valor total do item em reais.
- category: a categoria mais provável entre estas, exatamente como escrita: ${names.join(', ')}.
- payment: forma de pagamento: "credito", "debito", "pix", "dinheiro" ou vazio se não aparecer.
- card_last4: os 4 últimos números do cartão, se a nota mostrar (ex.: "****1234", "final 1234"), ou vazio.
- installments: número de parcelas se a compra foi parcelada (ex.: "3x", "parcelado em 3 vezes"), ou 1.
Nunca inclua CPF, CNPJ ou dados pessoais. Se não conseguir ler o total, use 0.`

  const body = {
    contents: [{ parts: [{ text: prompt }, { inline_data: { mime_type: mimeType || 'image/jpeg', data: image } }] }],
    generationConfig: {
      temperature: 0,
      responseMimeType: 'application/json',
      responseSchema: {
        type: 'OBJECT',
        properties: {
          total: { type: 'NUMBER' },
          place: { type: 'STRING' },
          date: { type: 'STRING' },
          category: { type: 'STRING' },
          payment: { type: 'STRING' },
          card_last4: { type: 'STRING' },
          installments: { type: 'NUMBER' },
          items: { type: 'ARRAY', items: { type: 'OBJECT', properties: { name: { type: 'STRING' }, amount: { type: 'NUMBER' } } } },
        },
        required: ['total', 'place', 'date', 'category', 'items'],
      },
    },
  }

  const traceId = crypto.randomUUID()
  const startedAt = Date.now()
  let res: Response
  try {
    res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${key}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  } catch (error) {
    await captureGeminiGeneration({
      distinctId: user.user.id,
      traceId,
      sessionId: `receipt-reader:${user.user.id}`,
      input: prompt,
      latency: (Date.now() - startedAt) / 1000,
      error: error instanceof Error ? error.name : 'network_error',
    })
    throw error
  }

  const latency = (Date.now() - startedAt) / 1000
  if (res.status === 429) {
    await captureGeminiGeneration({ distinctId: user.user.id, traceId, sessionId: `receipt-reader:${user.user.id}`, input: prompt, latency, httpStatus: res.status, error: 'quota' })
    return json({ ok: false, reason: 'quota' })
  }
  if (!res.ok) {
    await captureGeminiGeneration({ distinctId: user.user.id, traceId, sessionId: `receipt-reader:${user.user.id}`, input: prompt, latency, httpStatus: res.status, error: 'gemini_error' })
    return json({ ok: false, reason: 'gemini_error', status: res.status })
  }

  const out = await res.json()
  const text = out?.candidates?.[0]?.content?.parts?.[0]?.text
  await captureGeminiGeneration({
    distinctId: user.user.id,
    traceId,
    sessionId: `receipt-reader:${user.user.id}`,
    input: prompt,
    output: text,
    inputTokens: out?.usageMetadata?.promptTokenCount,
    outputTokens: out?.usageMetadata?.candidatesTokenCount,
    latency,
    httpStatus: res.status,
  })
  let parsed: { total?: number; place?: string; date?: string; category?: string; payment?: string; card_last4?: string; installments?: number; items?: { name: string; amount: number }[] }
  try { parsed = JSON.parse(text) } catch { return json({ ok: false, reason: 'unreadable' }) }

  const cents = (v: unknown) => Math.round(Number(v || 0) * 100)
  const date = /^\d{4}-\d{2}-\d{2}$/.test(parsed.date ?? '') ? parsed.date : null
  const category = (cats ?? []).find(c => c.name.toLowerCase() === (parsed.category ?? '').toLowerCase())

  return json({
    ok: true,
    amount: cents(parsed.total),
    place: (parsed.place ?? '').trim().slice(0, 80) || null,
    date,
    items: (parsed.items ?? []).slice(0, 15).map(i => ({ name: String(i.name ?? '').slice(0, 60), amount: cents(i.amount) })),
    categoryId: category?.id ?? null,
    payment: ['credito', 'debito', 'pix', 'dinheiro'].includes(parsed.payment ?? '') ? parsed.payment : null,
    cardLast4: /^\d{4}$/.test(parsed.card_last4 ?? '') ? parsed.card_last4 : null,
    installments: Math.min(48, Math.max(1, Math.round(Number(parsed.installments) || 1))),
  })
})
