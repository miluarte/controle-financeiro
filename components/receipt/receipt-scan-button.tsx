'use client'

import { useEffect, useRef, useState } from 'react'
import { ProgressButton } from '@/components/shared/progress-button'
import { CameraLinearIcon } from '@solar-icons/react'
import { Button } from '@/components/ui/button'
import { LoadingDots } from '@/components/shared/loading-dots'
import { readReceipt, type ReceiptResult } from '@/lib/receipt'

// 5.4 passos 1 e 2: abre a câmera ou a galeria e lê a nota. O formulário só é preenchido; nada é salvo aqui.
// initialFile: foto já escolhida antes de abrir o formulário (atalho "Ler nota fiscal" do botão +).
export function ReceiptScanButton({ onRead, initialFile = null }: {
  onRead: (result: ReceiptResult, image: Blob) => void
  initialFile?: File | null
}) {
  const gallery = useRef<HTMLInputElement>(null)
  const [reading, setReading] = useState(false)
  const [status, setStatus] = useState('Lendo a nota…')
  const [error, setError] = useState<string | null>(null)
  // preenchimento do botão: o leitor do celular informa a %; a leitura online avança sozinha até 90%
  const [progress, setProgress] = useState(0)

  async function handleFile(file: File | undefined) {
    if (!file) return
    setReading(true); setError(null); setStatus('Lendo a nota…'); setProgress(5)
    const tick = setInterval(() => setProgress(p => p + (90 - p) * 0.06), 200)
    const onStatus = (text: string) => {
      setStatus(text.replace(/\s*\d+%$/, ''))
      const pct = text.match(/(\d+)%$/)
      if (pct) setProgress(p => Math.max(p, Number(pct[1])))
    }
    try {
      const { result, image } = await readReceipt(file, onStatus)
      clearInterval(tick); setProgress(100)
      await new Promise(r => setTimeout(r, 250))
      if (!result.amount) setError('Não consegui achar o total nesta foto. Tente outra mais nítida ou digite o valor.')
      onRead(result, image)
    } catch (err) {
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
          <LoadingDots size="sm" tone="current" label={status} />{status}
        </ProgressButton>
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
