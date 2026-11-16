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

## Escopo

O app segue a especificação funcional v1.0 (núcleo financeiro, família, notificações, foto de nota, replanejamento). Modelo de dados em `docs/banco-de-dados.md`. Ficam para depois: backup, login por código e Open Finance.

Textos de apoio na interface (footers, dicas, legendas): curtos e diretos, uma frase. Sem explicar o óbvio.

## Design (iOS 26, Liquid Glass)

Cor principal: preto (no modo escuro, branco). Logo: a imagem oficial em `public/favicon_io/apple-touch-icon.png` via `components/shared/app-logo.tsx`; não trocar.

Tokens em `app/globals.css`: cores do sistema iOS (`--background` systemGroupedBackground, `--grouped`, `--separator`, `--fill`, `--segment`), `--tint`/`--primary` preto, escala Dynamic Type (`text-large-title`, `text-title1..3`, `text-headline`, `text-body`, `text-subheadline`, `text-footnote`, `text-caption1/2`), `h-row` (44pt), `h-tabbar`, `rounded-glass`. Fonte do sistema (SF). Modo escuro automático por `prefers-color-scheme`.

Liquid Glass: utilitários `glass` e `glass-strong` (vidro translúcido com desfoque, borda clara e brilho no topo, tokens `--glass-*`). Usados na barra de abas flutuante em cápsula (aba ativa com "lente" `bg-glass-lens`), nos botões circulares de vidro (`GlassButton`) e na folha modal flutuante (`Sheet side="bottom"`). Controles em cápsula (botão grande, controle segmentado, chips); listas agrupadas com `rounded-3xl`.

Estrutura da tela: a página não rola. `AppShell` ocupa a tela toda (`h-app` = `--app-height`, medida como `window.innerHeight` por um script no `<head>` de `app/layout.tsx`, antes da primeira pintura e a cada resize) e só o `<main>` rola; a barra de abas fica presa ao fundo do shell, sem `position: fixed`. No app instalado (`@media (display-mode: standalone)` ou `html[data-standalone]`, marcado pelo `IosViewportFix`), o `html` ganha `min-height: min(100lvh, calc(100% + env(safe-area-inset-top)))`: no iOS 26, enquanto o documento não passa da área visível, o sistema encurta a tela pela altura da barra de status e não desenha o rodapé (WebKit 301108). Não remover. Não usar `screen.height` nem `100lvh` para a altura do shell: no iOS 26 a área desenhada pode ser menor e a barra fica cortada.

Botão + (`components/layout/add-menu.tsx`) fica ao lado da barra de abas e abre um menu (`components/ui/dropdown-menu.tsx`, vidro): Gasto, Receita, Guardar (abrem o `QuickAddSheet` já no tipo) e, em "Todo mês", Conta fixa e Receita fixa (`BillFormSheet type`). É o único ponto de adicionar lançamentos e contas.

Datas e meses usam `components/shared/date-field.tsx` (`DateField`, `mode="month"`): texto em português com mês abreviado ("16 nov 2026", "nov 2026") e o seletor nativo invisível por cima. Nunca `<input type="date">`/`type="month"` direto (no iPhone em inglês aparece "November 2026" e corta). Listas de escolha longas usam `SelectField` (mesmo esquema). Todo texto da interface em português.

Campos de número inteiro (dia, parcelas) usam `components/shared/number-field.tsx`, nunca `<input type="number">` com clamp no onChange (impede apagar no iPhone). Valores em dinheiro usam `CurrencyInput`.

Componentes em `components/ios/`: `ListGroup`, `ListRow`, `FormRow`, `SegmentedControl`, `LargeTitleHeader`, `GlassButton`. Variantes: `Button` `plain`/`nav`, `Input` `bare`/`display`. Modal: botão fechar de vidro | título | ação em cápsula preenchida. Edição de algo que pode ser excluído (`ModalSheet onDelete`): "Excluir" discreto em texto vermelho no topo (variant `plain-destructive`) e Salvar grande embaixo; excluir sempre pergunta numa folha de ações (`ActionSheet`, `useDeleteAction`), com as opções quando houver mais de uma (ex.: só esta parcela ou a compra inteira).

