import { supabase, unwrap } from '../supabase/client'

// Central de notificações: o que o app avisou (push ou não).
export interface AppNotification {
  id: string
  kind: string
  title: string
  body: string
  url: string | null
  readAt: string | null
  createdAt: string
}

export const notificationsApi = {
  list: async (): Promise<AppNotification[]> =>
    unwrap(await supabase.from('notifications').select('*').order('created_at', { ascending: false }).limit(100))
      .map(r => ({ id: r.id, kind: r.kind, title: r.title, body: r.body, url: r.url ?? null, readAt: r.read_at ?? null, createdAt: r.created_at })),
  markRead: async (id: string) => {
    unwrap(await supabase.from('notifications').update({ read_at: new Date().toISOString() }).eq('id', id))
  },
  markAllRead: async () => {
    unwrap(await supabase.from('notifications').update({ read_at: new Date().toISOString() }).is('read_at', null))
  },
}
