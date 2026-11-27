// Troco: leitura de um link do Google Maps para o cadastro de locais.
// Entrada: { url } (link copiado em Compartilhar no Maps, curto como maps.app.goo.gl/… ou longo).
// Segue os redirecionamentos só entre endereços do Google e lê o nome, o endereço e o ponto do próprio link.
// Saída: { ok: true, url, name, address, latitude, longitude } ou { ok: false, reason }.
import { createClient } from 'npm:@supabase/supabase-js@2.49.4'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

// só endereços do Google Maps (inclusive o encurtador)
const isGoogle = (u: URL) => u.protocol === 'https:' && (
  /^(maps\.app\.goo\.gl|goo\.gl)$/i.test(u.hostname)
  || /^(www\.|maps\.)?google\.[a-z.]+$/i.test(u.hostname))

const isShort = (u: URL) => /^(maps\.app\.goo\.gl|goo\.gl)$/i.test(u.hostname)

const plus = (s: string) => { try { return decodeURIComponent(s.replace(/\+/g, ' ')).trim() } catch { return s.replace(/\+/g, ' ').trim() } }

const coord = (lat: number, lng: number) =>
  Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180 ? { latitude: lat, longitude: lng } : null

// lê nome, endereço e ponto do link longo do Maps
export function parseMapsUrl(u: URL) {
  // ponto exato do lugar (!3d lat !4d lng) vale mais que o centro da tela (@lat,lng)
  const pin = u.href.match(/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/)
  const view = u.pathname.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/)
  const q = u.searchParams.get('q') ?? u.searchParams.get('query') ?? u.searchParams.get('destination')
  const qPoint = q?.match(/^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/)
  const point = (pin && coord(+pin[1], +pin[2])) || (qPoint && coord(+qPoint[1], +qPoint[2])) || (view && coord(+view[1], +view[2])) || null

  // /maps/place/Nome,+Rua+X,+123+-+Bairro,+Cidade+-+UF/…
  const place = u.pathname.match(/\/place\/([^/]+)/)?.[1]
  const label = place ? plus(place) : q && !qPoint ? plus(q) : ''
  const parts = label.split(',').map(s => s.trim()).filter(Boolean)
  // o primeiro trecho é o nome quando não começa com número nem com tipo de rua
  const looksStreet = (s: string) => /^\d/.test(s) || /^(r\.?|rua|av\.?|avenida|travessa|tv\.?|rodovia|rod\.?|alameda|al\.?|praça|estrada|br-)\s/i.test(s)
  const name = parts.length > 1 && !looksStreet(parts[0]) ? parts[0] : null
  const address = (name ? parts.slice(1) : parts).join(', ') || null
  return { name, address, ...(point ?? { latitude: null, longitude: null }) }
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
  // o texto copiado do Maps pode vir com o nome do lugar antes do link
  const found = String(url ?? '').match(/https:\/\/\S+/)?.[0]
  let target: URL
  try { target = new URL(found ?? '') } catch { return json({ ok: false, reason: 'not_url' }) }
  if (!isGoogle(target)) return json({ ok: false, reason: 'not_maps' })

  // segue o encurtador (até 5 saltos), sem sair do Google
  for (let hop = 0; hop < 5 && isShort(target); hop++) {
    try {
      const ctrl = new AbortController()
      const timer = setTimeout(() => ctrl.abort(), 10_000)
      const res = await fetch(target.href, { redirect: 'manual', signal: ctrl.signal, headers: { 'User-Agent': 'Mozilla/5.0' } })
      clearTimeout(timer)
      const next = res.headers.get('location')
      await res.body?.cancel()
      if (!next) break
      const u = new URL(next, target)
      if (!isGoogle(u)) return json({ ok: false, reason: 'not_maps' })
      target = u
    } catch { return json({ ok: false, reason: 'unreachable' }) }
  }
  if (isShort(target)) return json({ ok: false, reason: 'unreachable' })

  const parsed = parseMapsUrl(target)
  if (!parsed.address && parsed.latitude == null) return json({ ok: false, reason: 'no_place' })
  return json({ ok: true, url: found, ...parsed })
})