`cn` (`lib/utils.ts`) usa tailwind-merge estendido com os tokens acima. Ao criar token de fonte/espaçamento/raio novo, registrar ali, senão o merge descarta classes.

## Comunicação com o backend

`lib/supabase/client.ts` cria o cliente `supabase-js` (URL e chave publicável têm valor padrão no código, sobrescritos por `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`). Os módulos `lib/api/*.ts` mantêm as mesmas assinaturas de antes e convertem snake_case do banco para os tipos camelCase de `lib/types.ts` via `lib/supabase/mappers.ts`.

Modelo de dados: o da especificação funcional v1.0 (seção 6), documentado em `docs/banco-de-dados.md` (mapa spec → colunas, decisões, RPCs, testes). Multiusuário com família e cartões compartilhados; privacidade garantida por RLS.

## Estado atual (registrar aqui conforme evolui, não deixar desatualizado)

Backend: Supabase no modelo da spec (2026-11-15). Dados da planilha Troco-Controle-Financeiro estão no schema privado `import` (`import.raw`); `import.load_for(email, card_days)` copia para a conta indicada (contas viram carteiras, saldo inicial vira receita). Pendente: rodar depois que a dona do projeto criar a conta e informar fechamento/vencimento dos cartões Madrinha e Mãe.

Front v1 completo (2026-11-15), publicado na main (Vercel):
- Abas (NAV-1): Contas (`/bills`), Home (`/home`), Análise (`/analysis`), Config (`/config`). Seletor de mês compartilhado (`MonthProvider`, `MonthSelector`: cápsula "Novembro ⌄" que abre a roda de mês do iPhone; ano só se não for o atual). Nas telas com o seletor, textos não repetem o mês ("Gasto no mês", "Saldo do mês").
- Home: saudação, saldo do mês (caixa), ocultar valores, primeiros passos (o passo do toque duplo foi trocado por "cadastrar um cartão" até as automações existirem), últimas transações, botão + (registro rápido de Gasto/Receita/Guardar, parcelas no crédito).
- Transações (`/transactions`, via "Ver todas"): busca, filtro, resumo, edição e exclusão (parcela ou compra inteira).
- Fim da recorrência (2026-11-16): `bills.end_month` (último mês, null = sem fim); no formulário "Sem fim / Até o mês / Nº de vezes" (`RecurrenceEnd`), com prévia "Último recebimento/pagamento em …". `ensure_bill_occurrences` não gera ocorrência depois de `end_month`.
- Receita fixa (2026-11-18): `bills.type` = `expense` ou `income`. Receita fixa aparece em Contas no grupo "A receber" (fora do total de contas); "Marcar como recebida" gera receita (`pay_bill_occurrence`), nunca em cartão de crédito. Não gera aviso de vencimento.
- Contas: contas fixas/recorrentes/parceladas (`bills` + `bill_occurrences`, geradas por `ensure_bill_occurrences`), pagar gerando gasto, desfazer, editar só este mês ou a série, encerrar; fatura de cada cartão que vence no mês, com compras e pagamento (`pay_invoice`). Regras de fatura no cliente em `lib/invoice.ts`.
- Análise: um card com gasto contra o orçamento, ritmo em miniatura (`PaceSparkline`), resta, livre por dia e média por dia (gasto até hoje ÷ dias que passaram, `averagePerDay`), gastos por categoria com meta (`category_goals`), categorias sem gasto recolhidas, histórico de 6 meses. Cálculos em `lib/analysis.ts`.
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
- A mesma função remove do bucket `receipts` as fotos de quem excluiu a conta (pasta sem perfil), só com a lista de perfis confirmada (ACE-5).
- Chaves VAPID geradas pela própria função e guardadas em `private.app_secrets` (fora da API). O app pega só a pública via RPC `get_vapid_public_key`.
- App: `lib/push.ts`, `app/config/notifications`, handlers `push`/`notificationclick` em `app/sw.ts`. No iPhone só funciona com o app na Tela de Início.

