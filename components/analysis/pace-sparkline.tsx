// Ritmo do mês em miniatura: reta tracejada do ideal (0 até o orçamento) e linha do gasto real até hoje.
export function PaceSparkline({ cumulative, budget, day }: { cumulative: number[]; budget: number; day: number }) {
  const days = cumulative.length
  const max = Math.max(budget, cumulative[days - 1] ?? 0, 1)
  const W = 300
  const H = 60
  const x = (d: number) => (d / days) * W
  const y = (v: number) => H - (v / max) * H
  const real = cumulative.slice(0, day).map((v, i) => `${x(i + 1)},${y(v)}`)
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-14 w-full overflow-visible" preserveAspectRatio="none" aria-hidden>
      <line x1={0} y1={y(0)} x2={W} y2={y(budget)} className="stroke-muted-foreground" strokeWidth={1.5}
        strokeDasharray="5 5" vectorEffect="non-scaling-stroke" />
      {real.length > 0 && (
        <polyline points={`0,${H} ${real.join(' ')}`} fill="none" className="stroke-tint" strokeWidth={2.5}
          strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      )}
    </svg>
  )
}
