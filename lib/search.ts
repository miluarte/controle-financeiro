// Busca de lançamentos: sem diferença de maiúsculas, acentos e pontuação ("pg *marisa" acha "MARISA"),
// cada palavra pode estar em qualquer campo ("marisa nubank") e números acham o valor ("46,67", "46").

export function normalizeSearch(s: string) {
  return s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()
    .replace(/[^\p{L}\p{N},.]+/gu, ' ').trim()
}

// Valor em centavos como a pessoa digita: "4667", "46,67", "46.67", "r$ 46,67".
function amountTexts(cents: number) {
  const abs = Math.abs(cents)
  const reais = Math.floor(abs / 100)
  const dec = String(abs % 100).padStart(2, '0')
  const thousands = String(reais).replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return [`${reais},${dec}`, `${thousands},${dec}`, `${reais}.${dec}`]
}

const NUMBER = /^\d[\d.,]*$/

// Palavra com número: casa com o valor quando começa igual ("46" acha R$ 46,67; "46,6" também),
// além de casar com texto (ex.: "99" em "Loja 99").
function matchesWord(word: string, hay: string, amounts: string[]) {
  if (hay.includes(word)) return true
  if (!NUMBER.test(word)) return false
  const w = word.replace(/\./g, ',')
  return amounts.some(a => a.replace(/\./g, ',').startsWith(w))
}

export function matchesQuery(query: string, fields: (string | null | undefined | false)[], amountCents?: number) {
  const words = normalizeSearch(query.replace(/r\$/gi, ' ')).split(' ')
    .map(w => w.replace(/^[.,]+|[.,]+$/g, '')).filter(Boolean)
  if (!words.length) return true
  const hay = ` ${normalizeSearch(fields.filter(Boolean).join(' '))} `
  const amounts = amountCents === undefined ? [] : amountTexts(amountCents)
  return words.every(w => matchesWord(w, hay, amounts))
}