Foto da nota fiscal (5.4, 2026-11-16):
- Botão "Ler nota fiscal" no registro de Gasto (`components/receipt/`). `lib/receipt.ts` reduz a foto (1600 px, JPEG) e chama a Edge Function `ler-nota` (Gemini 2.5 Flash, plano gratuito, segredo `GEMINI_API_KEY`), que devolve total em centavos, local, data, itens e categoria sugerida entre as da pessoa. Sem chave, sem cota ou com erro, cai no Tesseract.js no celular (`por`), com regras para achar TOTAL/VALOR A PAGAR, data e nome da loja, e o app avisa que é menos preciso.
- Nada é salvo sem confirmar. A foto só é guardada se a pessoa ligar "Anexar a foto": bucket privado `receipts`, pasta = id do usuário, coluna `transactions.receipt_path`. Lançamento por foto tem `source = 'photo'` e itens em `source_data`; a edição mostra itens e "Ver comprovante" (URL assinada).
- Leitura do QR code da NFC-e (passo 7) não foi feita.

Replanejar metas (5.11, ANA-8, ANA-9, 2026-11-16):
- `lib/replan.ts`: período-base "até agora" (do primeiro gasto ao último mês completo), média por categoria, Essencial/Desejo, ritmos 0,9/1/1,15, arredondamento a R$ 10, categoria sem gasto mantém a meta atual.
- `ReplanSheet` (`components/replan/`): 3 etapas (como você gasta hoje + renda opcional; afine cada categoria; tudo pronto com encaixe no orçamento, quanto guarda e "O que muda"). Salva em `category_goals` a partir do mês atual.
- `/analysis/categories` ("Suas categorias"): média por mês, libera aos 30 gastos com barra "N de 30". Atalhos no fim da Análise.

Fechamento mensal (2026-11-17): `monthly_closings` guarda saldo inicial, entradas, saídas, guardado e saldo final de cada mês. `private.close_all_users()` roda no dia 1 (pg_cron `troco-monthly-closing`) e fecha o mês anterior; o gatilho `transactions_refresh_closings` recalcula a partir do mês de um lançamento antigo criado, alterado ou excluído. `month_summary` usa o fechamento do mês anterior como saldo inicial (com saldo acumulado ligado). Home mostra o saldo herdado; o histórico da Análise mostra "Fechou em".

API pública (2026-11-17): funções auxiliares das políticas e funções de gatilho ficam no schema `private` (não publicado pelo PostgREST). No `public` só ficam as RPCs que o app chama. Função nova auxiliar vai para `private` e é chamada como `private.nome(...)`.

Login com Google (2026-11-16, oculto por enquanto: `GOOGLE_LOGIN = false` em `auth-form.tsx`): `GoogleSignInButton` (`components/auth/`) na tela de entrada, `signInWithOAuth` voltando para `/home`. Antes de redirecionar, confere em `/auth/v1/settings` se o provedor está ligado; se não, avisa. Configuração do provedor (Client ID/Secret do Google Cloud, URLs de redirecionamento) é feita no painel do Supabase.

Onboarding (2026-11-17): `OnboardingFlow` (`components/onboarding/`) aparece no `AuthGate` enquanto `profiles.onboarding_completed_at` for nulo: boas-vindas, nome, cartões de crédito, orçamento do mês, avisos (com instrução de instalar no iPhone) e pronto. Todos os passos depois do nome podem ser pulados; "Sair" encerra.

Editar conta/receita fixa (2026-11-16): "Editar conta" na folha da ocorrência abre o `BillFormSheet` com `bill` (nome, valor, dia, categoria), salvando com `updateSeries` do mês aberto em diante.

