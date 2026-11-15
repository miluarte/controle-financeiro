# Troco — instruções do projeto

Sistema de controle financeiro pessoal, uso individual, web app com foco exclusivo em mobile por enquanto (restilização geral fica pra depois, não otimizar layout pra desktop nesta fase).

## Stack

Frontend: Next.js (App Router), shadcn/ui, Tailwind.
Backend: Supabase (Postgres + Auth), projeto `troco-controle-financeiro`. Schema versionado em `supabase/migrations/`. O backend antigo (Apps Script + Google Sheets) foi substituído em 2026-11-15; `Claude outputs/Code.gs` fica só como referência histórica.

## Regras de código, sem exceção

Seguir sempre os padrões de componente do shadcn/ui.

Se precisar de um componente que não existe na biblioteca, criar como componente isolado próprio, nunca escrito inline dentro da página.

Sempre usar variável, instância e variant: tokens de tema (`app/globals.css`, `@theme inline`), props de variant do componente (`class-variance-authority`), os tokens de cor e ícone já definidos em `lib/constants.ts` (`COLOR_TOKENS`, `ICON_TOKENS`). Nunca usar valor puro hardcoded (cor, espaçamento, tamanho de fonte direto no elemento).

Valores monetários são sempre armazenados e trafegados em centavos (inteiro), nunca em decimal de reais. Exibição em tela usa `formatCurrency` (`lib/utils.ts`), que faz essa conversão. Não reintroduzir número decimal de reais em nenhum tipo ou payload.

Todos os ícones vêm exclusivamente da biblioteca `@solar-icons/react`. Nunca usar `lucide-react` nem outra biblioteca de ícones. O pacote exige o estilo no nome do export. Padrão: estilo de traço, sufixo `Linear` (ex: `CardLinearIcon`, `AddLinearIcon`). Nomes sem sufixo de estilo não existem no pacote e causam erro de build.

Quando um item está **selecionado ou ativo**, trocar o ícone para a variante preenchida `Bold` (ex: `CardBoldIcon`). Inativo usa `Linear`; ativo usa `Bold`. Vale para navegação (bottom nav), pickers (chips de categoria e carteira, via `TokenIcon active`) e qualquer elemento com estado de seleção. Não usar `BoldDuotone`.

## Escopo desta fase (v1, núcleo financeiro)

Contas e cartões (`Account`, com tipo checking/savings/credit_card/cash — cartão de crédito é uma conta com `creditLimit`/`closingDay`/`dueDay` preenchidos, não uma entidade separada).
Transações (receita, despesa, transferência entre contas).
Parcelamento (`InstallmentGroup`: grupo de parcelas com contagem total e quantas já foram pagas).
Categorias (predefinidas em `lib/constants.ts` + personalizadas).
Metas de orçamento por categoria (`BudgetGoal`).
Visualização: lista de lançamentos com saldo, saldo por conta, resumo mensal. Visual simples, sem gráfico.
Fechamento mensal: saldo final de um mês vira saldo inicial do seguinte.

Não implementar nesta fase: a camada analítica (metas financeiras com simulação de impacto, custo de deslocamento por veículo, custo por uso de assinatura). Ela tem modelo de dados próprio, documentado à parte, e entra numa fase seguinte.

## Design (iOS 26, Liquid Glass)

Cor principal: preto (no modo escuro, branco). Logo: a imagem oficial em `public/favicon_io/apple-touch-icon.png` via `components/shared/app-logo.tsx`; não trocar.

Tokens em `app/globals.css`: cores do sistema iOS (`--background` systemGroupedBackground, `--grouped`, `--separator`, `--fill`, `--segment`), `--tint`/`--primary` preto, escala Dynamic Type (`text-large-title`, `text-title1..3`, `text-headline`, `text-body`, `text-subheadline`, `text-footnote`, `text-caption1/2`), `h-row` (44pt), `h-tabbar`, `rounded-glass`. Fonte do sistema (SF). Modo escuro automático por `prefers-color-scheme`.

