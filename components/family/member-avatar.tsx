import { cva, type VariantProps } from 'class-variance-authority'
import { COLOR_CLASSES } from '@/components/shared/token-icon'
import type { ColorToken } from '@/lib/constants'
import { cn } from '@/lib/utils'

const avatarVariants = cva('flex shrink-0 items-center justify-center overflow-hidden rounded-full font-semibold', {
  variants: {
    size: { sm: 'size-7 text-footnote', md: 'size-9 text-subheadline', lg: 'size-14 text-title2', xl: 'size-24 text-large-title' },
    // hero: no topo rosa do Início, com borda branca e sombra para parecer um botão
    tone: { default: '', hero: 'border-2 border-on-hero bg-on-hero text-hero shadow-control' },
  },
  defaultVariants: { size: 'md', tone: 'default' },
})

// Avatar da pessoa (ACE-2, FAM-5): a foto de perfil, quando houver; senão, a inicial do nome na cor escolhida.
export function MemberAvatar({
  name, color, src, size, tone, className,
}: { name: string; color: string; src?: string | null; className?: string } & VariantProps<typeof avatarVariants>) {
  return (
    <span className={cn(COLOR_CLASSES[color as ColorToken] ?? COLOR_CLASSES.gray, avatarVariants({ size, tone }), className)}>
      {src
        // eslint-disable-next-line @next/next/no-img-element
        ? <img src={src} alt="" className="size-full object-cover" draggable={false} />
        : (name || '?').charAt(0).toUpperCase()}
    </span>
  )
}