Face ID (2026-11-16): trava local por aparelho via WebAuthn (`lib/app-lock.ts`): Config > Segurança cria uma chave de plataforma e guarda o id em `localStorage` (`troco-lock:<user>`). `AppLock` (`components/auth/app-lock.tsx`, dentro do `AuthGate`) pede Face ID ao abrir e após 1 min fora do app; "Entrar com senha" faz logout.

Análise avançada (2026-11-16, backlog da spec), em Análise > Planejamento. Fora do fluxo de caixa. Tabelas `goals`, `subscriptions`, `subscription_uses`, `vehicles`, `vehicle_trips`, `vehicle_maintenance` (RLS por `user_id`; gatilho `private.check_owner_parent`). Cálculos em `lib/advanced.ts`, API em `lib/api/advanced.ts`, telas em `app/analysis/{goals,subscriptions,vehicles}` e `components/advanced/`.
- Objetivos: poupança média = entradas menos gastos dos meses completos (até 12). Vários objetivos: a poupança vai inteira para a menor prioridade até completar, depois para o próximo. Com data alvo, mostra quanto falta por mês.
- Assinaturas: dias de uso marcados no mês; custo por uso = mensal / usos; com preço avulso, mostra a diferença.
- Veículos: combustível = km do mês / km por litro x preço do litro; manutenção = custo / meses do intervalo.

Automações do iPhone (2026-11-16): Config > Automações (`app/config/automations`) gera um token pessoal (`create_automation_token`, hash em `automation_tokens`) e mostra o passo a passo do app Atalhos para Apple Pay (automação Transação), toque duplo (atalho que pede valor e local) e SMS do banco (automação Mensagem). O Atalhos chama a Edge Function `atalho` (sem JWT; GET ou POST com `t`, `s`, `v`, `l`, `c`, `x`), que lê valor e local (também de texto de SMS) e chama `automation_capture` (só service_role): cria gasto `status = 'pending'`, acha a carteira pelo apelido aprendido (`wallet_aliases`) ou nome parecido, ignora a mesma compra em 5 min e avisa por push (`automations`). Fila de pendentes: `PendingBanner` na Home (abre sozinho com `?pendentes=1`) e `PendingSheet`/`PendingConfirm` (`components/pending/`): confirmar (categoria, carteira) ou descartar. Ao confirmar compra do Apple Pay, guarda o nome do cartão como apelido. Leituras de saldo e listas usam só `status = 'confirmed'`.

Parcelas em andamento (2026-11-16): no registro de Gasto no crédito com parcelas, "Parcela atual" e "Valor total / Valor da parcela" (`InstallmentProgress`); a data vira "Data da compra". `create_installment_purchase(..., p_start)` lança só da parcela atual em diante (parcela k cai em data da compra + k-1 meses).

Instituições e atraso (2026-11-16): tabela `institutions` (leitura para todos): juros do rotativo e do parcelamento (% a.m., vêm da fatura; null = não informado), mora 1% a.m., multa 2%, IOF 0,38% + 0,0082%/dia. Carteira ganha `institution_id`, `last4` e `revolving_rate` (da fatura do cliente, vence o da instituição). Cadastro de cartão: Banco, Final do cartão, Juros do rotativo e o tipo "Crédito e débito" (cria duas carteiras: crédito com fatura e débito). `lib/late-fee.ts` estima o atraso (rotativo composto pro rata, mora, multa, IOF, teto de 100% da dívida pela Lei 14.690/2023); `LateCostGroup` na fatura em aberto mostra "Se atrasar 5/15/30 dias" ou "Em atraso há N dias".

