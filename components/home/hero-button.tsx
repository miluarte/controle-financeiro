import { cva } from 'class-variance-authority'

// Botão redondo claro e translúcido sobre a faixa colorida do Início (busca, notificações).
export const heroButtonVariants = cva(
  'inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-on-hero/(--alpha-soft) text-on-hero transition-transform outline-none select-none active:scale-95 focus-visible:ring-3 focus-visible:ring-on-hero/(--alpha-half) [&_svg]:size-6 [&_svg]:shrink-0',
)
