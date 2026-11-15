// CON-1: anel de percentual pago.
export function ProgressRing({ value, label }: { value: number; label?: string }) {
  const pct = Math.max(0, Math.min(1, value))
  const r = 26
  const c = 2 * Math.PI * r
  return (
    <div className="relative size-16 shrink-0">
      <svg viewBox="0 0 64 64" className="size-16 -rotate-90">
        <circle cx="32" cy="32" r={r} fill="none" strokeWidth="7" className="stroke-fill" />
        <circle cx="32" cy="32" r={r} fill="none" strokeWidth="7" strokeLinecap="round"
          className="stroke-success transition-all" strokeDasharray={c} strokeDashoffset={c * (1 - pct)} />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-footnote font-semibold tabular-nums">
        {label ?? `${Math.round(pct * 100)}%`}
      </span>
    </div>
  )
}
