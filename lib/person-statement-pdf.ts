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

export async function personStatementPdf(s: PersonStatement): Promise<Blob> {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const left = 16, right = 194
  let y = 22
  const total = s.purchases.reduce((sum, t) => sum + t.amount, 0)
  const newPageIfNeeded = (h: number) => { if (y + h > 280) { doc.addPage(); y = 20 } }

  doc.setFont('helvetica', 'bold'); doc.setFontSize(18)
  doc.text(`Fatura de ${s.personName}`, left, y); y += 8
  doc.setFont('helvetica', 'normal'); doc.setFontSize(11); doc.setTextColor(90)
  doc.text(`Cartão ${s.cardName}${s.cardLast4 ? ` final ${s.cardLast4}` : ''} · titular ${s.ownerName}`, left, y); y += 6
  doc.text(`Fatura de ${monthLabel(s.invoiceRef)} · vence ${formatDate(s.dueDate)}`, left, y); y += 10

  doc.setTextColor(0); doc.setFont('helvetica', 'bold'); doc.setFontSize(14)
  doc.text('Total a pagar', left, y)
  doc.text(formatCurrency(total), right, y, { align: 'right' }); y += 10

  doc.setFontSize(10); doc.setTextColor(90)
  doc.text('Data', left, y); doc.text('Onde', left + 24, y); doc.text('Parcela', left + 120, y); doc.text('Valor', right, y, { align: 'right' })
  y += 2; doc.setDrawColor(220); doc.line(left, y, right, y); y += 6

  for (const t of [...s.purchases].sort((a, b) => a.date.localeCompare(b.date))) {
    const items = Array.isArray(t.sourceData?.items) ? (t.sourceData!.items as { name: string; amount: number }[]) : []
    newPageIfNeeded(8 + items.length * 5)
    doc.setFont('helvetica', 'normal'); doc.setFontSize(11); doc.setTextColor(0)
    doc.text(formatDate(t.date).slice(0, 5), left, y)
    doc.text(doc.splitTextToSize(t.place ?? t.description ?? 'Compra', 92)[0], left + 24, y)
    if (t.installmentN) doc.text(`${t.installmentN} de ${t.installmentsTotal}`, left + 120, y)
    doc.text(formatCurrency(t.amount), right, y, { align: 'right' })
    y += 5
    doc.setFontSize(9); doc.setTextColor(110)
    for (const it of items) {
      doc.text(`· ${it.name}${it.amount ? `  ${formatCurrency(it.amount)}` : ''}`, left + 26, y); y += 4.5
    }
    y += 2
  }

  newPageIfNeeded(16)
  y += 4; doc.setDrawColor(220); doc.line(left, y, right, y); y += 7
  doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.setTextColor(0)
  doc.text(`${s.purchases.length} ${s.purchases.length === 1 ? 'compra' : 'compras'}`, left, y)
  doc.text(formatCurrency(total), right, y, { align: 'right' })
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(140)
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
