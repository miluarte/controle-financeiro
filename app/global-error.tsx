'use client'

import NextError from 'next/error'
import { useEffect } from 'react'
import posthog from 'posthog-js'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    posthog.captureException(error)
  }, [error])

  return (
    <html lang="pt-BR">
      <body>
        <NextError statusCode={0} />
        <button type="button" onClick={reset}>
          Tentar novamente
        </button>
      </body>
    </html>
  )
}
