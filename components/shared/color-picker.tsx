'use client'

import { COLOR_TOKENS, type ColorToken } from '@/lib/constants'
import { cn } from '@/lib/utils'

interface ColorPickerProps {
  value: ColorToken | null
  onChange: (color: ColorToken) => void
}

// Cada token de cor mapeia pra uma classe do tema, nunca uma cor pura no elemento.
const SWATCH_CLASS: Record<ColorToken, string> = {
  red: 'bg-red-500',
  orange: 'bg-orange-500',
  yellow: 'bg-yellow-500',
  green: 'bg-green-500',
  teal: 'bg-teal-500',
  blue: 'bg-blue-500',
  indigo: 'bg-indigo-500',
  purple: 'bg-purple-500',
  pink: 'bg-pink-500',
  gray: 'bg-gray-500',
}

export function ColorPicker({ value, onChange }: ColorPickerProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {COLOR_TOKENS.map(token => (
        <button
          key={token}
          type="button"
          aria-label={token}
          aria-pressed={value === token}
          onClick={() => onChange(token)}
          className={cn(
            'size-7 rounded-full ring-1 ring-foreground/10 transition-all',
            SWATCH_CLASS[token],
            value === token && 'ring-2 ring-offset-2 ring-ring',
          )}
        />
      ))}
    </div>
  )
}
