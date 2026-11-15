// Troco: envio de notificações push (spec 5.13 e 5.7.9).
// Chamada a cada 10 minutos pelo pg_cron e, na hora, quando entra aviso na fila (cabeçalho x-cron-secret).
// 1. Envia a fila (eventos da família e testes).
// 2. Avisos agendados por usuário: contas a vencer, lembrete de registro, resumo da semana,
//    alertas de orçamento e lembrete de acerto quando a fatura de um cartão compartilhado fecha.
import { createClient } from 'npm:@supabase/supabase-js@2.49.4'
import webpush from 'npm:web-push@3.6.7'

const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
  auth: { persistSession: false },
})

type Sub = { id: string; user_id: string; endpoint: string; p256dh: string; auth: string }
type Setting = { user_id: string; type: string; enabled: boolean; time: string | null; days_before: number | null }

const brl = (c: number) => (c / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

// Data e hora atuais em São Paulo.
function nowBr() {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', weekday: 'short', hour12: false,
    }).formatToParts(new Date()).map(p => [p.type, p.value]),
  )
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    time: `${parts.hour === '24' ? '00' : parts.hour}:${parts.minute}`,
    weekday: parts.weekday as string,
  }
}

function addDays(date: string, n: number) {
  const d = new Date(`${date}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

async function config() {
  const { data } = await supabase.rpc('get_push_config')
  let cfg = (data ?? {}) as Record<string, string>
  if (!cfg.vapid_public || !cfg.vapid_private) {
    const keys = webpush.generateVAPIDKeys()
    await supabase.rpc('set_push_config', { p_name: 'vapid_public', p_value: keys.publicKey })
    await supabase.rpc('set_push_config', { p_name: 'vapid_private', p_value: keys.privateKey })
    const again = await supabase.rpc('get_push_config')
    cfg = (again.data ?? {}) as Record<string, string>
  }
  return cfg
}

// Registra o aviso; devolve true só na primeira vez (evita repetir).
async function once(userId: string, kind: string, key: string) {
  const { data } = await supabase.from('notification_log')
    .upsert({ user_id: userId, kind, key }, { onConflict: 'user_id,kind,key', ignoreDuplicates: true })
    .select('id')
  return (data ?? []).length > 0
}

Deno.serve(async req => {
  const cfg = await config()
  if (!cfg.cron_secret || req.headers.get('x-cron-secret') !== cfg.cron_secret) {
    return new Response('unauthorized', { status: 401 })
  }
  webpush.setVapidDetails(cfg.vapid_subject || 'https://troco-finance.vercel.app', cfg.vapid_public, cfg.vapid_private)

  const [{ data: subs }, { data: settingsRows }] = await Promise.all([
    supabase.from('push_subscriptions').select('*'),
    supabase.from('notification_settings').select('user_id, type, enabled, time, days_before'),
  ])
  const subsByUser = new Map<string, Sub[]>()
  for (const s of (subs ?? []) as Sub[]) subsByUser.set(s.user_id, [...(subsByUser.get(s.user_id) ?? []), s])
  const settings = new Map<string, Setting>()
  for (const s of (settingsRows ?? []) as Setting[]) settings.set(`${s.user_id}:${s.type}`, s)
  const enabled = (u: string, t: string) => settings.get(`${u}:${t}`)?.enabled !== false
  let sent = 0

  async function push(userId: string, title: string, body: string, url = '/home') {
    for (const s of subsByUser.get(userId) ?? []) {
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          JSON.stringify({ title, body, url }), { TTL: 60 * 60 * 12 })
        sent++
      } catch (err) {
        const code = (err as { statusCode?: number }).statusCode
        if (code === 404 || code === 410) await supabase.from('push_subscriptions').delete().eq('id', s.id)
      }
    }
  }

  // 1. fila de eventos. Cada aviso é "reservado" (sent_at) antes de enviar, para que dois
  //    disparos simultâneos (trigger imediato e agendamento) não mandem o mesmo aviso duas vezes.
  const { data: queue } = await supabase.from('notification_queue').select('id').is('sent_at', null).order('created_at').limit(200)
  for (const { id } of queue ?? []) {
    const { data: claimed } = await supabase.from('notification_queue')
      .update({ sent_at: new Date().toISOString() }).eq('id', id).is('sent_at', null).select('*')
    const q = claimed?.[0]
    if (!q) continue
    if (q.kind === 'test' || enabled(q.user_id, q.kind)) await push(q.user_id, q.title, q.body, q.url ?? '/home')
  }

  // disparo imediato (trigger da fila): só a fila
  const payload = await req.json().catch(() => ({}))
  if (payload?.queue_only) {
    return new Response(JSON.stringify({ ok: true, sent }), { headers: { 'Content-Type': 'application/json' } })
  }

  // 2. avisos agendados (só para quem tem aparelho cadastrado)
  const now = nowBr()
  const due = (u: string, t: string, fallback: string) => {
    const s = settings.get(`${u}:${t}`)
    return enabled(u, t) && now.time >= (s?.time?.slice(0, 5) ?? fallback)
  }

  for (const userId of subsByUser.keys()) {
    // NOT-1: contas a vencer (X dias antes e no dia)
    if (due(userId, 'bill_due', '09:00')) {
      const before = settings.get(`${userId}:bill_due`)?.days_before ?? 2
      const { data: occ } = await supabase.from('bill_occurrences')
        .select('id, amount, due_date, bills(name)').eq('user_id', userId).is('paid_at', null)
        .in('due_date', [now.date, addDays(now.date, before)])
      for (const o of occ ?? []) {
        const today = o.due_date === now.date
        if (await once(userId, 'bill_due', `${o.id}:${o.due_date === now.date ? 0 : before}`)) {
          // deno-lint-ignore no-explicit-any
          const name = (o as any).bills?.name ?? 'Conta'
          await push(userId, today ? 'Conta vence hoje' : `Conta vence em ${before} dias`, `${name}: ${brl(o.amount)}`, '/bills')
        }
      }
    }

    // NOT-2: lembrete diário se nenhum gasto foi registrado hoje
    if (due(userId, 'log_reminder', '21:00')) {
      const start = new Date(`${now.date}T00:00:00-03:00`).toISOString()
      const { count } = await supabase.from('transactions').select('id', { count: 'exact', head: true })
        .eq('created_by', userId).gte('created_at', start)
      if (!count && await once(userId, 'log_reminder', now.date)) {
        await push(userId, 'Registrou seus gastos hoje?', 'Leva poucos segundos: toque no + e anote.', '/home')
      }
    }

    // NOT-3: resumo da semana, domingo à noite
    if (now.weekday === 'Sun' && due(userId, 'weekly_summary', '20:00') && await once(userId, 'weekly_summary', now.date)) {
      const from = addDays(now.date, -6)
      const prevFrom = addDays(now.date, -13)
      const { data: tx } = await supabase.from('transactions').select('amount, date, category_id')
        .eq('assigned_to', userId).eq('type', 'expense').eq('status', 'confirmed').gte('date', prevFrom).lte('date', now.date)
      const week = (tx ?? []).filter(t => t.date >= from)
      const prev = (tx ?? []).filter(t => t.date < from)
      const total = week.reduce((s, t) => s + t.amount, 0)
      const prevTotal = prev.reduce((s, t) => s + t.amount, 0)
      const byCat = new Map<string, number>()
      for (const t of week) if (t.category_id) byCat.set(t.category_id, (byCat.get(t.category_id) ?? 0) + t.amount)
      const top = [...byCat.entries()].sort((a, b) => b[1] - a[1])[0]
      let topName = ''
      if (top) {
        const { data: c } = await supabase.from('categories').select('name').eq('id', top[0]).maybeSingle()
        topName = c?.name ? ` Maior categoria: ${c.name}.` : ''
      }
      const diff = prevTotal ? ` (${total >= prevTotal ? '+' : '-'}${Math.round(Math.abs(total - prevTotal) / prevTotal * 100)}% vs. semana anterior)` : ''
      await push(userId, 'Resumo da semana', `Você gastou ${brl(total)}${diff}.${topName}`, '/analysis')
    }

    // NOT-4: orçamento em 80% e 100%
    if (enabled(userId, 'smart_alerts')) {
      const month = now.date.slice(0, 7)
      const { data: budget } = await supabase.from('budgets').select('total_amount')
        .eq('user_id', userId).eq('ref_month', `${month}-01`).maybeSingle()
      if (budget?.total_amount) {
        const { data: tx } = await supabase.from('transactions').select('amount')
          .eq('assigned_to', userId).eq('type', 'expense').eq('status', 'confirmed')
          .gte('date', `${month}-01`).lte('date', now.date)
        const spent = (tx ?? []).reduce((s, t) => s + t.amount, 0)
        const ratio = spent / budget.total_amount
        if (ratio >= 1 && await once(userId, 'smart_alerts', `${month}:100`)) {
          await push(userId, 'Orçamento do mês estourado', `Você já gastou ${brl(spent)} de ${brl(budget.total_amount)}.`, '/analysis')
        } else if (ratio >= 0.8 && ratio < 1 && await once(userId, 'smart_alerts', `${month}:80`)) {
          await push(userId, '80% do orçamento usado', `Restam ${brl(budget.total_amount - spent)} para o mês.`, '/analysis')
        }
      }
    }
  }

  // 5.7.9: fatura de cartão compartilhado fechou ontem -> lembrete de acerto para cada membro
  const yesterday = addDays(now.date, -1)
  const yDay = Number(yesterday.slice(8, 10))
  const { data: cards } = await supabase.from('wallets').select('id, name, owner_id, closing_day')
    .eq('type', 'credit').neq('share_scope', 'none').eq('active', true)
  for (const w of cards ?? []) {
    const lastDay = new Date(Number(yesterday.slice(0, 4)), Number(yesterday.slice(5, 7)), 0).getDate()
    if (Math.min(w.closing_day, lastDay) !== yDay) continue
    const ref = `${yesterday.slice(0, 7)}-01`
    const { data: rows } = await supabase.from('transactions').select('assigned_to, amount')
      .eq('wallet_id', w.id).eq('invoice_ref', ref).eq('type', 'expense').eq('status', 'confirmed').neq('assigned_to', w.owner_id)
    const byMember = new Map<string, number>()
    for (const r of rows ?? []) byMember.set(r.assigned_to, (byMember.get(r.assigned_to) ?? 0) + r.amount)
    const { data: owner } = await supabase.from('profiles').select('name').eq('id', w.owner_id).maybeSingle()
    for (const [memberId, total] of byMember) {
      if (enabled(memberId, 'family_events') && await once(memberId, 'family_events', `close:${w.id}:${ref}`)) {
        await push(memberId, `Fatura do ${w.name} fechou`, `Você deve ${brl(total)} a ${owner?.name ?? 'titular'}.`, `/cards/${w.id}`)
      }
    }
  }

  // ACE-5: fotos de comprovante de quem excluiu a conta (pasta = id do usuário que não existe mais)
  let removed = 0
  const { data: folders } = await supabase.storage.from('receipts').list('', { limit: 1000 })
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
  const folderIds = (folders ?? []).map(f => f.name).filter(n => uuid.test(n))
  // só apaga com a lista de usuários confirmada; se a consulta falhar, não mexe em nada
  const { data: alive, error: aliveError } = folderIds.length
    ? await supabase.from('profiles').select('id').in('id', folderIds)
    : { data: [], error: null }
  if (folderIds.length && !aliveError && alive) {
    const aliveIds = new Set(alive.map(p => p.id))
    for (const folder of folderIds.filter(id => !aliveIds.has(id))) {
      const { data: files } = await supabase.storage.from('receipts').list(folder, { limit: 1000 })
      const paths = (files ?? []).map(f => `${folder}/${f.name}`)
      if (paths.length) {
        await supabase.storage.from('receipts').remove(paths)
        removed += paths.length
      }
    }
  }

  return new Response(JSON.stringify({ ok: true, sent, removed }), { headers: { 'Content-Type': 'application/json' } })
})
