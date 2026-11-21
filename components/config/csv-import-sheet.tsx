'use client'

import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { ListGroup } from '@/components/ios/list-group'
import { ModalSheet } from '@/components/ios/modal-sheet'
import { useCategories } from '@/hooks/use-categories'
import { useProfile } from '@/hooks/use-profile'
import { useRefresh } from '@/hooks/use-refresh'
import { useSession } from '@/hooks/use-session'
import { useWallets } from '@/hooks/use-wallets'
import { transactionsApi } from '@/lib/api/transactions'
import { FIELD_LABEL, guessField, parseCsv, parseDate, parseOfx, parseType, type ImportField } from '@/lib/csv'
import { WalletPicker } from '@/components/shared/wallet-picker'
import { StatementImport } from './statement-import'
import type { NewTransaction } from '@/lib/types'
import { formatCurrency, formatDate, parseCents } from '@/lib/utils'
import { useCategorySuggest } from '@/hooks/use-category-suggest'
import { feedback } from '@/lib/feedback'

// DAD-2: importar CSV ou OFX (extrato) com prévia, mapeamento e duplicadas, ou a fatura do cartão em PDF
// (StatementImport: compras que faltam, com parcela atual e quem fez a compra).
export function CsvImportSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  return (
    <ModalSheet open={open} onOpenChange={onOpenChange} title="Importar">
      {open && <Importer onDone={() => onOpenChange(false)} />}
    </ModalSheet>
  )
}

const norm = (s: string) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').trim().toLowerCase()

