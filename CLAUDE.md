# Troco — instruções do projeto

Sistema de controle financeiro pessoal, uso individual, web app com foco exclusivo em mobile por enquanto (restilização geral fica pra depois, não otimizar layout pra desktop nesta fase).

## Stack

Frontend: Next.js (App Router), shadcn/ui, Tailwind.
Backend: Google Apps Script, com Google Sheets como banco de dados. É um projeto Google separado, fora deste repositório.

## Regras de código, sem exceção

Seguir sempre os padrões de componente do shadcn/ui.

Se precisar de um componente que não existe na biblioteca, criar como componente isolado próprio, nunca escrito inline dentro da página.

Sempre usar variável, instância e variant: tokens de tema (`app/globals.css`, `@theme inline`), props de variant do componente (`class-variance-authority`), os tokens de cor e ícone já definidos em `lib/constants.ts` (`COLOR_TOKENS`, `ICON_TOKENS`). Nunca usar valor puro hardcoded (cor, espaçamento, tamanho de fonte direto no elemento).

Valores monetários são sempre armazenados e trafegados em centavos (inteiro), nunca em decimal de reais. Exibição em tela usa `formatCurrency` (`lib/utils.ts`), que faz essa conversão. Não reintroduzir número decimal de reais em nenhum tipo ou payload.

## Escopo desta fase (v1, núcleo financeiro)

Contas e cartões (`Account`, com tipo checking/savings/credit_card/cash — cartão de crédito é uma conta com `creditLimit`/`closingDay`/`dueDay` preenchidos, não uma entidade separada).
Transações (receita, despesa, transferência entre contas).
Parcelamento (`InstallmentGroup`: grupo de parcelas com contagem total e quantas já foram pagas).
Categorias (predefinidas em `lib/constants.ts` + personalizadas).
Metas de orçamento por categoria (`BudgetGoal`).
Visualização: lista de lançamentos com saldo, saldo por conta, resumo mensal. Visual simples, sem gráfico.
Fechamento mensal: saldo final de um mês vira saldo inicial do seguinte.

Não implementar nesta fase: a camada analítica (metas financeiras com simulação de impacto, custo de deslocamento por veículo, custo por uso de assinatura). Ela tem modelo de dados próprio, documentado à parte, e entra numa fase seguinte.

## Comunicação com o backend

`NEXT_PUBLIC_API_URL` (em `.env.local`) aponta pra URL do Web App do Apps Script, já publicado e funcionando. `lib/api/client.ts` implementa o padrão de despachar por `action` via query string (GET) ou corpo (POST).

Frontend e backend não estão no mesmo domínio. CORS resolvido enviando `Content-Type: text/plain;charset=utf-8` no POST, evitando o preflight que o Apps Script Web App trata mal.

## Estado atual (registrar aqui conforme evolui, não deixar desatualizado)

Backend implantado e funcionando (Apps Script "Troco Backend", planilha Troco-Controle-Financeiro). Núcleo técnico de ponta a ponta confirmado (frontend → backend → planilha).

Prontos: tipos (`lib/types.ts`), cliente de API (`lib/api/client.ts`), hooks de dados (`hooks/use-*.ts`), componentes de exibição/lista (cards, badges, listas).

Formulários — todos construídos (2026-09-12):
- `AccountForm`: nome, tipo, saldo inicial (só na criação), campos de cartão de crédito condicionais (limite, dia de fechamento, dia de vencimento), cor, ícone, arquivar.
- `TransactionForm`: tipo receita/despesa (tabs), valor, descrição, data, conta, categoria, notas. Edição e exclusão inclusas. Edição busca a transação na lista do mês atual (`useTransactions`) — não existe `getTransactionById` no backend, então só é possível editar uma transação que já esteja carregada no mês corrente.
- `TransferForm`: conta de origem, conta de destino, valor, data, descrição. Nova rota `/transactions/transfer`, linkada a partir do `QuickActionBar`.
- `CategoryForm`: nome, tipo, ícone, cor. Só criação (backend não tem `updateCategory`/`deleteCategory`). Acionado por um Sheet na página de Categorias.
- `BudgetGoalForm`: categoria (despesa), limite mensal, recorrente ou mês específico. Acionado por um Sheet na página de Categorias. `BudgetGoalItem` agora calcula o gasto real do mês por categoria (antes estava fixo em 0) e permite excluir a meta.
- `InstallmentGroupForm`: descrição, valor total, número de parcelas (calcula o valor de cada parcela), cartão/conta, categoria, data da primeira parcela. Acionado por um Sheet na página de Parcelamentos.
- `MonthlySummaryCard`: calcula total que entrou, total que saiu e saldo do mês a partir das transações do mês atual (`useTransactions`). Não existe endpoint de resumo mensal no backend — o cálculo é feito no cliente. `openingBalance`/`closingBalance` (fechamento mensal automático) ainda não têm um endpoint dedicado; ficam pendentes.

Componentes novos de apoio, sem equivalente no shadcn instalado, criados como componentes isolados próprios (seguindo a regra deste arquivo): `components/ui/textarea.tsx`, `components/ui/switch.tsx`, `components/shared/currency-input.tsx` (input monetário controlado em centavos), `components/shared/color-picker.tsx` e `components/shared/icon-picker.tsx` (usam `COLOR_TOKENS`/`ICON_TOKENS`).

Pendente:
- Fechamento mensal automático (saldo final de um mês virar saldo inicial do seguinte) — precisa de lógica nova no backend, ainda não existe.
- Lógica de fatura de cartão para parcelas (quando o saldo é de fato afetado) — decisão em aberto, documentada no próprio `Code.gs`.
- Hospedagem do frontend Next.js — ainda não decidida.
- Filtros de lançamentos (`TransactionFilters`) continuam placeholder.

## Sobre o AGENTS.md deste repositório

O `AGENTS.md` na raiz não é o lugar das regras de projeto acima. O conteúdo dele hoje é gerado e reescrito automaticamente pelo `next dev` (aviso sobre mudanças de versão do Next.js) — mexer nele manualmente para colocar regra de projeto é regra que vai se perder ou duplicar no próximo `next dev`. As regras de projeto vivem aqui, neste arquivo.

@AGENTS.md
