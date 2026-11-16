// Leitura do PDF da fatura do cartão: tira o texto (pdf.js, no celular) e acha os lançamentos
// (data, descrição, parcela, valor). Funciona com o formato da maioria dos bancos:
// "13/10 MP*MP Parcela 1 de 3 R$ 1.055,53" e "02 OUT •••• 6084 Loja - Parcela 10/12 R$ 57,42".
// Faturas em duas colunas (Porto Seguro, Santander) juntam lançamentos na mesma linha, sem "R$":
// "10/09/2 EXPRESSO GUANABARA 02/04 37,74" e "1 22/11 FRANCISCODAS 12/18 494,91 3 17/10 POSTO 50,00".
import { addMonths } from './utils'

export interface StatementItem {
  date: string          // AAAA-MM-DD
  description: string
  amount: number        // centavos
  installmentN: number | null
  installmentsTotal: number | null
}

export interface Statement {
  items: StatementItem[]
  total: number | null     // "Total a pagar" da fatura, se achar
  carried: number | null   // saldo da fatura anterior que não foi pago e veio para esta
  revolvingRate: number | null  // "Juros do rotativo 17,90% a.m." (taxa do cliente, % ao mês)
}

const MONTHS: Record<string, number> = { JAN: 1, FEV: 2, MAR: 3, ABR: 4, MAI: 5, JUN: 6, JUL: 7, AGO: 8, SET: 9, OUT: 10, NOV: 11, DEZ: 12 }
const cents = (v: string) => Math.round(Number(v.replace(/\./g, '').replace(',', '.')) * 100)
// pagamentos, créditos e estornos não são compras
const NOT_PURCHASE = /pagamento (da fatura|de fatura|recebido)|^pagamento$|cr[eé]dito de|estorno|pagamentos e (cr[eé]ditos|financiamentos)/i

// Texto do PDF em linhas, juntando os pedaços que estão na mesma altura da página.
// PDF com senha (alguns bancos protegem com parte do CPF): askPassword pede a senha à pessoa.
export async function pdfLines(data: ArrayBuffer, askPassword?: (wrong: boolean) => string | null): Promise<string[]> {
  const pdfjs = await import('pdfjs-dist')
  if (typeof window !== 'undefined') pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs'
  const task = pdfjs.getDocument({ data: new Uint8Array(data) })
  task.onPassword = (update: (password: string) => void, reason: number) => {
    const password = askPassword?.(reason === pdfjs.PasswordResponses.INCORRECT_PASSWORD) ?? null
    if (password == null) task.destroy()
    else update(password)
  }
  const doc = await task.promise
  const lines: string[] = []
  for (let p = 1; p <= doc.numPages; p++) {
    const content = await (await doc.getPage(p)).getTextContent()
    lines.push(...groupLines(content.items as { str?: string; transform: number[] }[]))
  }
  return lines
}

// Junta em uma linha os pedaços de texto com quase a mesma altura (até 5 pontos de diferença).
export function groupLines(items: { str?: string; transform: number[] }[]): string[] {
  const parts = items.filter(i => i.str?.trim()).map(i => ({ x: i.transform[4], y: i.transform[5], s: i.str!.trim() }))
    .sort((a, b) => b.y - a.y || a.x - b.x)
  const rows: { y: number; parts: typeof parts }[] = []
  for (const part of parts) {
    const row = rows.find(r => Math.abs(r.y - part.y) <= 5)
    if (row) row.parts.push(part)
    else rows.push({ y: part.y, parts: [part] })
  }
  return rows.map(r => r.parts.sort((a, b) => a.x - b.x).map(x => x.s).join(' ').replace(/\s+/g, ' '))
}

