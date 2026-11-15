'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { ListGroup } from '@/components/ios/list-group'
import { ListRow } from '@/components/ios/list-row'
import { ModalSheet } from '@/components/ios/modal-sheet'
import { useSession } from '@/hooks/use-session'
import { supabase } from '@/lib/supabase/client'
import { formatDate } from '@/lib/utils'

export const APP_VERSION = '1.0.0'

// NAV-6: novidades com indicador de não lido, e versão do app.
export function AboutGroup() {
  const { session } = useSession()
  const [open, setOpen] = useState(false)
  const { data, mutate } = useSWR(['news'], async () => {
    const [news, reads] = await Promise.all([
      supabase.from('app_news').select('*').order('published_at', { ascending: false }),
      supabase.from('news_reads').select('news_id'),
    ])
    const read = new Set((reads.data ?? []).map(r => r.news_id as string))
    return (news.data ?? []).map(n => ({ id: n.id as string, title: n.title as string, body: n.body as string, date: (n.published_at as string).slice(0, 10), read: read.has(n.id) }))
  })
  const unread = (data ?? []).filter(n => !n.read)

  async function openNews() {
    setOpen(true)
    if (unread.length && session) {
      await supabase.from('news_reads').upsert(unread.map(n => ({ user_id: session.user.id, news_id: n.id })), { onConflict: 'user_id,news_id' })
      mutate()
    }
  }

  return (
    <>
      <ListGroup header="Sobre">
        <ListRow title="Novidades" onClick={openNews} chevron
          trailing={unread.length ? <span className="flex size-5 items-center justify-center rounded-full bg-destructive text-caption2 font-semibold text-white">{unread.length}</span> : undefined} />
        <ListRow title="Versão" trailing={APP_VERSION} />
      </ListGroup>
      <ModalSheet open={open} onOpenChange={setOpen} title="Novidades">
        {(data ?? []).length === 0 ? (
          <p className="py-10 text-center text-subheadline text-muted-foreground">Nenhuma novidade por enquanto.</p>
        ) : (
          <ListGroup>
            {(data ?? []).map(n => (
              <li key={n.id} className="border-b border-separator px-4 py-3 last:border-b-0">
                <p className="text-headline">{n.title}</p>
                <p className="text-footnote text-muted-foreground">{formatDate(n.date)}</p>
                {n.body && <p className="mt-1 text-subheadline">{n.body}</p>}
              </li>
            ))}
          </ListGroup>
        )}
      </ModalSheet>
    </>
  )
}
