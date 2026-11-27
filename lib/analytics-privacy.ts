import type { CaptureResult } from 'posthog-js'

// Valores em dinheiro como o formatCurrency mostra em pt-BR:
// "R$ 1.234,56", "-R$ 10,00", "US$ 5,00", "€ 3,00".
const MONEY = /-?(?:[A-Z]{0,3}\$|€|£)\s?-?\d[\d.]*(?:,\d{1,2})?/g

const MASK = '•••'

export function maskMoney(text: string): string {
  return text.replace(MONEY, MASK)
}

// Tira valores em dinheiro dos textos que o autocapture manda nos eventos.
export function scrubMoney(event: CaptureResult | null): CaptureResult | null {
  if (!event?.properties) return event
  const props = event.properties
  if (typeof props.$el_text === 'string') props.$el_text = maskMoney(props.$el_text)
  if (typeof props.$elements_chain === 'string') props.$elements_chain = maskMoney(props.$elements_chain)
  if (Array.isArray(props.$elements)) {
    for (const el of props.$elements) {
      if (typeof el?.$el_text === 'string') el.$el_text = maskMoney(el.$el_text)
    }
  }
  return event
}