Liquid Glass: utilitários `glass` e `glass-strong` (vidro translúcido com desfoque, borda clara e brilho no topo, tokens `--glass-*`). Usados na barra de abas flutuante em cápsula (aba ativa com "lente" `bg-glass-lens`), nos botões circulares de vidro (`GlassButton`) e na folha modal flutuante (`Sheet side="bottom"`). Controles em cápsula (botão grande, controle segmentado, chips); listas agrupadas com `rounded-3xl`.

Campos de número inteiro (dia, parcelas) usam `components/shared/number-field.tsx`, nunca `<input type="number">` com clamp no onChange (impede apagar no iPhone). Valores em dinheiro usam `CurrencyInput`.

Componentes em `components/ios/`: `ListGroup`, `ListRow`, `FormRow`, `SegmentedControl`, `LargeTitleHeader`, `GlassButton`. Variantes: `Button` `plain`/`nav`, `Input` `bare`/`display`. Modal: botão fechar de vidro | título | ação em cápsula preenchida.

`cn` (`lib/utils.ts`) usa tailwind-merge estendido com os tokens acima. Ao criar token de fonte/espaçamento/raio novo, registrar ali, senão o merge descarta classes.

## Comunicação com o backend

`lib/supabase/client.ts` cria o cliente `supabase-js` (URL e chave publicável têm valor padrão no código, sobrescritos por `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`). Os módulos `lib/api/*.ts` mantêm as mesmas assinaturas de antes e convertem snake_case do banco para os tipos camelCase de `lib/types.ts` via `lib/supabase/mappers.ts`.

Modelo de dados: o da especificação funcional v1.0 (seção 6), documentado em `docs/banco-de-dados.md` (mapa spec → colunas, decisões, RPCs, testes). Multiusuário com família e cartões compartilhados; privacidade garantida por RLS.

Front no modelo novo (2026-11-15): login (`components/auth/`), Home (`app/home`: saudação, saldo do mês via RPC `month_summary`, últimas transações, botão + com registro rápido de Gasto/Receita/Guardar e parcelamento no crédito) e Config (`app/config`: perfil e sair). As telas do modelo antigo (contas, faturas, categorias, transações) foram removidas; estão no histórico do Git até `aca1cd9`.

## Estado atual (registrar aqui conforme evolui, não deixar desatualizado)

Backend: Supabase no modelo da spec (2026-11-15). Dados da planilha Troco-Controle-Financeiro estão no schema privado `import` (`import.raw`); `import.load_for(email, card_days)` copia para a conta indicada (contas viram carteiras, saldo inicial vira receita). Pendente: rodar depois que a dona do projeto criar a conta e informar fechamento/vencimento dos cartões Madrinha e Mãe.

Front v1 completo (2026-11-15), publicado na main (Vercel):
- Abas (NAV-1): Contas (`/bills`), Home (`/home`), Análise (`/analysis`), Config (`/config`). Seletor de mês compartilhado (`MonthProvider`, `MonthSelector`).
- Home: saudação, saldo do mês (caixa), ocultar valores, primeiros passos (o passo do toque duplo foi trocado por "cadastrar um cartão" até as automações existirem), últimas transações, botão + (registro rápido de Gasto/Receita/Guardar, parcelas no crédito).
- Transações (`/transactions`, via "Ver todas"): busca, filtro, resumo, edição e exclusão (parcela ou compra inteira).
- Contas: contas fixas/recorrentes/parceladas (`bills` + `bill_occurrences`, geradas por `ensure_bill_occurrences`), pagar gerando gasto, desfazer, editar só este mês ou a série, encerrar; fatura de cada cartão que vence no mês, com compras e pagamento (`pay_invoice`). Regras de fatura no cliente em `lib/invoice.ts`.
- Análise: orçamento do mês, ritmo (gráfico SVG próprio), resta e livre por dia, comparação com o mês anterior até o mesmo dia, gastos por categoria com meta (`category_goals`), categorias sem gasto recolhidas, histórico de 6 meses. Cálculos em `lib/analysis.ts`.
- Config: perfil (nome, cor do avatar), tema (claro/escuro/automático via `data-theme` no html), categorias (`/config/categories`: criar, renomear, ícone, cor, classe, reordenar, arquivar, excluir), carteiras (`/config/wallets`: tipos, acabamento com prévia, fechamento/vencimento, limite, fatura atual e próxima, padrão, arquivar, excluir), moeda padrão, saldo acumulado, exportar/importar CSV (`lib/csv.ts`, prévia, mapeamento e duplicadas), sair e excluir conta. Sobre (novidades, versão) e feedback foram removidos a pedido (2026-11-16).

