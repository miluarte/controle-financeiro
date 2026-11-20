# Guia de conteúdo do Troco

Regras de escrita de toda a interface: voz e tom, como escrever cada elemento e o glossário de verbos e termos. Vale para qualquer texto novo ou alterado.

## 1. Voz e tom

- **Direto:** diz o que é preciso e para. Uma frase quando der.
- **Próximo, sem gíria:** trata a pessoa por "você". Sem "te", "a gente", "me diz".
- **Neutro com dinheiro:** não julga gasto nem comemora. Mostra o número e o que dá para fazer.
- **Calmo em erro e atraso:** explica o que aconteceu e o próximo passo, sem alarme.
- **Sem explicar o óbvio:** se o rótulo já diz, o texto de apoio não repete.

## 2. Regras gerais

1. Todo texto em português. Nomes próprios e de produto ficam como são (Face ID, Pix, Apple Pay).
2. Maiúscula só na primeira palavra e em nome próprio: "Conta fixa", "Ler nota fiscal".
3. Sem artigo no começo de rótulos e botões: "Excluir conta", não "Excluir a conta".
4. Sem ponto final em botão, título, rótulo, aba, chip, item de menu e selo. Ponto só em frase completa (texto de apoio, erro, aviso).
5. Contagem de palavras:
   - Termo composto conta como uma palavra: "nota fiscal", "conta fixa", "Face ID", "cartão de crédito", "fatura atual".
   - Conector não conta: de, do, da, com, por, para, em, no, na, a, e, ou.
6. Não repetir o contexto: em tela com seletor de mês, o texto não repete o mês ("Gasto no mês").
7. Mesma coisa, mesma palavra: seguir os glossários (seções 5 e 6).
8. Datas com mês abreviado em minúsculas: "16 nov 2026", "nov 2026". Ano só se não for o atual.
9. Dinheiro sempre por `formatCurrency` ("R$ 1.234,56"). Sem "reais" por extenso em rótulo.
10. Números em algarismo: "3 parcelas", "5 dias".

## 3. Por tipo de elemento

| Elemento | Forma | Limite | Exemplo | Evitar |
|---|---|---|---|---|
| Botão | verbo no infinitivo + objeto, se preciso | 2 palavras | Salvar, Excluir conta, Ler nota fiscal | Clique aqui, Paguei a Ana, Confirmar dados |
| Botão principal de folha | só o verbo | 1 palavra | Salvar, Pagar, Adicionar | Salvar alterações |
| Link, "ver mais" | verbo no infinitivo | 2 palavras | Ver todas, Ver comprovante | Clique para ver |
| Item de menu (ação) | igual ao botão | 2 palavras | Editar, Exportar CSV | |
| Item de menu (tipo a criar) | substantivo | 2 palavras | Gasto, Receita, Conta fixa | Novo gasto |
| Aba | substantivo | 1 palavra | Contas, Análise | Minhas contas |
| Título de página | substantivo | 3 palavras | Transações, Suas categorias | Gerencie suas categorias |
| Título de folha (criar) | "Novo/Nova" + substantivo | 3 palavras | Novo gasto, Nova conta fixa | Adicionar um novo gasto |
| Título de folha (editar) | nome da coisa | 3 palavras | Conta de luz | Editar transação |
| Título de grupo | substantivo | 3 palavras | Faturas, A receber, Compras pagas | Suas faturas deste mês |
| Rótulo de campo | substantivo | 3 palavras | Valor, Data da compra, Dia do vencimento | Informe o valor |
| Pergunta como rótulo | pergunta curta, só quando guia a pessoa | 5 palavras | Onde foi?, Como você pagou? | Em qual estabelecimento foi feita a compra? |
| Placeholder | exemplo, não instrução | 3 palavras | Ex.: Mercado | Digite aqui o nome |
| Interruptor (switch) | estado, verbo no infinitivo | 3 palavras | Repetir todo mês, Anexar a foto | Ativar repetição mensal |
| Chip, filtro | substantivo | 2 palavras | Crédito, Débito, Categorias | Filtrar por categoria |
| Controle segmentado | substantivo ou verbo curto | 1 palavra | Gasto, Receita, Guardar | |
| Texto de apoio (footer, dica) | uma frase | 12 palavras | Cobrada sozinha na fatura. | Esta opção permite que você… |
| Estado vazio | o que falta + o que fazer | 2 frases curtas | Nenhum gasto ainda. Toque no + para registrar. | Ops! Parece que não há nada aqui |
| Erro | o que deu errado + o que fazer | 2 frases curtas | Não deu para ler a nota. Tente outra foto. | Erro 500. Falha inesperada! |
| Pergunta de confirmação | verbo + objeto + "?" | 4 palavras | Excluir compra?, Encerrar conta? | Tem certeza que deseja excluir? |
| Botão da confirmação | repete o verbo da pergunta, ou a opção | 2 palavras | Excluir, Só esta parcela | Sim |
| Aviso push: título | o fato | 4 palavras | Conta vence amanhã | Atenção! |
| Aviso push: texto | detalhe com nome e valor | 1 frase | Luz, R$ 182,40, vence dia 21. | |
| Selo, status | adjetivo ou particípio | 2 palavras | Paga, Vencida, Pendente | Esta fatura está paga |
| Carregando | sem texto, só `LoadingDots` | | | Carregando… |