Itens da compra e repetidas (2026-11-16): gasto guarda os itens em `source_data.items` (`[{name, amount}]`, vindos da nota ou digitados em `ItemsEditor` na edição); a lista mostra "N itens" e a busca acha pelo nome do item. Decisão: sem campo de descrição separado no gasto; o local é o título e os itens são o detalhe. `lib/duplicates.ts` acha compras repetidas (mesmo valor e carteira, até 1 dia, mesmo local); em Transações, `DuplicatesSheet` apaga uma ou marca "não é repetida" (`source_data.not_duplicate`). Nota fiscal: "Fotografar nota" ou "Da galeria". Config > Categorias de receita abre `/config/categories?tipo=receita`.

Pagar compra antes da fatura (2026-11-16): na edição de um gasto no próprio cartão de crédito, "Pagar esta compra/parcela antes da fatura" (`PrepayGroup`, RPC `prepay_purchase`): cria um `invoice_payment` da carteira escolhida e liga em `transactions.prepaid_by`; "Desfazer" (`undo_prepay_purchase`). `invoice_totals` ganhou `prepaid`; a fatura mostra e cobra `total - prepaid` (também `pay_invoice` sem valor). Fatura toda paga antes conta como paga.

Taxas por banco (2026-11-16): `institutions.bcb_names` (nomes no Banco Central) e `priority` (Nubank, Santander, Porto Seguro, Caixa, Mercado Pago, Itaú primeiro). Edge Function `taxas-bcb` (pg_cron `troco-bcb-rates`, segunda 9h17 UTC) lê a API Olinda do BCB (`TaxasJurosDiariaPorInicioPeriodo`, pessoa física, semana mais recente) e grava `institution_rates` (rotativo, parcelado, cheque especial, pessoal, consignados, veículo, bens). Atraso do cartão usa: taxa da fatura no cartão > da instituição > média do BCB. Fórmulas em `lib/finance.ts` (Tabela Price + IOF; rotativo/cheque especial com juros compostos por dia + IOF, teto de 100%). Simulador em `/analysis/credit` (Análise > Planejamento > Simular crédito).

Importar extrato: Config > Dados aceita CSV ou OFX (`parseOfx` em `lib/csv.ts`; no OFX de cartão, créditos/pagamentos ficam de fora) e pergunta em qual carteira lançar.

Conferir fatura pelo PDF (2026-11-16): na fatura, "Conferir com o PDF da fatura" (`ReconcileSheet`). `lib/statement.ts` lê o PDF no celular com pdf.js (worker em `public/pdf.worker.min.mjs`, pdfjs-dist 6.5.438), junta o texto por linha e acha lançamentos "dd/mm" ou "dd MÊS" com "R$" no fim, parcela "Parcela x de y" ou "x/y", total a pagar e saldo anterior não pago; pagamentos e créditos ficam de fora (crédito com mesmo valor e data anula o débito). `lib/reconcile.ts` casa com as compras da fatura no app (parcela, valor até 3 dias, valor). Mostra: faltam no app (adicionar uma ou todas; parcelada entra da parcela atual em diante, `installmentFirstDate` descobre a data original, inclusive de anos anteriores), no app mas não na fatura (excluir) e conferidas. Testado com faturas reais do Mercado Pago e do Nubank.

Itens da compra parcelada valem para todas as parcelas (`setGroupItems`).

Removidos (2026-11-16): tabelas `app_news`, `news_reads` e `feedback`; contas de teste (`@example.com`) e os dados delas.

Pendente (spec, seção 8):
- Backup periódico.
- Login por código de 6 dígitos (ACE-1): hoje é e-mail e senha, ou Google.

## Sobre o AGENTS.md deste repositório

O `AGENTS.md` na raiz não é o lugar das regras de projeto acima. O conteúdo dele hoje é gerado e reescrito automaticamente pelo `next dev` (aviso sobre mudanças de versão do Next.js) — mexer nele manualmente para colocar regra de projeto é regra que vai se perder ou duplicar no próximo `next dev`. As regras de projeto vivem aqui, neste arquivo.

@AGENTS.md
