'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { ButtonRow } from '@/components/ios/button-row'
import { MemberAvatar } from '@/components/family/member-avatar'
import { FormError } from '@/components/shared/form-error'
import { LoadingBlock } from '@/components/shared/loading-dots'
import { PhotoCropper } from './photo-cropper'
import { loadImage, renderAvatar, type CropRect } from '@/lib/avatar'

// Foto nova já cortada e comprimida, 'remove' para voltar à inicial, null = sem mudança.
export type PhotoChange = Blob | 'remove' | null

interface Props {
  name: string
  color: string
  current: string | null
  value: PhotoChange
  onChange: (v: PhotoChange) => void
  cropping: boolean
  onCroppingChange: (v: boolean) => void
}

// Foto de perfil no formulário: prévia grande, Adicionar/Editar e Remover. Ao escolher a imagem,
// abre o recorte quadrado no lugar do formulário; "Pronto" gera a foto final (512 px) no aparelho.
export function ProfilePhotoField({ name, color, current, value, onChange, cropping, onCroppingChange }: Props) {
  const input = useRef<HTMLInputElement>(null)
  const [image, setImage] = useState<HTMLImageElement | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const crop = useRef<CropRect | null>(null)
  const onCropChange = useCallback((c: CropRect) => { crop.current = c }, [])

  // prévia da foto nova enquanto não salva
  const [preview, setPreview] = useState<string | null>(null)
  function showPreview(blob: Blob | null) {
    setPreview(old => { if (old) URL.revokeObjectURL(old); return blob ? URL.createObjectURL(blob) : null })
  }

  // libera a imagem aberta para recorte
  useEffect(() => () => { if (image) URL.revokeObjectURL(image.src) }, [image])

  const shown = value === 'remove' ? null : (value instanceof Blob ? preview : null) ?? current

  async function pick(file: File | undefined) {
    if (!file) return
    setError(null)
    try {
      setImage(await loadImage(URL.createObjectURL(file)))
      onCroppingChange(true)
    } catch (err) { setError(err instanceof Error ? err.message : 'Não foi possível abrir a imagem.') }
  }

  function closeCrop() {
    setImage(null)
    onCroppingChange(false)
  }

  async function confirm() {
    if (!image || !crop.current) return
    setBusy(true)
    try {
      const blob = await renderAvatar(image, crop.current)
      showPreview(blob)
      onChange(blob)
      closeCrop()
    } catch (err) { setError(err instanceof Error ? err.message : 'Não foi possível preparar a foto.') }
    finally { setBusy(false) }
  }

  if (cropping && image) {
    return (
      <div className="space-y-6">
        {busy ? <LoadingBlock /> : <PhotoCropper image={image} onCropChange={onCropChange} />}
        <FormError message={error} />
        <ButtonRow>
          <Button type="button" variant="secondary" size="lg" onClick={closeCrop}>Cancelar</Button>
          <Button type="button" size="lg" disabled={busy} onClick={confirm}>Pronto</Button>
        </ButtonRow>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <MemberAvatar name={name || '?'} color={color} src={shown} size="xl" />
      <div className="flex gap-2">
        <Button type="button" variant="secondary" size="sm" onClick={() => input.current?.click()}>
          {shown ? 'Editar foto' : 'Adicionar foto'}
        </Button>
        {shown && (
          <Button type="button" variant="plain-destructive" size="sm" onClick={() => { showPreview(null); onChange(current ? 'remove' : null) }}>
            Remover foto
          </Button>
        )}
      </div>
      <input ref={input} type="file" accept="image/*" className="sr-only"
        onChange={e => { pick(e.target.files?.[0]); e.target.value = '' }} />
      <FormError message={error} />
    </div>
  )
}