function Importer({ onDone }: { onDone: () => void }) {
  const { session } = useSession()
  const { categories } = useCategories()
  const { wallets } = useWallets()
  const { profile } = useProfile()
  const refresh = useRefresh()
  const suggest = useCategorySuggest()
  const [rows, setRows] = useState<string[][] | null>(null)
  const [fields, setFields] = useState<ImportField[]>([])
  const [existing, setExisting] = useState<Set<string>>(new Set())
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  // carteira para as linhas que não dizem qual é (num extrato OFX, todas)
  const [targetWalletId, setTargetWalletId] = useState<string | null>(null)
  const [pdf, setPdf] = useState<File | null>(null)
  const targetWallet = targetWalletId ?? profile?.defaultWalletId ?? null

  async function onFile(file: File) {
    if (/\.pdf$/i.test(file.name) || file.type === 'application/pdf') { setPdf(file); return }
    const text = await file.text()
    const parsed = /\.ofx$/i.test(file.name) || /<OFX>/i.test(text) ? parseOfx(text) : parseCsv(text)
    if (parsed.length < 2) { setMessage('O arquivo não tem linhas para importar.'); return }
    setRows(parsed)
    setFields(parsed[0].map(guessField))
    const mine = await transactionsApi.getAllMine(session!.user.id)
    setExisting(new Set(mine.map(t => `${t.date}|${t.amount}|${norm(t.place ?? t.description ?? '')}`)))
  }

  const preview = useMemo(() => {
    if (!rows) return []
    const col = (f: ImportField) => fields.indexOf(f)
    const cat = new Map(categories.map(c => [`${c.type}:${norm(c.name)}`, c.id]))
    const wal = new Map(wallets.filter(w => !w.ownerName).map(w => [norm(w.name), w.id]))
    const hasNegatives = rows.slice(1).some(r => (parseCents(r[col('amount')] ?? '') ?? 0) < 0)
    return rows.slice(1).map(r => {
      const get = (f: ImportField) => (col(f) >= 0 ? (r[col(f)] ?? '').trim() : '')
      const date = parseDate(get('date'))
      const raw = parseCents(get('amount'))
      const type = parseType(get('type')) ?? (hasNegatives && raw != null && raw > 0 ? 'income' : 'expense')
      const amount = raw == null ? null : Math.abs(raw)
      const place = get('place') || null
      const description = get('description') || null
      const catKey = `${type === 'income' ? 'income' : 'expense'}:${norm(get('category'))}`
      const tx: NewTransaction | null = date && amount ? {
        type, amount, date,
        // sem categoria no arquivo: sugere pelo histórico e palavras-chave do local
        categoryId: type.startsWith('save') ? null : cat.get(catKey) ?? (type === 'expense' ? suggest(place ?? description) : null),
        walletId: type === 'income' ? null : wal.get(norm(get('wallet'))) ?? targetWallet,
        place: type === 'income' ? null : place ?? description,
        description: type === 'income' ? description ?? place : description,
        source: 'csv',
      } : null
      const duplicate = !!tx && existing.has(`${tx.date}|${tx.amount}|${norm(tx.place ?? tx.description ?? '')}`)
      return { tx, duplicate }
    })
  }, [rows, fields, categories, wallets, existing, targetWallet, suggest])

  const valid = preview.filter(p => p.tx && !p.duplicate)
  const invalid = preview.filter(p => !p.tx).length
  const duplicates = preview.filter(p => p.duplicate).length

  async function importAll() {
    setBusy(true); setMessage(null)
    try {
      await transactionsApi.createMany(valid.map(p => p.tx!))
      await refresh(); onDone(); feedback.done(`${valid.length} ${valid.length === 1 ? 'lançamento importado' : 'lançamentos importados'}`)
    } catch (err) { setMessage(err instanceof Error ? err.message : 'Não foi possível importar.') }
    finally { setBusy(false) }
  }

  if (pdf) return <StatementImport file={pdf} />

  if (!rows) {
    return (
      <div className="space-y-4">
        <p className="px-4 text-center text-subheadline text-muted-foreground">
          PDF, CSV ou OFX.
        </p>
        <label className="flex h-12.5 cursor-pointer items-center justify-center rounded-full bg-tint text-headline font-semibold text-primary-foreground">
          Escolher arquivo
          <input type="file" accept=".pdf,.csv,.ofx,application/pdf,text/csv,application/x-ofx" className="sr-only" onChange={e => e.target.files?.[0] && onFile(e.target.files[0])} />
        </label>
        {message && <p className="px-4 text-footnote text-destructive">{message}</p>}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <ListGroup header="Colunas">
        {rows[0].map((h, i) => (
          <li key={i} className="flex min-h-row items-center gap-3 border-b border-separator pr-4 pl-4 last:border-b-0">
            <span className="min-w-0 flex-1 truncate text-body">{h || `Coluna ${i + 1}`}</span>
            <select value={fields[i]} onChange={e => setFields(f => f.map((x, j) => (j === i ? (e.target.value as ImportField) : x)))}
              className="bg-transparent text-right text-body text-muted-foreground outline-none">
              {Object.entries(FIELD_LABEL).map(([k, label]) => <option key={k} value={k}>{label}</option>)}
            </select>
          </li>
        ))}
      </ListGroup>

      <ListGroup header="Carteira">
        <WalletPicker wallets={wallets.filter(w => !w.ownerName)} value={targetWallet} onChange={setTargetWalletId} />
      </ListGroup>

      <ListGroup header={`Prévia · ${valid.length} para importar`}
        footer={[duplicates && `${duplicates} já existem e serão puladas`, invalid && `${invalid} sem data ou valor válidos`].filter(Boolean).join(' · ') || undefined}>
        {preview.slice(0, 8).map((p, i) => (
          <li key={i} className="flex min-h-row items-center gap-3 border-b border-separator px-4 py-2 last:border-b-0">
            <span className="min-w-0 flex-1">
              <span className="block truncate text-body">{p.tx?.place ?? p.tx?.description ?? '—'}</span>
              <span className="block truncate text-footnote text-muted-foreground">
                {p.tx ? formatDate(p.tx.date) : 'Linha inválida'}{p.duplicate ? ' · duplicada' : ''}
              </span>
            </span>
            <span className="shrink-0 text-body font-semibold tabular-nums">{p.tx ? formatCurrency(p.tx.amount) : ''}</span>
          </li>
        ))}
      </ListGroup>

      {message && <p className="px-4 text-footnote text-destructive">{message}</p>}
      <Button size="lg" className="w-full" disabled={busy || valid.length === 0} onClick={importAll}>
        {busy ? 'Importando…' : `Importar ${valid.length} lançamentos`}
      </Button>
    </div>
  )
}
