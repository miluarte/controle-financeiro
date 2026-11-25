// Faixa sólida atrás da barra de status do iPhone (altura da área segura do topo). O iOS 26 desfoca o que
// passa por baixo do relógio; com a faixa, a lista some atrás de uma cor lisa em vez de aparecer borrada.
// Cor --screen-top (globals.css): o fundo da tela aberta, igual em todas as telas.
export function StatusBarStrip() {
  return <div data-status-strip aria-hidden className="pointer-events-none fixed inset-x-0 top-0 z-30 h-safe-top bg-screen-top lg:hidden" />
}