Família e cartões (2026-11-16):
- `/config/family`: criar, entrar com código (pendente até aprovar), aprovar/recusar, remover, sair, novo código, pausar entradas. API em `lib/api/family.ts`.
- `/cards/[id]`: detalhe do cartão. Titular (`OwnerCardView`): fatura por mês, divisão por pessoa, limite usado, compras, "De quem é essa compra?" (`assign_purchase`), compartilhar (Ninguém/Todos/Escolher). Membro (`MemberCardView`): "Você deve", próxima fatura, em aberto, já comprometido, só as próprias compras.
- Home mostra "A receber de membros" e "Você deve a …" (`FamilyBalances`).
- Acerto (5.7.8): membro toca "Paguei a …" (`SettlementSheet`, RPC `report_settlement`: registra saída `settlement_payment` sem gerar gasto e deixa o acerto `reported`); titular confirma (`ConfirmSettlementSheet`, `confirm_settlement`: entra receita na categoria Reembolso e o acerto vira `confirmed`) ou recusa (`reject_settlement`); membro pode cancelar enquanto aguarda (`cancel_settlement`). Escrita em `settlements` só por essas RPCs.
- Divisão de compra (ATR-5): titular, na compra à vista, "Dividir entre pessoas" (`SplitSheet`, RPC `split_purchase`): igual, por valor ou por %. A parte de outra pessoa fica sem categoria (categorias são de cada um).
- Cada etapa gera aviso push para a outra pessoa (fila `notification_queue`).

Notificações push (2026-11-16):
- Edge Function `notify` (`supabase/functions/notify`), chamada a cada 10 min pelo pg_cron via pg_net com `x-cron-secret` (avisos por horário) e na hora por trigger em `notification_queue` (eventos e teste, `queue_only`). Cada aviso da fila é reservado antes do envio para não duplicar. Envia a fila `notification_queue` (eventos da família por trigger, teste) e avisos agendados com dedupe em `notification_log`: contas a vencer, lembrete de registro, resumo de domingo, orçamento 80%/100%, fatura de cartão compartilhado fechada.
- Chaves VAPID geradas pela própria função e guardadas em `private.app_secrets` (fora da API). O app pega só a pública via RPC `get_vapid_public_key`.
- App: `lib/push.ts`, `app/config/notifications`, handlers `push`/`notificationclick` em `app/sw.ts`. No iPhone só funciona com o app na Tela de Início.

Pendente (spec, seção 8):
- Fila de pendentes e automações (toque duplo, Apple Pay, notificação do banco) com tokens.
- Face ID, backup periódico.
- Login por código de 6 dígitos (ACE-1): hoje é e-mail e senha.
- v3: foto de nota fiscal, replanejar metas. (Acertos, divisão de compra e alertas de orçamento já feitos.)

## Sobre o AGENTS.md deste repositório

O `AGENTS.md` na raiz não é o lugar das regras de projeto acima. O conteúdo dele hoje é gerado e reescrito automaticamente pelo `next dev` (aviso sobre mudanças de versão do Next.js) — mexer nele manualmente para colocar regra de projeto é regra que vai se perder ou duplicar no próximo `next dev`. As regras de projeto vivem aqui, neste arquivo.

@AGENTS.md
