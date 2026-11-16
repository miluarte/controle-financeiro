'use client'

import { useRef, useState } from 'react'
import { CameraLinearIcon } from '@solar-icons/react'
import { Button } from '@/components/ui/button'
import { readReceipt, type ReceiptResult } from '@/lib/receipt'

// 5.4 passos 1 e 2: abre a câmera ou a galeria e lê a nota. O formulário só é preenchido; nada é salvo aqui.
export function ReceiptScanButton({ onRead }: { onRead: (result: ReceiptResult, image: Blob) => void }) {
  const gallery = useRef<HTMLInputElement>(null)
  const [reading, setReading] = useState(false)
  const [status, setStatus] = useState('Lendo a nota…')
  const [error, setError] = useState<string | null>(null)

  async function handleFile(file: File | undefined) {
    if (!file) return
    setReading(true); setError(null); setStatus('Lendo a nota…')
    try {
      const { result, image } = await readReceipt(file, setStatus)
      if (!result.amount) setError('Não consegui achar o total nesta foto. Tente outra mais nítida ou digite o valor.')
      onRead(result, image)
    } catch (err) {
      setError(err instanceof Error && err.message !== 'gemini-timeout'
        ? `Não foi possível ler a nota: ${err.message}`
        : 'Não foi possível ler a nota. Tente de novo ou digite os dados.')
    } finally {
      setReading(false)
      if (gallery.current) gallery.current.value = ''
    }
  }

  return (
    <div className="space-y-1.5">
      {reading ? (
        <Button type="button" variant="secondary" className="w-full rounded-full" disabled>{status}</Button>
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
