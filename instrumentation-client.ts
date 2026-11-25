import posthog from 'posthog-js'
import { maskMoney, scrubMoney } from '@/lib/analytics-privacy'

const token = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN
const host = process.env.NEXT_PUBLIC_POSTHOG_HOST

if (token && host) {
  posthog.init(token, {
    api_host: host,
    defaults: '2026-08-30',
    capture_exceptions: true,
    // Gravações: os valores em dinheiro aparecem como "•••"; o resto do texto continua visível.
    session_recording: {
      maskAllInputs: true,
      maskTextSelector: '*',
      maskTextFn: (text) => maskMoney(text),
    },
    // Eventos do autocapture: tira valores em dinheiro do texto do elemento clicado.
    before_send: scrubMoney,
    debug: process.env.NODE_ENV === 'development',
    logs: {
      serviceName: 'troco-web',
      environment: process.env.NODE_ENV,
    },
  })
} else if (process.env.NODE_ENV !== 'production') {
  const missingVariable = token
    ? 'NEXT_PUBLIC_POSTHOG_HOST'
    : 'NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN'

  throw new Error(
    `${missingVariable} variable required by PostHog is missing or un-configured, this causes events to be silently missed. This error stops appearing once ${missingVariable} is configured`,
  )
}
