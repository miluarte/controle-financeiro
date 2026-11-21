import type { Wallet } from './types'
import { supabase } from './supabase/client'
import { parseCents, todayIso } from './utils'

// 5.4: leitura de nota fiscal por foto.
// 1. QR code da NFC-e na foto: consulta a Sefaz (Edge Function ler-qrcode), dados oficiais da nota.
// 2. Sem QR (ou Sefaz fora): Gemini lê a foto (Edge Function ler-nota). 3. Se não der (sem chave,
// limite gratuito, erro), leitura local com Tesseract.js no próprio celular, mais simples e menos precisa.

// owner: de quem é o item na compra dividida (id da pessoa ou 'split', dividido entre todos)
export interface ReceiptItem { name: string; amount: number; owner?: string }

export interface ReceiptResult {
  amount: number          // centavos
  place: string | null
  date: string | null     // AAAA-MM-DD
  items: ReceiptItem[]
  categoryId: string | null
  source: 'sefaz' | 'gemini' | 'ocr'
  // chave de acesso da NFC-e (44 dígitos), quando veio do QR code
  chave?: string | null
  // forma de pagamento impressa na nota, quando aparece
  payment: 'credito' | 'debito' | 'pix' | 'dinheiro' | null
  cardLast4: string | null
  installments: number   // 1 = à vista
}

// Na leitura local: "CRÉDITO", "DÉBITO", "PIX", "DINHEIRO" e o final do cartão ("****1234", "final 1234").
function paymentFromText(text: string): Pick<ReceiptResult, 'payment' | 'cardLast4' | 'installments'> {
  const t = text.normalize('NFD').replace(/\p{Diacritic}/gu, '').toUpperCase()
  const payment = /CREDITO/.test(t) ? 'credito' : /DEBITO/.test(t) ? 'debito' : /\bPIX\b/.test(t) ? 'pix' : /DINHEIRO/.test(t) ? 'dinheiro' : null
  const last4 = t.match(/(?:\*{2,}|X{2,}|FINAL\s*)\s*(\d{4})\b/)?.[1] ?? null
  // "3X", "PARCELADO EM 3", "3 PARCELAS"
  const inst = Number(t.match(/\b(\d{1,2})\s*X\b|PARCELADO EM\s*(\d{1,2})|(\d{1,2})\s*PARCELAS/)?.slice(1).find(Boolean) ?? 1)
  return { payment, cardLast4: last4, installments: inst > 1 && inst <= 48 ? inst : 1 }
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

// Procura o QR code na foto (no celular, com jsQR). Tenta a foto inteira e depois a metade de baixo
// ampliada, onde o QR costuma ficar no cupom.
export async function findQrCode(file: File): Promise<string | null> {
  const { default: jsQR } = await import('jsqr')
  const bitmap = await loadImage(file)
  const tries: { sy: number; sh: number; max: number }[] = [
    { sy: 0, sh: 1, max: 1400 },
    { sy: 0.45, sh: 0.55, max: 1600 },
    { sy: 0, sh: 1, max: 2200 },
  ]
  for (const t of tries) {
    const sy = Math.round(bitmap.height * t.sy)
    const sh = Math.round(bitmap.height * t.sh)
    const scale = Math.min(1, t.max / Math.max(bitmap.width, sh))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(bitmap.width * scale)
    canvas.height = Math.round(sh * scale)
    const ctx = canvas.getContext('2d', { willReadFrequently: true })!
    ctx.drawImage(bitmap, 0, sy, bitmap.width, sh, 0, 0, canvas.width, canvas.height)
    const img = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const code = jsQR(img.data, img.width, img.height)
    if (code?.data) return code.data
  }
  return null
}

// QR da NFC-e aponta para a consulta da Sefaz do estado (site .gov.br)
export const isSefazUrl = (text: string) => {
  try { return /(^|\.)gov\.br$/i.test(new URL(text.trim()).hostname) } catch { return false }
}

async function readWithSefaz(url: string): Promise<ReceiptResult | null> {
  try {
    const { data, error } = await withTimeout(supabase.functions.invoke('ler-qrcode', { body: { url } }), 30_000, 'sefaz-timeout')
    if (error || !data?.ok || !data.amount) return null
    return { payment: null, cardLast4: null, installments: 1, ...data, source: 'sefaz' }
  } catch {
    return null
  }
}

async function readWithGemini(image: Blob): Promise<ReceiptResult | null> {
  try {
    const { data, error } = await withTimeout(supabase.functions.invoke('ler-nota', {
      body: { image: await toBase64(image), mimeType: 'image/jpeg' },
    }), 25_000, 'gemini-timeout')
    if (error || !data?.ok || !data.amount) return null
    return { payment: null, cardLast4: null, installments: 1, ...data, source: 'gemini' }
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

  return { amount, place: place?.slice(0, 60) ?? null, date: date && date <= todayIso() ? date : null, items: [], categoryId: null, source: 'ocr', ...paymentFromText(data.text) }
}

export async function readReceipt(file: File, onStatus?: ReceiptStatus): Promise<{ result: ReceiptResult; image: Blob }> {
  onStatus?.('Procurando o QR code…')
  const [qr, image] = await Promise.all([findQrCode(file).catch(() => null), prepareImage(file)])
  if (qr && isSefazUrl(qr)) {
    onStatus?.('Consultando a Sefaz…')
    const fromSefaz = await readWithSefaz(qr)
    if (fromSefaz) return { result: fromSefaz, image }
  }
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

// Carteira que bate com a forma de pagamento da nota: primeiro pelo final do cartão
// (preferindo crédito ou débito conforme a nota), depois pelo tipo quando só existe uma.
export function walletForReceipt(wallets: Wallet[], r: Pick<ReceiptResult, 'payment' | 'cardLast4'>): string | null {
  const own = wallets.filter(w => !w.ownerName && w.active)
  const type = r.payment === 'credito' ? 'credit' : r.payment === 'debito' ? 'debit' : r.payment === 'pix' ? 'pix' : r.payment === 'dinheiro' ? 'cash' : null
  if (r.cardLast4) {
    const byCard = own.filter(w => w.last4 === r.cardLast4)
    const match = byCard.find(w => w.type === type) ?? byCard[0]
    if (match) return match.id
  }
  if (type) {
    const byType = own.filter(w => w.type === type)
    if (byType.length === 1) return byType[0].id
  }
  return null
}
