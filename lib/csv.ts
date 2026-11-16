import type { Category, Transaction, Wallet } from './types'

// DAD-1 e DAD-2: exportar e importar lançamentos em CSV (separador ponto e vírgula, padrão do Excel no Brasil).

const TYPE_PT: Record<string, string> = {
  expense: 'gasto', income: 'receita', save_apply: 'guardar', save_redeem: 'resgatar',
  invoice_payment: 'pagamento de fatura', settlement_payment: 'acerto',
}
const TYPE_FROM_PT: Record<string, 'expense' | 'income' | 'save_apply' | 'save_redeem'> = {
  gasto: 'expense', despesa: 'expense', expense: 'expense', saida: 'expense', 'saída': 'expense',
  receita: 'income', income: 'income', entrada: 'income',
  guardar: 'save_apply', aplicar: 'save_apply', resgatar: 'save_redeem', resgate: 'save_redeem',
}

function esc(v: string) {
  return /[;"\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v
}

export function toCsv(rows: Transaction[], categories: Category[], wallets: Wallet[]): string {
  const cat = new Map(categories.map(c => [c.id, c.name]))
  const wal = new Map(wallets.map(w => [w.id, w.name]))
  const header = ['data', 'tipo', 'valor', 'categoria', 'carteira', 'local', 'descricao', 'origem']
  const lines = rows.map(t => [
    t.date,
    TYPE_PT[t.type] ?? t.type,
    (t.amount / 100).toFixed(2).replace('.', ','),
    (t.categoryId && cat.get(t.categoryId)) || '',
    (t.walletId && wal.get(t.walletId)) || t.walletNameSnapshot || '',
    t.place ?? '',
    t.description ?? '',
    t.source,
  ].map(v => esc(String(v))).join(';'))
  return [header.join(';'), ...lines].join('\n')
}

// Parser simples de CSV (aceita ; ou , como separador e aspas).
export function parseCsv(text: string): string[][] {
  const firstLine = text.split(/\r?\n/, 1)[0] ?? ''
  const sep = (firstLine.match(/;/g)?.length ?? 0) >= (firstLine.match(/,/g)?.length ?? 0) ? ';' : ','
  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let quoted = false
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++ }
      else if (ch === '"') quoted = false
      else cell += ch
    } else if (ch === '"') quoted = true
    else if (ch === sep) { row.push(cell); cell = '' }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++
      row.push(cell); cell = ''
      if (row.some(c => c.trim())) rows.push(row)
      row = []
    } else cell += ch
  }
  row.push(cell)
  if (row.some(c => c.trim())) rows.push(row)
  return rows
}

export type ImportField = 'date' | 'type' | 'amount' | 'category' | 'wallet' | 'place' | 'description' | 'ignore'

export const FIELD_LABEL: Record<ImportField, string> = {
  date: 'Data', type: 'Tipo', amount: 'Valor', category: 'Categoria', wallet: 'Carteira',
  place: 'Local', description: 'Descrição', ignore: 'Ignorar',
}

// Sugere o campo de cada coluna pelo nome do cabeçalho.
export function guessField(header: string): ImportField {
  const h = header.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()
  if (/data|date|dia/.test(h)) return 'date'
  if (/tipo|type/.test(h)) return 'type'
  if (/valor|amount|quantia|preco/.test(h)) return 'amount'
  if (/categ/.test(h)) return 'category'
  if (/carteira|conta|cartao|wallet|meio/.test(h)) return 'wallet'
  if (/local|estabelec|onde|merchant|loja/.test(h)) return 'place'
  if (/descr|histor|memo|obs/.test(h)) return 'description'
  return 'ignore'
}

// Data em dd/mm/aaaa ou aaaa-mm-dd para AAAA-MM-DD.
export function parseDate(v: string): string | null {
  const s = v.trim()
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (m) return `${m[1]}-${m[2]}-${m[3]}`
  m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/)
  if (m) {
    const y = m[3].length === 2 ? `20${m[3]}` : m[3]
    return `${y}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`
  }
  return null
}

export function parseType(v: string) {
  const key = v.normalize('NFD').replace(/\p{Diacritic}/gu, '').trim().toLowerCase()
  return TYPE_FROM_PT[key] ?? null
}

// Extrato OFX (bancos e cartões) para as mesmas linhas do CSV: Data, Tipo, Valor, Local.
// Em extrato de cartão, valores positivos são pagamentos e créditos da fatura e ficam de fora.
export function parseOfx(text: string): string[][] {
  const card = /<CREDITCARDMSGSRSV1>/i.test(text)
  const tag = (block: string, name: string) => block.match(new RegExp(`<${name}>([^<\\r\\n]*)`, 'i'))?.[1]?.trim() ?? ''
  const rows: string[][] = [['Data', 'Tipo', 'Valor', 'Local']]
  for (const m of text.matchAll(/<STMTTRN>([\s\S]*?)<\/STMTTRN>/gi)) {
    const b = m[1]
    const d = tag(b, 'DTPOSTED')
    const amount = Number(tag(b, 'TRNAMT'))
    if (!/^\d{8}/.test(d) || !Number.isFinite(amount) || amount === 0) continue
    if (card && amount > 0) continue
    const date = `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`
    const value = Math.abs(amount).toFixed(2).replace('.', ',')
    rows.push([date, amount < 0 ? 'Gasto' : 'Receita', value, tag(b, 'MEMO') || tag(b, 'NAME')])
  }
  return rows
}
