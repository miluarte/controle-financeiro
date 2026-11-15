'use client'

import { useState } from 'react'
import { ChatRoundDotsBoldDuotoneIcon } from '@solar-icons/react'
import { Textarea } from '@/components/ui/textarea'
import { GlassButton } from '@/components/ios/glass-button'
import { ListGroup } from '@/components/ios/list-group'
import { ModalSheet } from '@/components/ios/modal-sheet'
import { useSession } from '@/hooks/use-session'
import { supabase, unwrap } from '@/lib/supabase/client'

// NAV-5: ícone de feedback no topo de Config.
export function FeedbackButton() {
  const { session } = useSession()
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function send(e: React.FormEvent) {
    e.preventDefault()
    if (!text.trim()) return
    try {
      unwrap(await supabase.from('feedback').insert({ user_id: session!.user.id, message: text.trim() }))
      setSent(true); setText('')
    } catch (err) { setError(err instanceof Error ? err.message : 'Não foi possível enviar.') }
  }

  return (
    <>
      <GlassButton aria-label="Enviar feedback" onClick={() => { setOpen(true); setSent(false); setError(null) }}>
        <ChatRoundDotsBoldDuotoneIcon />
      </GlassButton>
      <ModalSheet open={open} onOpenChange={setOpen} title="Feedback" formId="feedback" actionLabel="Enviar" actionDisabled={!text.trim()}>
        {sent ? (
          <p className="py-10 text-center text-body">Obrigado! Recebemos sua mensagem.</p>
        ) : (
          <form id="feedback" onSubmit={send} className="space-y-3">
            <ListGroup footer="Conte o que pode melhorar, o que deu errado ou o que você gostaria de ter.">
              <li className="p-3">
                <Textarea value={text} onChange={e => setText(e.target.value)} rows={6} placeholder="Escreva aqui"
                  className="border-0 bg-transparent p-1 text-body focus-visible:ring-0" />
              </li>
            </ListGroup>
            {error && <p className="px-4 text-footnote text-destructive">{error}</p>}
          </form>
        )}
      </ModalSheet>
    </>
  )
}
