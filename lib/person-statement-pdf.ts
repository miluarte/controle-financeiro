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

export async function personStatementPdf(s: PersonStatement): Promise<Blob> {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const left = 16, right = 194
  let y = 22
  const total = s.purchases.reduce((sum, t) => sum + t.amount, 0)
  const newPageIfNeeded = (h: number) => { if (y + h > 280) { doc.addPage(); y = 20 } }

  doc.setFont(PDF_STYLE.font, 'bold'); doc.setFontSize(PDF_STYLE.size.title)
  doc.text(`Fatura de ${s.personName}`, left, y); y += 8
  doc.setFont(PDF_STYLE.font, 'normal'); doc.setFontSize(PDF_STYLE.size.body); doc.setTextColor(PDF_STYLE.gray.secondary)
  doc.text(`Cartão ${s.cardName}${s.cardLast4 ? ` final ${s.cardLast4}` : ''} · titular ${s.ownerName}`, left, y); y += 6
  doc.text(`Fatura de ${monthLabel(s.invoiceRef)} · vence ${formatDate(s.dueDate)}`, left, y); y += 10

  doc.setTextColor(PDF_STYLE.gray.text); doc.setFont(PDF_STYLE.font, 'bold'); doc.setFontSize(PDF_STYLE.size.total)
  doc.text('Total a pagar', left, y)
  doc.text(formatCurrency(total), right, y, { align: 'right' }); y += 10

  doc.setFontSize(PDF_STYLE.size.header); doc.setTextColor(PDF_STYLE.gray.secondary)
  doc.text('Data', left, y); doc.text('Onde', left + 24, y); doc.text('Parcela', left + 120, y); doc.text('Valor', right, y, { align: 'right' })
  y += 2; doc.setDrawColor(PDF_STYLE.gray.line); doc.line(left, y, right, y); y += 6

  for (const t of [...s.purchases].sort((a, b) => a.date.localeCompare(b.date))) {
    const items = Array.isArray(t.sourceData?.items) ? (t.sourceData!.items as { name: string; amount: number }[]) : []
    newPageIfNeeded(8 + items.length * 5)
    doc.setFont(PDF_STYLE.font, 'normal'); doc.setFontSize(PDF_STYLE.size.body); doc.setTextColor(PDF_STYLE.gray.text)
    doc.text(formatDate(t.date).slice(0, 5), left, y)
    doc.text(doc.splitTextToSize(t.place ?? t.description ?? 'Compra', 92)[0], left + 24, y)
    if (t.installmentN) doc.text(`${t.installmentN} de ${t.installmentsTotal}`, left + 120, y)
    doc.text(formatCurrency(t.amount), right, y, { align: 'right' })
    y += 5
    doc.setFontSize(PDF_STYLE.size.item); doc.setTextColor(PDF_STYLE.gray.item)
    for (const it of items) {
      doc.text(`· ${it.name}${it.amount ? `  ${formatCurrency(it.amount)}` : ''}`, left + 26, y); y += 4.5
    }
    y += 2
  }

  newPageIfNeeded(16)
  y += 4; doc.setDrawColor(PDF_STYLE.gray.line); doc.line(left, y, right, y); y += 7
  doc.setFont(PDF_STYLE.font, 'bold'); doc.setFontSize(PDF_STYLE.size.footerTotal); doc.setTextColor(PDF_STYLE.gray.text)
  doc.text(`${s.purchases.length} ${s.purchases.length === 1 ? 'compra' : 'compras'}`, left, y)
  doc.text(formatCurrency(total), right, y, { align: 'right' })
  doc.setFont(PDF_STYLE.font, 'normal'); doc.setFontSize(PDF_STYLE.size.note); doc.setTextColor(PDF_STYLE.gray.note)
  doc.text('Gerado pelo Troco', left, 288)
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
