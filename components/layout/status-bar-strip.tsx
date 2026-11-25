// Faixa sólida atrás da barra de status do iPhone (altura da área segura do topo). O iOS 26 desfoca o que
// passa por baixo do relógio; com a faixa, a lista some atrás de uma cor lisa em vez de aparecer borrada.
// A cor acompanha o topo da tela: cinza da página, branco nas telas grouped e rosa no Início (globals.css).
export function StatusBarStrip() {
  return <div data-status-strip aria-hidden className="pointer-events-none absolute inset-x-0 top-0 z-30 h-safe-top bg-background lg:hidden" />
}
