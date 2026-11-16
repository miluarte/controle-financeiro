// Dias úteis bancários (fins de semana e feriados nacionais). Usado no vencimento da fatura:
// conta que vence em dia sem expediente pode ser paga no próximo dia útil sem multa nem juros.

function easter(year: number): Date {
  const a = year % 19, b = Math.floor(year / 100), c = year % 100
  const d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3)
  const h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4
  const l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451)
  const month = Math.floor((h + l - 7 * m + 114) / 31), day = ((h + l - 7 * m + 114) % 31) + 1
  return new Date(Date.UTC(year, month - 1, day))
}

const iso = (d: Date) => d.toISOString().slice(0, 10)
const shift = (d: Date, n: number) => new Date(d.getTime() + n * 86400000)

function holidays(year: number): Set<string> {
  const fixed = ['01-01', '04-21', '05-01', '09-07', '10-12', '11-02', '11-15', '11-20', '12-25'].map(md => `${year}-${md}`)
  const e = easter(year)
  // Carnaval (segunda e terça), Sexta-feira Santa e Corpus Christi
  return new Set([...fixed, iso(shift(e, -48)), iso(shift(e, -47)), iso(shift(e, -2)), iso(shift(e, 60))])
}

export function isBusinessDay(date: string): boolean {
  const d = new Date(`${date}T12:00:00Z`)
  const wd = d.getUTCDay()
  return wd !== 0 && wd !== 6 && !holidays(d.getUTCFullYear()).has(date)
}

export function nextBusinessDay(date: string): string {
  let d = new Date(`${date}T12:00:00Z`)
  while (!isBusinessDay(iso(d))) d = shift(d, 1)
  return iso(d)
}
