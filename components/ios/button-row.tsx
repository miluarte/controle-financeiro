import { cn } from '@/lib/utils'

// Dois botões de ação lado a lado (nunca empilhados): o primeiro (secundário, ex.: Arquivar, Pular, Excluir)
// fica à esquerda do tamanho do texto; o segundo (principal, ex.: Salvar, Continuar, Cancelar) ocupa o resto.
export function ButtonRow({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={cn(
      'flex gap-3 [&>:first-child:not(:last-child)]:shrink-0 [&>:first-child:not(:last-child)]:px-6 [&>:last-child]:w-full [&>:last-child]:min-w-0 [&>:last-child]:flex-1',
      className,
    )}>
      {children}
    </div>
  )
}
