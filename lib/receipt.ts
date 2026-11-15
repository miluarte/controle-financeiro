import { supabase } from './supabase/client'
import { parseCents, todayIso } from './utils'

// 5.4: leitura de nota fiscal por foto.
// 1. Gemini (Edge Function ler-nota). 2. Se não der (sem chave, limite gratuito, erro),
// leitura local com Tesseract.js no próprio celular, mais simples e menos precisa.

export interface ReceiptItem { name: string; amount: number }

export interface ReceiptResult {
  amount: number          // centavos
  place: string | null
  date: string | null     // AAAA-MM-DD
  items: ReceiptItem[]
  categoryId: string | null
  source: 'gemini' | 'ocr'
}

// Reduz a foto para no máximo 1600 px e JPEG, para caber no envio e ler mais rápido.
async function loadImage(file: File): Promise<CanvasImageSource & { width: number; height: number }> {
  try {
    return await createImageBitmap(file)
  } catch {
    // alguns formatos/versões do Safari não aceitam createImageBitmap: usa <img>
    const url = URL.createObjectURL(file)
    try {
      const img = new Image()
      img.src = url
      await img.decode()
      return img
    } finally {
      setTimeout(() => URL.revokeObjectURL(url), 1000)
    }
  }
}

export async function prepareImage(file: File): Promise<Blob> {
  const bitmap = await loadImage(file)
  const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  return new Promise((resolve, reject) =>
    canvas.toBlob(b => (b ? resolve(b) : reject(new Error('Não foi possível ler a imagem.'))), 'image/jpeg', 0.82))
}

async function toBase64(blob: Blob): Promise<string> {
  const buf = new Uint8Array(await blob.arrayBuffer())
  let s = ''
  for (let i = 0; i < buf.length; i += 0x8000) s += String.fromCharCode(...buf.subarray(i, i + 0x8000))
  return btoa(s)
}

// Desiste da etapa se passar do tempo, com mensagem clara.
function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), ms)
    promise.then(v => { clearTimeout(timer); resolve(v) }, e => { clearTimeout(timer); reject(e) })
  })
}

export type ReceiptStatus = (text: string) => void

async function readWithGemini(image: Blob): Promise<ReceiptResult | null> {
  try {
    const { data, error } = await withTimeout(supabase.functions.invoke('ler-nota', {
      body: { image: await toBase64(image), mimeType: 'image/jpeg' },
    }), 25_000, 'gemini-timeout')
    if (error || !data?.ok || !data.amount) return null
    return { ...data, source: 'gemini' }
  } catch {
    return null
  }
}

// Reserva: OCR local e regras simples para achar total, data e nome da loja.
async function readWithOcr(image: Blob, onStatus?: ReceiptStatus): Promise<ReceiptResult> {
  onStatus?.('Preparando o leitor do celular…')
  const { default: Tesseract } = await import('tesseract.js')
  const { data } = await withTimeout(
    Tesseract.recognize(image, 'por', {
      logger: m => {
        const pct = Math.round((m.progress ?? 0) * 100)
        if (m.status?.includes('traineddata') || m.status?.includes('loading')) onStatus?.(`Baixando o leitor (só na primeira vez)… ${pct}%`)
        else if (m.status === 'recognizing text') onStatus?.(`Lendo a nota… ${pct}%`)
      },
    }),
    120_000,
    'A leitura no celular demorou demais. Confira a internet e tente de novo, ou digite os dados.',
  )
  const lines = data.text.split('\n').map(l => l.trim()).filter(Boolean)

  const money = /(\d{1,3}(?:\.\d{3})*,\d{2})/g
  const totalLine = [...lines].reverse().find(l => /valor\s*(a\s*)?pagar|total/i.test(l) && money.test(l))
  money.lastIndex = 0
  let amount = 0
  if (totalLine) {
    const values = totalLine.match(money) ?? []
    amount = parseCents(values[values.length - 1] ?? '') ?? 0
  } else {
    // sem linha de total: maior valor da nota
    for (const l of lines) for (const v of l.match(money) ?? []) amount = Math.max(amount, parseCents(v) ?? 0)
  }

  const d = data.text.match(/(\d{2})\/(\d{2})\/(\d{2,4})/)
  const date = d ? `${d[3].length === 2 ? `20${d[3]}` : d[3]}-${d[2]}-${d[1]}` : null
  const place = lines.find(l => /[a-zà-ú]{3,}/i.test(l) && !/cnpj|cpf|cupom|nota|fiscal|documento|\d{2}\.\d{3}/i.test(l)) ?? null

  return { amount, place: place?.slice(0, 60) ?? null, date: date && date <= todayIso() ? date : null, items: [], categoryId: null, source: 'ocr' }
}

export async function readReceipt(file: File, onStatus?: ReceiptStatus): Promise<{ result: ReceiptResult; image: Blob }> {
  onStatus?.('Preparando a foto…')
  const image = await prepareImage(file)
  onStatus?.('Lendo a nota…')
  const result = (await readWithGemini(image)) ?? (await readWithOcr(image, onStatus))
  return { result, image }
}

// Anexa a foto como comprovante (bucket privado, pasta da pessoa).
export async function uploadReceipt(userId: string, image: Blob): Promise<string> {
  const path = `${userId}/${crypto.randomUUID()}.jpg`
  const { error } = await supabase.storage.from('receipts').upload(path, image, { contentType: 'image/jpeg' })
  if (error) throw new Error(error.message)
  return path
}

export async function receiptUrl(path: string): Promise<string | null> {
  const { data } = await supabase.storage.from('receipts').createSignedUrl(path, 60 * 10)
  return data?.signedUrl ?? null
}
