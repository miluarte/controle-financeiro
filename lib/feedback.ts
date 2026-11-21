import { toast } from 'sonner'

// Aviso visual depois de cada ação (salvar, excluir, pagar…). Texto: particípio, até 3 palavras
// ("Gasto adicionado", "Salvo", "Excluído"), conforme docs/content-design.md.
export const feedback = {
  done: (text: string) => toast.success(text),
  error: (text: string) => toast.error(text),
  info: (text: string) => toast.info(text),
}
