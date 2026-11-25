import type { Transaction } from './types'
import { formatCurrency, formatDate, monthLabel } from './utils'

// "Fatura" de uma pessoa num cartão compartilhado: só as compras dela naquela fatura, com data,
// local, parcela, itens e o total que ela deve. Gera o PDF no próprio celular (jsPDF).
export interface PersonStatement {
  cardName: string
  cardLast4: string | null
  ownerName: string
  personName: string
  invoiceRef: string   // AAAA-MM
  dueDate: string      // AAAA-MM-DD
  purchases: Transaction[]
}

// Estilo do PDF (jsPDF não lê CSS): tamanhos em pt e cinzas de 0 (preto) a 255 (branco).
const PDF_STYLE = {
  font: 'helvetica',
  size: { title: 18, total: 14, footerTotal: 12, body: 11, header: 10, item: 9, note: 8 },
  gray: { text: 0, secondary: 90, item: 110, note: 140, line: 220 },
} as const

type Doc = InstanceType<typeof import('jspdf').jsPDF>
const LEFT = 16, RIGHT = 194

// Tabela de compras (data, onde, parcela, valor e itens) a partir de y; devolve o novo y.
function drawPurchases(doc: Doc, purchases: Transaction[], y: number, newPageIfNeeded: (y: number, h: number) => number): number {
  doc.setFont(PDF_STYLE.font, 'normal'); doc.setFontSize(PDF_STYLE.size.header); doc.setTextColor(PDF_STYLE.gray.secondary)
  doc.text('Data', LEFT, y); doc.text('Onde', LEFT + 24, y); doc.text('Parcela', LEFT + 120, y); doc.text('Valor', RIGHT, y, { align: 'right' })
  y += 2; doc.setDrawColor(PDF_STYLE.gray.line); doc.line(LEFT, y, RIGHT, y); y += 6

  for (const t of [...purchases].sort((a, b) => a.date.localeCompare(b.date))) {
    const items = Array.isArray(t.sourceData?.items) ? (t.sourceData!.items as { name: string; amount: number }[]) : []
    y = newPageIfNeeded(y, 8 + items.length * 5)
    doc.setFont(PDF_STYLE.font, 'normal'); doc.setFontSize(PDF_STYLE.size.body); doc.setTextColor(PDF_STYLE.gray.text)
    doc.text(formatDate(t.date).slice(0, 5), LEFT, y)
    doc.text(doc.splitTextToSize(t.place ?? t.description ?? 'Compra', 92)[0], LEFT + 24, y)
    if (t.installmentN) doc.text(`${t.installmentN} de ${t.installmentsTotal}`, LEFT + 120, y)
    doc.text(formatCurrency(t.amount), RIGHT, y, { align: 'right' })
    y += 5
    doc.setFontSize(PDF_STYLE.size.item); doc.setTextColor(PDF_STYLE.gray.item)
    for (const it of items) {
      doc.text(`· ${it.name}${it.amount ? `  ${formatCurrency(it.amount)}` : ''}`, LEFT + 26, y); y += 4.5
    }
    y += 2
  }
  return y
}

const pageBreak = (doc: Doc) => (y: number, h: number) => { if (y + h > 280) { doc.addPage(); return 20 } return y }

export async function personStatementPdf(s: PersonStatement): Promise<Blob> {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const left = LEFT, right = RIGHT
  let y = 22
  const total = s.purchases.reduce((sum, t) => sum + t.amount, 0)

  doc.setFont(PDF_STYLE.font, 'bold'); doc.setFontSize(PDF_STYLE.size.title)
  doc.text(`Fatura de ${s.personName}`, left, y); y += 8
  doc.setFont(PDF_STYLE.font, 'normal'); doc.setFontSize(PDF_STYLE.size.body); doc.setTextColor(PDF_STYLE.gray.secondary)
  doc.text(`Cartão ${s.cardName}${s.cardLast4 ? ` final ${s.cardLast4}` : ''} · titular ${s.ownerName}`, left, y); y += 6
  doc.text(`Fatura de ${monthLabel(s.invoiceRef)} · vence ${formatDate(s.dueDate)}`, left, y); y += 10

  doc.setTextColor(PDF_STYLE.gray.text); doc.setFont(PDF_STYLE.font, 'bold'); doc.setFontSize(PDF_STYLE.size.total)
  doc.text('Total a pagar', left, y)
  doc.text(formatCurrency(total), right, y, { align: 'right' }); y += 10

  y = drawPurchases(doc, s.purchases, y, pageBreak(doc))

  y = pageBreak(doc)(y, 16)
  y += 4; doc.setDrawColor(PDF_STYLE.gray.line); doc.line(left, y, right, y); y += 7
  doc.setFont(PDF_STYLE.font, 'bold'); doc.setFontSize(PDF_STYLE.size.footerTotal); doc.setTextColor(PDF_STYLE.gray.text)
  doc.text(`${s.purchases.length} ${s.purchases.length === 1 ? 'compra' : 'compras'}`, left, y)
  doc.text(formatCurrency(total), right, y, { align: 'right' })
  doc.setFont(PDF_STYLE.font, 'normal'); doc.setFontSize(PDF_STYLE.size.note); doc.setTextColor(PDF_STYLE.gray.note)
  doc.text('Gerado pelo Troco', left, 288)
  return doc.output('blob')
}

