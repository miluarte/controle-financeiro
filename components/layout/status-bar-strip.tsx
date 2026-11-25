// Faixa sólida atrás da barra de status do iPhone (altura da área segura do topo). O iOS 26 desfoca o que
// passa por baixo do relógio; com a faixa, a lista some atrás de uma cor lisa em vez de aparecer borrada.
// Cor --screen-top (globals.css): o fundo da tela aberta, ou rosa no Início. Fixa e com altura mínima porque
// o Safari do iOS 26 pinta a barra de cima com o elemento fixo que encosta no topo; sem ela, usaria o fundo
// da página (branco no Início).
export function StatusBarStrip() {
  return <div data-status-strip aria-hidden className="pointer-events-none fixed inset-x-0 top-0 z-30 h-safe-top min-h-1 bg-screen-top lg:hidden" />
}
