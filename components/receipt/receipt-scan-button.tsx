'use client'

import { useRef, useState } from 'react'
import { CameraLinearIcon, GalleryLinearIcon } from '@solar-icons/react'
import { Button } from '@/components/ui/button'
import { readReceipt, type ReceiptResult } from '@/lib/receipt'

// 5.4 passos 1 e 2: abre a câmera ou a galeria e lê a nota. O formulário só é preenchido; nada é salvo aqui.
export function ReceiptScanButton({ onRead }: { onRead: (result: ReceiptResult, image: Blob) => void }) {
  const camera = useRef<HTMLInputElement>(null)
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
      if (camera.current) camera.current.value = ''
      if (gallery.current) gallery.current.value = ''
    }
  }

  return (
    <div className="space-y-1.5">
      {reading ? (
        <Button type="button" variant="secondary" className="w-full rounded-full" disabled>{status}</Button>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <Button type="button" variant="secondary" className="rounded-full" onClick={() => camera.current?.click()}>
            <CameraLinearIcon className="size-5" />Fotografar nota
          </Button>
          <Button type="button" variant="secondary" className="rounded-full" onClick={() => gallery.current?.click()}>
            <GalleryLinearIcon className="size-5" />Da galeria
          </Button>
        </div>
      )}
      <p className="px-4 text-center text-footnote text-muted-foreground">
        {error ?? 'Cubra o CPF antes da foto.'}
      </p>
      <input ref={camera} type="file" accept="image/*" capture="environment" className="sr-only"
        onChange={e => handleFile(e.target.files?.[0])} />
      <input ref={gallery} type="file" accept="image/*" className="sr-only"
        onChange={e => handleFile(e.target.files?.[0])} />
    </div>
  )
}
