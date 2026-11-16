'use client'

import { useState } from 'react'
import { CopyLinearIcon } from '@solar-icons/react'
import { ListRow } from '@/components/ios/list-row'

// Linha com um valor para copiar (endereço, token).
export function CopyRow({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false)
  async function copy() {
    try { await navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 1500) } catch { /* sem permissão */ }
  }
  return (
    <ListRow onClick={copy} title={label}
      subtitle={<span className="font-mono text-footnote">{value}</span>}
      trailing={<span className="flex items-center gap-1 text-subheadline text-tint">{copied ? 'Copiado' : <CopyLinearIcon className="size-5" />}</span>} />
  )
}
