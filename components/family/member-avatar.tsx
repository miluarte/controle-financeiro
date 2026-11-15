import { cva, type VariantProps } from 'class-variance-authority'
import { COLOR_CLASSES } from '@/components/shared/token-icon'
import type { ColorToken } from '@/lib/constants'
import { cn } from '@/lib/utils'

const avatarVariants = cva('flex shrink-0 items-center justify-center rounded-full font-semibold', {
  variants: {
    size: { sm: 'size-7 text-footnote', md: 'size-9 text-subheadline', lg: 'size-14 text-title2' },
  },
  defaultVariants: { size: 'md' },
})

// Avatar com a inicial do nome (ACE-2, FAM-5).
export function MemberAvatar({
  name, color, size, className,
}: { name: string; color: string; className?: string } & VariantProps<typeof avatarVariants>) {
  return (
    <span className={cn(avatarVariants({ size }), COLOR_CLASSES[color as ColorToken] ?? COLOR_CLASSES.gray, className)}>
      {(name || '?').charAt(0).toUpperCase()}
    </span>
  )
}
