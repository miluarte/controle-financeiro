'use client'

import { useState } from 'react'
import { DownloadMinimalisticLinearIcon, UploadMinimalisticLinearIcon } from '@solar-icons/react'
import { ListGroup } from '@/components/ios/list-group'
import { ListRow } from '@/components/ios/list-row'
import { useAllCategories, useOwnWallets } from '@/hooks/use-data'
import { useSession } from '@/hooks/use-session'
import { transactionsApi } from '@/lib/api/transactions'
import { toCsv } from '@/lib/csv'
import { todayIso } from '@/lib/utils'
import { CsvImportSheet } from './csv-import-sheet'

// DAD-1 e DAD-2: exportar e importar CSV.
export function DataGroup() {
  const { session } = useSession()
  const { categories } = useAllCategories()
  const { wallets } = useOwnWallets()
  const [importing, setImporting] = useState(false)
  const [exporting, setExporting] = useState(false)

  async function exportCsv() {
    setExporting(true)
    try {
      const rows = await transactionsApi.getAllMine(session!.user.id)
      const blob = new Blob(['﻿' + toCsv(rows, categories, wallets)], { type: 'text/csv;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `troco-${todayIso()}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } finally { setExporting(false) }
  }

  return (
    <>
      <ListGroup header="Dados">
        <ListRow leading={<DownloadMinimalisticLinearIcon className="size-6 text-muted-foreground" />}
          title={exporting ? 'Exportando…' : 'Exportar transações (CSV)'} onClick={exporting ? undefined : exportCsv} />
        <ListRow leading={<UploadMinimalisticLinearIcon className="size-6 text-muted-foreground" />}
          title="Importar transações (CSV)" chevron onClick={() => setImporting(true)} />
      </ListGroup>
      <CsvImportSheet open={importing} onOpenChange={setImporting} />
    </>
  )
}
