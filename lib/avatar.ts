// Foto de perfil: recorte quadrado, reduzido e comprimido no aparelho antes de enviar.
// 512 px basta para a tela de alta densidade do iPhone (o maior avatar tem 96 pt = 288 px)
// e fica entre 20 e 60 KB.

export const AVATAR_SIZE = 512
const QUALITY = 0.85

// Recorte em pixels da imagem original.
export interface CropRect { x: number; y: number; size: number }

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Não foi possível abrir a imagem.'))
    img.src = src
  })
}

function canvasOf(size: number) {
  const c = document.createElement('canvas')
  c.width = size; c.height = size
  const ctx = c.getContext('2d')!
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  return { c, ctx }
}

function toBlob(canvas: HTMLCanvasElement, type: string): Promise<Blob | null> {
  return new Promise(resolve => canvas.toBlob(resolve, type, QUALITY))
}

// Corta, reduz pela metade em etapas (fica mais nítido que reduzir de uma vez) e comprime.
// WebP quando o navegador gera; senão JPEG (o Safari devolve PNG ao pedir WebP).
export async function renderAvatar(img: HTMLImageElement, crop: CropRect): Promise<Blob> {
  let size = Math.round(crop.size)
  let { c, ctx } = canvasOf(size)
  ctx.drawImage(img, crop.x, crop.y, crop.size, crop.size, 0, 0, size, size)
  while (size / 2 >= AVATAR_SIZE) {
    const next = canvasOf(Math.round(size / 2))
    next.ctx.drawImage(c, 0, 0, size, size, 0, 0, next.c.width, next.c.height)
    c = next.c; ctx = next.ctx; size = next.c.width
  }
  if (size !== AVATAR_SIZE) {
    const last = canvasOf(AVATAR_SIZE)
    last.ctx.drawImage(c, 0, 0, size, size, 0, 0, AVATAR_SIZE, AVATAR_SIZE)
    c = last.c
  }
  const webp = await toBlob(c, 'image/webp')
  if (webp?.type === 'image/webp') return webp
  const jpeg = await toBlob(c, 'image/jpeg')
  if (!jpeg) throw new Error('Não foi possível preparar a foto.')
  return jpeg
}