// Vencimento escrito na fatura: "Vence em 13/11/2026", "Vencimento: 13/11/2026", "Data de vencimento: 09 NOV 2026".
export function findDueDate(lines: string[]): string | null {
  for (const line of lines) {
    const a = line.match(/venc\w*[^0-9]{0,20}(\d{2})\/(\d{2})\/(\d{4})/i)
    if (a) return `${a[3]}-${a[2]}-${a[1]}`
    const b = line.match(/venc\w*[^0-9]{0,20}(\d{2})\s+(JAN|FEV|MAR|ABR|MAI|JUN|JUL|AGO|SET|OUT|NOV|DEZ)\w*\s+(\d{4})/i)
    if (b) return `${b[3]}-${String(MONTHS[b[2].toUpperCase()]).padStart(2, '0')}-${b[1]}`
  }
  // às vezes o rótulo e a data ficam em linhas separadas: "Vencimento" e, até 3 linhas abaixo, "08/11/2026"
  for (let i = 0; i < lines.length; i++) {
    if (!/\bvenc(e|imento)\b/i.test(lines[i])) continue
    for (const next of lines.slice(i + 1, i + 4)) {
      const d = next.match(/(\d{2})\/(\d{2})\/(\d{4})/)
      if (d) return `${d[3]}-${d[2]}-${d[1]}`
    }
  }
  return null
}

// Lançamentos soltos numa linha (faturas em colunas): data dd/mm[/a], descrição, parcela opcional e valor.
const LOOSE_ITEM = /(?:^|\s)(\d{2})\/(\d{2})(?:\/\d{1,4})?\s+(.+?)\s+(?:(\d{1,2})\/(\d{1,2})\s+)?(-?\d{1,3}(?:\.\d{3})*,\d{2})(?=\s|$)/g
const TOTAL_PATTERNS = [
  /total desta fatura:?\s*(?:R\$)?\s*([\d.]+,\d{2})/i,
  /saldo desta fatura\s*(?:R\$)?\s*([\d.]+,\d{2})/i,
  /(?<!valor )total (?:a pagar|da fatura)\s*R\$\s*([\d.]+,\d{2})/i,
  /^total\s*R\$\s*([\d.]+,\d{2})$/i,
]

