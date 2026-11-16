// Leitura do PDF da fatura do cartão: tira o texto (pdf.js, no celular) e acha os lançamentos
// (data, descrição, parcela, valor). Funciona com o formato da maioria dos bancos:
// "13/10 MP*MP Parcela 1 de 3 R$ 1.055,53" e "02 OUT •••• 6084 Loja - Parcela 10/12 R$ 57,42".
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
}

const MONTHS: Record<string, number> = { JAN: 1, FEV: 2, MAR: 3, ABR: 4, MAI: 5, JUN: 6, JUL: 7, AGO: 8, SET: 9, OUT: 10, NOV: 11, DEZ: 12 }
const cents = (v: string) => Math.round(Number(v.replace(/\./g, '').replace(',', '.')) * 100)
// pagamentos, créditos e estornos não são compras
const NOT_PURCHASE = /pagamento (da fatura|recebido)|cr[eé]dito de|estorno|pagamentos e (cr[eé]ditos|financiamentos)/i

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
  // às vezes o rótulo e a data ficam em linhas separadas: "Vence em" e, abaixo, "13/11/2026 ..."
  const i = lines.findIndex(l => /^vence\s*em$|^vencimento$/i.test(l.trim()))
  const next = i >= 0 ? lines[i + 1]?.match(/(\d{2})\/(\d{2})\/(\d{4})/) : null
  return next ? `${next[3]}-${next[2]}-${next[1]}` : null
}

// dueDate (AAAA-MM-DD) define o ano das datas sem ano: mês depois do vencimento é do ano anterior.
export function parseStatement(lines: string[], dueDate: string): Statement {
  const dueYear = Number(dueDate.slice(0, 4))
  const dueMonth = Number(dueDate.slice(5, 7))
  const raw: (StatementItem & { negative: boolean })[] = []
  let total: number | null = null
  let previous: number | null = null
  let received = 0

  for (const line of lines) {
    const t = line.match(/total (a pagar|da fatura)\s*R\$\s*([\d.]+,\d{2})/i) ?? line.match(/^total()\s*R\$\s*([\d.]+,\d{2})$/i)
    if (t && total == null) total = cents(t[2])
    const prev = line.match(/^fatura anterior\s*R\$\s*([\d.]+,\d{2})/i)
    if (prev && previous == null) previous = cents(prev[1])
    const paid = line.match(/^pagamento recebido\s*R\$\s*([\d.]+,\d{2})/i)
    if (paid) received = cents(paid[1])

    const m = line.match(/^(\d{2})(?:\/(\d{2})(?![\/\d])|\s+(JAN|FEV|MAR|ABR|MAI|JUN|JUL|AGO|SET|OUT|NOV|DEZ))\b\s*(.*?)\s*([−-])?\s*R\$\s*([\d.]+,\d{2})$/i)
    if (!m) continue
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
  return { items, total, carried }
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
