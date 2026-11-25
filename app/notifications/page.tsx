'use client'

import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { LargeTitleHeader } from '@/components/ios/large-title-header'
import { ListGroup } from '@/components/ios/list-group'
import { ListRow } from '@/components/ios/list-row'
import { useNotifications } from '@/hooks/use-data'
import { notificationsApi } from '@/lib/api/notifications'
import { dayLabel } from '@/lib/utils'
import { useConfirmDelete } from '@/components/ios/use-delete-action'
import { EmptyState } from '@/components/shared/empty-state'

// Central de notificações: tudo que o app avisou, do mais novo para o mais antigo.
export default function NotificationsPage() {
  const router = useRouter()
  const { notifications, unread, mutate } = useNotifications()
  const del = useConfirmDelete()

  async function open(id: string, url: string | null, read: boolean) {
    if (!read) { await notificationsApi.markRead(id); await mutate() }
    if (url) router.push(url)
  }

  const groups = new Map<string, typeof notifications>()
  for (const n of notifications) {
    const day = new Date(n.createdAt).toLocaleDateString('en-CA') // AAAA-MM-DD no fuso do aparelho
    groups.set(day, [...(groups.get(day) ?? []), n])
  }

  return (
    <>
      {del.sheet}
      <LargeTitleHeader back title="Notificações" />
      <div className="space-y-7 px-4 pt-2">
        {unread > 0 && (
          <div className="flex items-center justify-between px-4">
            <p className="text-subheadline text-muted-foreground">{unread} {unread === 1 ? 'nova' : 'novas'}</p>
            <Button variant="plain" size="nav" className="-mr-2" onClick={async () => { await notificationsApi.markAllRead(); await mutate() }}>Marcar como lidas</Button>
          </div>
        )}
        {notifications.length === 0 && (
          <EmptyState variant="block">Nenhuma notificação.</EmptyState>
        )}
        {[...groups.entries()].map(([day, list]) => (
          <ListGroup key={day} header={dayLabel(day)}>
            {list.map(n => (
              <ListRow key={n.id} onClick={() => open(n.id, n.url, !!n.readAt)} chevron={!!n.url}
                onDelete={() => del.ask({ title: 'Excluir notificação?', label: 'Excluir', remove: () => notificationsApi.remove(n.id) })}
                title={<span className={n.readAt ? 'text-muted-foreground' : 'font-semibold'}>{n.title}</span>}
                subtitle={n.body} />
            ))}
          </ListGroup>
        ))}
      </div>
    </>
  )
}