// dueDate (AAAA-MM-DD) define o ano das datas sem ano: mês depois do vencimento é do ano anterior.
export function parseStatement(lines: string[], dueDate: string): Statement {
  const dueYear = Number(dueDate.slice(0, 4))
  const dueMonth = Number(dueDate.slice(5, 7))
  const raw: (StatementItem & { negative: boolean })[] = []
  let total: number | null = null
  let previous: number | null = null
  let received = 0
  let revolvingRate: number | null = null

  // total: o padrão mais específico ganha ("Total desta fatura" antes de "Total a pagar" de simulações)
  for (const pattern of TOTAL_PATTERNS) {
    for (const line of lines) {
      const t = line.match(pattern)
      if (t) { total = cents(t[1]); break }
    }
    if (total != null) break
  }
  const loose: typeof raw = []

  for (const line of lines) {
    const prev = line.match(/^fatura anterior\s*R\$\s*([\d.]+,\d{2})/i)
    if (prev && previous == null) previous = cents(prev[1])
    const rate = line.match(/juros\s+(?:do\s+)?rotativo\s*([\d]+,\d{1,2})\s*%\s*a\.?\s*m/i)
      ?? line.match(/(?<!CET\s)rotativo:?\s*(?:juros:?\s*)?([\d]+,\d{1,2})\s*%\s*a\.?\s*m/i)
    if (rate && revolvingRate == null) revolvingRate = Number(rate[1].replace(',', '.'))
    const paid = line.match(/^pagamento recebido\s*R\$\s*([\d.]+,\d{2})/i)
    if (paid) received = cents(paid[1])

    const m = line.match(/^(\d{2})(?:\/(\d{2})(?![\/\d])|\s+(JAN|FEV|MAR|ABR|MAI|JUN|JUL|AGO|SET|OUT|NOV|DEZ))\b\s*(.*?)\s*([−-])?\s*R\$\s*([\d.]+,\d{2})$/i)
    if (!m) {
      for (const l of line.matchAll(LOOSE_ITEM)) {
        const day = Number(l[1]), month = Number(l[2])
        const amount = cents(l[6].replace('-', ''))
        if (!month || month > 12 || !day || day > 31 || !amount) continue
        let desc = l[3].trim()
        let n = l[4] ? Number(l[4]) : null
        let of = l[5] ? Number(l[5]) : null
        // parcela no meio da descrição, antes da cidade: "AMAZON BR *Amazon 05/09 Sao"
        const mid = n == null ? desc.match(/\s(\d{2})\/(\d{2})(?=\s|$)/) : null
        if (mid && Number(mid[1]) <= Number(mid[2])) {
          n = Number(mid[1]); of = Number(mid[2])
          desc = (desc.slice(0, mid.index) + desc.slice((mid.index ?? 0) + mid[0].length)).trim()
        }
        if (n != null && (of == null || n > of || of > 99)) { n = null; of = null }
        const year = month > dueMonth ? dueYear - 1 : dueYear
        loose.push({
          date: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
          description: desc || 'Lançamento da fatura',
          amount,
          installmentN: of != null && of > 1 ? n : null,
          installmentsTotal: of != null && of > 1 ? of : null,
          negative: l[6].startsWith('-'),
        })
      }
      continue
    }
    const day = Number(m[1])
    const month = m[2] ? Number(m[2]) : MONTHS[m[3].toUpperCase()]
    if (!month || month > 12 || day > 31) continue
    let desc = m[4].replace(/^[•\s*]*\d{4}\s+/, '').replace(/^•+\s*\d{4}\s*/, '').trim()
    const inst = desc.match(/[-–]?\s*parcela\s*(\d+)\s*(?:de|\/)\s*(\d+)\s*$/i) ?? desc.match(/\s(\d{1,2})\/(\d{1,2})\s*$/)
    if (inst) desc = desc.slice(0, inst.index).replace(/[-–]\s*$/, '').trim()
    const year = month > dueMonth ? dueYear - 1 : dueYear
    raw.push({
      date: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
      description: desc || 'Lançamento da fatura',
      amount: cents(m[6]),
      installmentN: inst ? Number(inst[1]) : null,
      installmentsTotal: inst ? Number(inst[2]) : null,
      negative: !!m[5],
    })
  }

  // formato de colunas: só vale se o formato de uma compra por linha não achou nada
  if (!raw.length) raw.push(...loose)

  // um crédito com o mesmo valor e data de um débito anula os dois (ex.: "Crédito de atraso" e "Saldo em atraso")
  const used = new Set<number>()
  raw.forEach((r, i) => {
    if (!r.negative) return
    used.add(i)
    const j = raw.findIndex((o, k) => !used.has(k) && !o.negative && o.amount === r.amount && o.date === r.date)
    if (j >= 0) used.add(j)
  })
  const items = raw.filter((r, i) => !used.has(i) && !NOT_PURCHASE.test(r.description))
    .map(({ negative: _n, ...item }) => item) // eslint-disable-line @typescript-eslint/no-unused-vars
  const carried = previous != null && previous - received > 0 ? previous - received : null
  return { items, total, carried, revolvingRate }
}

// Primeira data da compra parcelada. Alguns bancos mostram a data original da compra (que pode ser
// de anos anteriores, ex.: parcela 16 de 24), outros a data desta parcela.
export function installmentFirstDate(item: StatementItem, invoiceRef: string): string {
  const n = item.installmentN ?? 1
  const fits = (month: string) => month === invoiceRef || month === addMonths(invoiceRef, -1)
  for (let back = 0; back <= 4; back++) {
    const candidate = `${Number(item.date.slice(0, 4)) - back}${item.date.slice(4)}`
    if (fits(addMonths(candidate.slice(0, 7), n - 1))) return candidate
  }
  return `${addMonths(item.date.slice(0, 7), -(n - 1))}${item.date.slice(7)}`
}
