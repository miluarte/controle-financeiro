import { cva } from 'class-variance-authority'

// Conteúdo que abre e fecha deslizando (acordeão): a altura vai de zero ao tamanho do conteúdo
// com transição suave, e o conteúdo aparece aos poucos.
const wrapper = cva('grid transition-[grid-template-rows,opacity] duration-300 ease-out motion-reduce:transition-none', {
  variants: {
    open: { true: 'grid-rows-[1fr] opacity-100', false: 'pointer-events-none grid-rows-[0fr] opacity-0' },
  },
})

export function Collapse({ open, children }: { open: boolean; children: React.ReactNode }) {
  return (
    <div className={wrapper({ open })} aria-hidden={!open} inert={!open}>
      <div className="min-h-0 overflow-hidden">{children}</div>
    </div>
  )
}
