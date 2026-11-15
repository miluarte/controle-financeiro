import Image from 'next/image'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

// Logo oficial do Troco (mesma imagem do ícone do app em public/favicon_io).
const logoVariants = cva('shrink-0 rounded-[22%] shadow-sm', {
  variants: {
    size: {
      md: 'size-14',
      lg: 'size-20',
    },
  },
  defaultVariants: { size: 'lg' },
})

export function AppLogo({ size, className }: VariantProps<typeof logoVariants> & { className?: string }) {
  return (
    <Image
      src="/favicon_io/apple-touch-icon.png"
      alt="Troco"
      width={180}
      height={180}
      priority
      className={cn(logoVariants({ size }), className)}
    />
  )
}
