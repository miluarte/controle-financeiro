import { createClient } from '@supabase/supabase-js'

// Busca de lugar no Google (Places API New) para o cadastro de locais. A chave fica só no servidor
// (GOOGLE_MAPS_API_KEY na Vercel); sem ela, { enabled: false } e o app esconde a busca e fica só o link.
// Corpo: { action: 'status' } | { action: 'search', input, session } | { action: 'details', placeId, session }.
// Busca e detalhe usam o mesmo token de sessão (o Google cobra só o detalhe), e o detalhe pede só
// campos Essentials (endereço e ponto). O nome vem da própria sugestão.

const API = 'https://places.googleapis.com/v1'
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://ievipjugroamsrxolvip.supabase.co'
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? 'sb_publishable_YqB4o4diCY3xigGAmcLWGg_yG4abJvL'

type Prediction = {
  placePrediction?: {
    placeId: string
    text?: { text: string }
    structuredFormat?: { mainText?: { text: string }; secondaryText?: { text: string } }
  }
}

async function google(url: string, init: RequestInit) {
  try {
    const res = await fetch(url, { ...init, signal: AbortSignal.timeout(10_000), cache: 'no-store' })
    return res.ok ? await res.json() : null
  } catch { return null }
}

// só quem está logado no app usa a busca (a cota é paga)
async function signedIn(req: Request) {
  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
  if (!token) return false
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } })
  const { data } = await supabase.auth.getUser(token)
  return !!data.user
}

export async function POST(req: Request) {
  if (!(await signedIn(req))) return Response.json({ ok: false, reason: 'unauthorized' }, { status: 401 })
  const key = process.env.GOOGLE_MAPS_API_KEY
  if (!key) return Response.json({ ok: true, enabled: false })

  const body = await req.json().catch(() => ({}))
  const session = typeof body.session === 'string' ? body.session.slice(0, 64) : undefined

  if (body.action === 'status') return Response.json({ ok: true, enabled: true })

  if (body.action === 'search') {
    const input = String(body.input ?? '').trim().slice(0, 120)
    if (input.length < 3) return Response.json({ ok: true, results: [] })
    const data = await google(`${API}/places:autocomplete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': key },
      body: JSON.stringify({ input, languageCode: 'pt-BR', regionCode: 'br', includedRegionCodes: ['br'], sessionToken: session }),
    })
    if (!data) return Response.json({ ok: false, reason: 'google' })
    const results = ((data.suggestions ?? []) as Prediction[])
      .map(s => s.placePrediction)
      .filter((p): p is NonNullable<Prediction['placePrediction']> => !!p?.placeId)
      .slice(0, 5)
      .map(p => ({
        placeId: p.placeId,
        name: p.structuredFormat?.mainText?.text ?? p.text?.text ?? '',
        detail: p.structuredFormat?.secondaryText?.text ?? '',
      }))
    return Response.json({ ok: true, results })
  }

  if (body.action === 'details') {
    const placeId = String(body.placeId ?? '')
    if (!/^[\w-]{10,300}$/.test(placeId)) return Response.json({ ok: false, reason: 'bad_place' })
    const qs = new URLSearchParams({ languageCode: 'pt-BR', regionCode: 'br', ...(session ? { sessionToken: session } : {}) })
    const data = await google(`${API}/places/${placeId}?${qs}`, {
      headers: { 'X-Goog-Api-Key': key, 'X-Goog-FieldMask': 'id,formattedAddress,location' },
    })
    if (!data) return Response.json({ ok: false, reason: 'google' })
    return Response.json({
      ok: true,
      address: data.formattedAddress ?? null,
      latitude: data.location?.latitude ?? null,
      longitude: data.location?.longitude ?? null,
      url: `https://www.google.com/maps/search/?api=1&query=Google&query_place_id=${encodeURIComponent(placeId)}`,
    })
  }

  return Response.json({ ok: false, reason: 'bad_action' })
}
