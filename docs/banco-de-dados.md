# Banco de dados (Supabase)

Modelo da especificação funcional v1.0, seção 6. Schema em `supabase/migrations/20261115120000_spec_v1_model.sql`.

## Convenções

- Tabelas e colunas em inglês, snake_case.
- Dinheiro em centavos (`bigint`).
- Mês de referência sempre no dia 1 (`ref_month`, `invoice_ref`, `effective_from`, `start_month`).
- Toda tabela tem `id`, `created_at`, `updated_at` e RLS ativa.
- Escritas que envolvem outra pessoa (família, atribuição de compra) passam por funções RPC.

## Mapa spec → banco

| Spec | Banco |
|---|---|
| profiles: nome, cor_avatar, moeda, tema, saldo_acumulado, renda_mensal | profiles: name, avatar_color, currency, theme, carry_over_balance, monthly_income (+ default_wallet_id, onboarding_dismissed) |
| families: nome, codigo, entradas_pausadas, criado_por | families: name, code, entries_paused, created_by |
| family_members: papel, status, entrou_em | family_members: role (admin/member), status (pending/active), joined_at |
| wallets: owner_id, nome, tipo, acabamento, dia_fechamento, dia_vencimento, compartilhada, ativa | wallets: owner_id, name, type (pix/debit/credit/cash/other), finish, closing_day, due_day, share_scope (none/family/selected), active (+ closing_day_inclusive, spending_limit, currency, sort_order) |
| wallet_shares | wallet_shares (usado quando share_scope = selected) |
| categories: tipo, nome, icone, classe, ordem, ativa | categories: type (expense/income), name, icon, color, class (essential/desire), sort_order, active |
| transactions: tipo | type: expense, income, save_apply, save_redeem, invoice_payment, settlement_payment |
| transactions: valor, data, local, descricao | amount, date, place, description |
| transactions: criado_por, atribuido_a | created_by, assigned_to |
| transactions: conta_id | bill_id |
| transactions: grupo_parcela_id, parcela_n, parcelas_total | installment_group_id, installment_n, installments_total |
| transactions: fatura_ref | invoice_ref (calculado pelo banco) |
| transactions: origem, status, dados_origem | source, status (confirmed/pending), source_data |
| bills: valor, dia_vencimento, vence_mes_seguinte, recorrente, parcela_atual, parcelas_total | bills: amount, due_day, due_next_month, recurring, installment_current, installments_total (+ start_month) |
| bill_occurrences: mes_ref, vencimento, pago_em | bill_occurrences: ref_month, due_date, paid_at, installment_n |
| budgets: mes_ref, valor_total | budgets: ref_month, total_amount |
| category_goals: valor_meta, vigente_desde | category_goals: goal_amount, effective_from |
| settlements: devedor_id, titular_id, fatura_ref | settlements: debtor_id, holder_id, invoice_ref |
| notification_settings: tipo, ativo, horario, antecedencia_dias | notification_settings: type, enabled, time, days_before |
| push_subscriptions: chaves | push_subscriptions: p256dh, auth |
| automation_tokens: nome, token_hash, revogado_em | automation_tokens: name, token_hash, revoked_at, last_used_at |

Tabelas extras, exigidas por requisitos sem tabela na seção 6:

- `installment_groups`: dados da compra parcelada (ATR-4, 7.6).
- `invoices`: estado de pagamento da fatura (CON-8, ATR-3). Os valores vêm da view `invoice_totals`.
- `wallet_aliases`: cartão do Apple Pay ou da notificação ligado a uma carteira (CAR-6).

## Decisões tomadas (seção 9)

Adotei as propostas marcadas como [S] na spec. Todas podem mudar.

1. Saldo pelo regime de caixa: compra no crédito sai do saldo quando a fatura é paga. A análise de gastos usa a data da compra.
2. Orçamento do mês é um teto independente das metas por categoria.
3. Categorias padrão de gasto conforme 5.3 (sem Farmácia). Receita: Salário, Freelance, Investimentos, Reembolso, Presente, Outros.
4. Entrada na família com aprovação do admin.
5. Compra no dia exato do fechamento entra na fatura que fecha. Ajustável por cartão (`closing_day_inclusive`).
9. Compra atribuída a membro conta como gasto do membro; para o titular entra em "A receber de membros".

## Regras garantidas pelo banco

- Membro só lê compras atribuídas a ele; titular lê tudo do próprio cartão (VIS-4, critério 2).
- Membro só registra no cartão compartilhado se for membro ativo da mesma família e tiver acesso.
- Membro altera só o que registrou e enquanto a fatura não fechou (ATR-6).
- Reatribuição bloqueada com fatura quitada (ATR-3). `assign_purchase` aplica a todas as parcelas (ATR-4).
- Carteira e categoria com lançamento não podem ser excluídas, só arquivadas (CAR-7, CAT-5).
- Admin que sai passa o papel ao membro mais antigo; último membro encerra a família (FAM-7).
- Titular que exclui a conta: membros mantêm as próprias compras, com o nome do cartão guardado (CCO-6).
- Conta nova nasce com perfil, Pix, Dinheiro, categorias padrão e preferências de notificação.

## Funções para o app (RPC)

| Função | Uso |
|---|---|
| create_family, join_family, approve_family_member, remove_family_member, leave_family, regenerate_family_code, set_family_entries_paused, rename_family | Família |
| family_members_list | Membros com nome e avatar |
| shared_wallets | Cartões de outras pessoas que posso usar (só nome, acabamento, fechamento, vencimento) |
| assign_purchase | "De quem é essa compra?" |
| create_installment_purchase | Compra parcelada no cartão |
| ensure_bill_occurrences, pay_bill_occurrence, unpay_bill_occurrence | Contas do mês |
| pay_invoice | Pagar fatura |
| month_summary | Saldo, gasto, guardado, orçamento, a receber, pendências |
| category_spending, monthly_history | Análise |
| my_card_debts | Quanto devo a cada titular |
| delete_account | Excluir conta |

Views: `invoice_totals` (fatura por cartão, mês e pessoa) e `category_usage` (lançamentos por categoria).

Tarefa diária (pg_cron, 03:17 UTC): gera as contas do mês atual e do seguinte.

## Testes feitos

Com dois usuários fictícios (titular e membro), depois apagados:

- Membro não vê o cartão antes da aprovação e passa a ver depois.
- Membro vê só as próprias compras; titular vê a fatura dividida por pessoa, e a soma das fatias fecha com o total.
- Parcelas caem nas faturas certas (fecha dia 5: compra em 03/11 vai para novembro, em 20/11 para dezembro).
- Membro não lê carteiras, perfil nem categorias do titular, e não consegue lançar em nome dele.
- Edição bloqueada após o fechamento para o membro; reatribuição bloqueada com fatura quitada.
- Contas fixas: parcela avança e encerra no total; vencimento dia 31 vira 30 em novembro.
- Saldo de caixa, pagamento de fatura e "a receber" conferidos.
- Saída da família e exclusão da conta do titular preservam o histórico do membro.

## Pendências conhecidas

- Login por código de 6 dígitos (ACE-1): precisa trocar o modelo de e-mail "Magic Link" no painel do Supabase para usar `{{ .Token }}`.
- Edge Functions (automações, leitura de nota) e push: tabelas prontas, funções ainda não escritas.
- Funções auxiliares das políticas (wallet_owner, has_wallet_access etc.) estão no schema público e aparecem como RPC. Exigem UUID e não expõem dados sensíveis, mas o ideal é movê-las para um schema privado.