// Fatura geral entre duas pessoas: todas as faturas de cartão do mês (de todos os cartões) e os gastos
// divididos, em blocos. Cada bloco diz quem deve a quem; o topo traz o saldo final entre as duas.
export interface GeneralStatementSection {
  title: string        // ex.: "Nubank 0514 · titular Desterro"
  subtitle: string     // ex.: "Fatura de dezembro de 2026 · vence 10/12/2026 · Maria deve"
  purchases: Transaction[]
  total: number        // o que a pessoa deve nesta fatura
  settled: number      // já acertado
}
export interface GeneralStatement {
  title: string                 // "Fatura geral de Maria"
  subtitle: string              // "Com Desterro · vencimentos até dezembro de 2026"
  balanceLabel: string          // "Maria deve a Desterro"
  balance: number               // o que falta pagar, já com os acertos
  sections: GeneralStatementSection[]
  pix: { date: string; place: string; part: number; settled: number; note: string }[]
}

export async function generalStatementPdf(s: GeneralStatement): Promise<Blob> {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const next = pageBreak(doc)
  let y = 22

  doc.setFont(PDF_STYLE.font, 'bold'); doc.setFontSize(PDF_STYLE.size.title)
  doc.text(s.title, LEFT, y); y += 8
  doc.setFont(PDF_STYLE.font, 'normal'); doc.setFontSize(PDF_STYLE.size.body); doc.setTextColor(PDF_STYLE.gray.secondary)
  doc.text(s.subtitle, LEFT, y); y += 10
  doc.setTextColor(PDF_STYLE.gray.text); doc.setFont(PDF_STYLE.font, 'bold'); doc.setFontSize(PDF_STYLE.size.total)
  doc.text(s.balanceLabel, LEFT, y)
  doc.text(formatCurrency(s.balance), RIGHT, y, { align: 'right' }); y += 12

  for (const sec of s.sections) {
    y = next(y, 30)
    doc.setFont(PDF_STYLE.font, 'bold'); doc.setFontSize(PDF_STYLE.size.footerTotal); doc.setTextColor(PDF_STYLE.gray.text)
    doc.text(sec.title, LEFT, y)
    doc.text(formatCurrency(sec.total), RIGHT, y, { align: 'right' }); y += 5
    doc.setFont(PDF_STYLE.font, 'normal'); doc.setFontSize(PDF_STYLE.size.header); doc.setTextColor(PDF_STYLE.gray.secondary)
    doc.text(`${sec.subtitle}${sec.settled > 0 ? ` · ${formatCurrency(sec.settled)} acertado` : ''}`, LEFT, y); y += 7
    y = drawPurchases(doc, sec.purchases, y, next)
    y += 4
  }

  if (s.pix.length) {
    y = next(y, 24)
    doc.setFont(PDF_STYLE.font, 'bold'); doc.setFontSize(PDF_STYLE.size.footerTotal); doc.setTextColor(PDF_STYLE.gray.text)
    doc.text('Gastos divididos', LEFT, y); y += 7
    for (const p of s.pix) {
      y = next(y, 8)
      doc.setFont(PDF_STYLE.font, 'normal'); doc.setFontSize(PDF_STYLE.size.body); doc.setTextColor(PDF_STYLE.gray.text)
      doc.text(formatDate(p.date).slice(0, 5), LEFT, y)
      doc.text(doc.splitTextToSize(`${p.place} · ${p.note}`, 120)[0], LEFT + 24, y)
      doc.text(formatCurrency(p.part), RIGHT, y, { align: 'right' }); y += 6
    }
  }

  y = next(y, 16)
  y += 4; doc.setDrawColor(PDF_STYLE.gray.line); doc.line(LEFT, y, RIGHT, y); y += 7
  doc.setFont(PDF_STYLE.font, 'bold'); doc.setFontSize(PDF_STYLE.size.footerTotal); doc.setTextColor(PDF_STYLE.gray.text)
  doc.text(s.balanceLabel, LEFT, y)
  doc.text(formatCurrency(s.balance), RIGHT, y, { align: 'right' })
  doc.setFont(PDF_STYLE.font, 'normal'); doc.setFontSize(PDF_STYLE.size.note); doc.setTextColor(PDF_STYLE.gray.note)
  doc.text('Gerado pelo Troco', LEFT, 288)
  return doc.output('blob')
}

// No iPhone abre o compartilhar (WhatsApp, Arquivos…); no navegador, baixa o arquivo.
export async function shareOrDownload(blob: Blob, filename: string) {
  const file = new File([blob], filename, { type: 'application/pdf' })
  if (navigator.canShare?.({ files: [file] })) {
    try { await navigator.share({ files: [file], title: filename }); return } catch { /* cancelou: baixa */ }
  }
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = filename
  document.body.appendChild(a); a.click(); a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 5000)
}
