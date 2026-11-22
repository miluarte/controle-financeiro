import { toast } from 'sonner'

// Aviso visual depois de cada ação (salvar, excluir, pagar…). Texto: particípio, até 3 palavras
// ("Gasto adicionado", "Salvo", "Excluído"), conforme docs/content-design.md.
export const feedback = {
  // undo: botão "Desfazer" no aviso (ex.: depois de excluir)
  done: (text: string, undo?: () => void | Promise<void>) =>
    toast.success(text, undo ? { action: { label: 'Desfazer', onClick: () => { void undo() } }, duration: 5000 } : undefined),
  error: (text: string) => toast.error(text),
  info: (text: string) => toast.info(text),
}
