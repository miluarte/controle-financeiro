'use client'

import { useEffect, useRef, useState } from 'react'
import { ProgressButton } from '@/components/shared/progress-button'
import { CameraLinearIcon, CheckCircleLinearIcon } from '@solar-icons/react'
import { Button } from '@/components/ui/button'
import { LoadingDots } from '@/components/shared/loading-dots'
import { readReceipt, type ReceiptResult } from '@/lib/receipt'
import posthog from 'posthog-js'

// 5.4 passos 1 e 2: abre a câmera ou a galeria, lê a nota e guarda a foto (onSave), no fim do progresso
// "Nota salva". O gasto só é registrado ao confirmar o formulário. Tocar de novo lê outra nota no lugar.
// initialFile: foto já escolhida antes de abrir o formulário (atalho "Ler nota fiscal" do botão +).
export function ReceiptScanButton({ onRead, onSave, initialFile = null }: {
  onRead: (result: ReceiptResult, image: Blob) => void
  onSave?: (image: Blob) => Promise<void>
  initialFile?: File | null
}) {
  const gallery = useRef<HTMLInputElement>(null)
  const [reading, setReading] = useState(false)
  const [status, setStatus] = useState('Lendo a nota…')
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  // preenchimento do botão: o leitor do celular informa a %; a leitura online avança sozinha até 90%
  const [progress, setProgress] = useState(0)

  async function handleFile(file: File | undefined) {
    if (!file) return
    setReading(true); setError(null); setSaved(false); setStatus('Lendo a nota…'); setProgress(5)
    const tick = setInterval(() => setProgress(p => p + (90 - p) * 0.06), 200)
    const onStatus = (text: string) => {
      setStatus(text.replace(/\s*\d+%$/, ''))
      const pct = text.match(/(\d+)%$/)
      if (pct) setProgress(p => Math.max(p, Number(pct[1])))
    }
    try {
      const { result, image } = await readReceipt(file, onStatus)
      onRead(result, image)
      posthog.capture('receipt_scanned', {
        receipt_source: result.source,
        has_total: Boolean(result.amount),
        has_line_items: result.items.length > 0,
        is_installment: result.installments > 1,
      })
      posthog.logger.info('receipt_scan_completed', {
        receipt_source: result.source,
        has_total: Boolean(result.amount),
        has_line_items: result.items.length > 0,
        is_installment: result.installments > 1,
      })
      let ok = !onSave
      if (onSave) {
        setStatus('Salvando a nota…')
        try { await onSave(image); ok = true } catch {
          setError('Não foi possível salvar a foto da nota.')
          posthog.logger.warn('receipt_image_save_failed')
        }
      }
      clearInterval(tick); setProgress(100)
      if (ok && onSave) { setStatus('Nota salva'); setSaved(true) }
      await new Promise(r => setTimeout(r, ok && onSave ? 600 : 250))
      if (!result.amount) setError('Não foi possível achar o total nesta foto. Tente outra mais nítida ou digite o valor.')
    } catch (err) {
      posthog.logger.error('receipt_scan_failed', {
        error_category: err instanceof Error && err.message === 'gemini-timeout'
          ? 'gemini_timeout'
          : 'receipt_read_failed',
      })
      setError(err instanceof Error && err.message !== 'gemini-timeout'
        ? `Não foi possível ler a nota: ${err.message}`
        : 'Não foi possível ler a nota. Tente de novo ou digite os dados.')
    } finally {
      clearInterval(tick)
      setReading(false); setProgress(0)
      if (gallery.current) gallery.current.value = ''
    }
  }

  const started = useRef(false)
  useEffect(() => {
    if (!initialFile || started.current) return
    started.current = true
    handleFile(initialFile)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialFile])

  return (
    <div className="space-y-1.5">
      {reading ? (
        <ProgressButton progress={progress}>
          {saved ? <CheckCircleLinearIcon className="size-5" /> : <LoadingDots size="sm" tone="current" label={status} />}{status}
        </ProgressButton>
      ) : saved ? (
        // nota já lida e guardada: tocar lê outra, que substitui esta
        <Button type="button" variant="secondary" className="w-full rounded-full" onClick={() => gallery.current?.click()}>
          <CheckCircleLinearIcon className="size-5" />Nota salva
        </Button>
      ) : (
        // um botão só: sem "capture", o iPhone abre o próprio menu (Tirar Foto, Fototeca, Arquivo)
        <Button type="button" variant="secondary" className="w-full rounded-full" onClick={() => gallery.current?.click()}>
          <CameraLinearIcon className="size-5" />Ler nota fiscal
        </Button>
      )}
      {error && <p className="px-4 text-center text-footnote text-destructive">{error}</p>}
      <input ref={gallery} type="file" accept="image/*" className="sr-only"
        onChange={e => handleFile(e.target.files?.[0])} />
    </div>
  )
}
