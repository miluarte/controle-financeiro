import { cn } from '@/lib/utils'

// Mensagem de erro de formulário ou ação, abaixo dos grupos. Não aparece sem mensagem.
export function FormError({ message, align = 'start', className }: { message?: string | null; align?: 'start' | 'center'; className?: string }) {
  if (!message) return null
  return <p role="alert" className={cn('px-4 text-footnote text-destructive', align === 'center' && 'text-center', className)}>{message}</p>
}
