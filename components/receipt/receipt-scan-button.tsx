'use client'

import { useRef, useState } from 'react'
import { CameraLinearIcon } from '@solar-icons/react'
import { Button } from '@/components/ui/button'
import { readReceipt, type ReceiptResult } from '@/lib/receipt'

// 5.4 passos 1 e 2: abre a câmera ou a galeria e lê a nota. O formulário só é preenchido; nada é salvo aqui.
export function ReceiptScanButton({ onRead }: { onRead: (result: ReceiptResult, image: Blob) => void }) {
  const input = useRef<HTMLInputElement>(null)
  const [reading, setReading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleFile(file: File | undefined) {
    if (!file) return
    setReading(true); setError(null)
    try {
      const { result, image } = await readReceipt(file)
      if (!result.amount) setError('Não consegui achar o total nesta foto. Tente outra mais nítida ou digite o valor.')
      onRead(result, image)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível ler a nota.')
    } finally {
      setReading(false)
      if (input.current) input.current.value = ''
    }
  }

  return (
    <div className="space-y-1.5">
      <Button type="button" variant="secondary" className="w-full rounded-full" disabled={reading} onClick={() => input.current?.click()}>
        <CameraLinearIcon className="size-5" />
        {reading ? 'Lendo a nota…' : 'Ler nota fiscal'}
      </Button>
      <p className="px-4 text-center text-footnote text-muted-foreground">
        {error ?? 'Dica: cubra o CPF antes de fotografar. A foto não fica guardada, a menos que você escolha.'}
      </p>
      <input ref={input} type="file" accept="image/*" capture="environment" className="sr-only"
        onChange={e => handleFile(e.target.files?.[0])} />
    </div>
  )
}