Botão sempre no infinitivo, padrão do iOS e do Android em português. Imperativo ("Salve", "Confira") e primeira pessoa ("Paguei", "Quero") não entram em botão.

Exceções aceitas em botão (respostas, não ações):
- **OK:** só em alerta informativo, sem escolha.
- **Agora não:** recusar uma sugestão.
- **Pronto:** fim de um fluxo (passo a passo inicial).

## 4. Padrões de interface ligados ao texto

- Folha modal: X | título | ação em cápsula.
- Edição de algo que pode ser excluído: "Excluir" em vermelho no topo e "Salvar" embaixo.
- Excluir sempre pergunta numa folha de ações, com as opções quando houver mais de uma ("Só esta parcela", "Compra inteira").
- Dois botões juntos: secundário à esquerda, principal à direita.
- Carregando: três pontos, nunca texto.

## 5. Glossário de verbos

| Use | Para | Não use |
|---|---|---|
| Adicionar | incluir algo numa lista ou lançar valor | Incluir, Inserir, Cadastrar |
| Criar | algo que passa a existir com nome próprio (família, categoria, token) | Gerar, Novo |
| Salvar | gravar alterações num formulário | Confirmar, Concluir, Gravar, Atualizar |
| Editar | abrir para mudar | Alterar, Modificar |
| Excluir | apagar de vez | Apagar, Deletar |
| Remover | tirar pessoa ou vínculo, sem apagar a coisa (membro, anexo) | Excluir, nesses casos |
| Arquivar | esconder sem apagar | Ocultar, Desativar |
| Encerrar | parar uma série a partir de um mês (conta ou receita fixa) | Cancelar, Parar, Finalizar |
| Cancelar | desistir de algo em andamento (acerto aguardando) | Desistir |
| Desfazer | voltar uma ação já feita (pagamento, antecipação) | Desmarcar, Estornar, Reverter |
| Descartar | jogar fora rascunho ou pendente | Ignorar, Excluir |
| Pagar | registrar pagamento de conta ou fatura | Quitar, Liquidar, Marcar como paga |
| Receber | registrar entrada de receita fixa | Marcar como recebida |
| Antecipar | pagar compra ou parcela antes da fatura | Pagar antes, Adiantar |
| Guardar | separar dinheiro (tipo de lançamento) | Poupar, Investir, Reservar |
| Ler | extrair dados de nota ou PDF | Escanear, Digitalizar, Processar |
| Conferir | comparar fatura do PDF com o app | Reconciliar, Verificar, Checar |
| Importar, Exportar | trazer ou levar arquivo | Carregar, Baixar, Upload |
| Fixar, Desafixar | tornar um gasto conta fixa | Repetir, Recorrente |
| Dividir | repartir compra entre pessoas | Ratear, Separar |
| Aprovar, Recusar | pedido de entrada ou acerto | Aceitar, Rejeitar, Negar |
| Entrar, Sair | sessão ou família | Logar, Login, Logout, Deslogar |
| Ver | abrir detalhe ou lista completa | Visualizar, Mostrar, Abrir |
| Compartilhar | dar acesso a cartão ou enviar PDF | Enviar, nesses casos |
| Replanejar | refazer metas | Recalcular, Ajustar metas |
| Informar | avisar o outro de algo feito fora do app (acerto) | Paguei, Reportar |

## 6. Glossário de termos

| Use | Não use | Observação |
|---|---|---|
| Gasto | Despesa, Saída, Débito | |
| Receita | Entrada, Ganho | "Renda" só na pergunta de planejamento |
| Guardado | Poupança, Investimento | |
| Transação | Lançamento, Movimentação | lista geral (gasto, receita, guardar) |
| Conta fixa | Conta recorrente, Despesa fixa | |
| Receita fixa | Salário fixo, Entrada recorrente | |
| Fatura | Boleto do cartão | do cartão de crédito |
| Extrato | Relatório | da conta bancária |
| Carteira | Meio de pagamento, Conta bancária | o que a pessoa cadastra (cartão, conta, dinheiro) |
| Pagamento | Pago com, Meio de pagamento | campo e filtro onde se escolhe a carteira que pagou |
| Forma de pagamento | Tipo de pagamento | crédito, débito, Pix, dinheiro |
| Cartão | Cartão de crédito, quando já está claro | |
| Parcela | Prestação | |
| Orçamento | Limite mensal, Teto | total do mês |
| Meta | Limite da categoria | por categoria |
| Objetivo | Meta de poupança, Sonho | Planejamento |
| Família | Grupo, Time | |
| Titular | Dono do cartão | |
| Acerto | Reembolso, Pagamento entre pessoas | "Reembolso" só como categoria |
| Pendente | Rascunho, A confirmar | título da fila: "Para confirmar" |
| Nota fiscal | Cupom, Recibo, Nota | |
| Comprovante | Recibo, Anexo, Foto | foto guardada da nota |
