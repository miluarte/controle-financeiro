<p align="center">
  <img src="public/favicon_io/apple-touch-icon.png" width="96" alt="Troco" />
</p>

<h1 align="center">Troco</h1>

<p align="center">Controle financeiro pessoal e da família, feito para o iPhone.<br/>Registrar um gasto leva três toques.</p>

---

## O que faz

- **Registro rápido.** Gasto, receita ou guardar pelo botão +, com parcelas no crédito e itens da compra.
- **Nota fiscal.** Lê o QR code da NFC-e direto da Sefaz; sem QR, lê a foto (Gemini, com Tesseract.js de reserva).
- **Contas e faturas.** Contas e receitas fixas, parcelamentos, fatura de cada cartão calculada pelo fechamento e vencimento.
- **Conferir fatura pelo PDF.** Importa o PDF do banco, mostra o que falta ou sobra no app e adiciona em um toque.
- **Família.** Cartões compartilhados, "de quem é essa compra", quanto cada um deve e acerto com confirmação.
- **Análise.** Orçamento, ritmo do mês, livre por dia, metas por categoria, histórico e replanejamento.
- **Automações do iPhone.** Apple Pay, toque duplo nas costas e SMS do banco pelo app Atalhos.
- **Avisos.** Contas a vencer, lembrete de registro, resumo da semana, orçamento, ritmo e gasto fora do padrão.
- **Crédito.** Juros por banco (API do Banco Central), custo de atraso e simulador de empréstimo.
- **Privacidade.** Cada pessoa só vê o que é dela, garantido no banco (RLS). Face ID opcional.

Tudo roda em planos gratuitos.

## Stack

| Camada | Tecnologia |
|---|---|
| App | Next.js 16 (App Router), React 19, PWA |
| Interface | shadcn/ui, Tailwind CSS 4, ícones Solar, visual iOS 26 (Liquid Glass) |
| Dados | Supabase: Postgres, Auth, RLS, Storage, pg_cron |
| Funções | Edge Functions: `notify`, `atalho`, `ler-nota`, `ler-qrcode`, `taxas-bcb` |
| Hospedagem | Vercel |

## Rodar localmente

```bash
npm install
```

```bash
npm run dev
```

Abra http://localhost:3000. O app já aponta para o projeto Supabase; para usar outro, crie um `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sua-chave-publicavel
```

Outros comandos: `npm run build`, `npm run start` e `npm run lint`.

## Estrutura

```
app/                 telas (Contas, Home, Análise, Config, cartões, transações)
components/          componentes por área; components/ios guarda os padrões do iOS
lib/                 regras e cálculos (fatura, análise, juros, leitura de nota e PDF)
lib/api/             acesso ao Supabase, um módulo por assunto
supabase/migrations/ schema do banco, versionado
supabase/functions/  Edge Functions
docs/                modelo de dados
```

## Regras do projeto

- Dinheiro sempre em centavos (inteiro).
- Cores só por tokens semânticos em `app/theme.css`, sobre a escala `zinc`.
- Ícones só de `@solar-icons/react`: `Linear` no estado normal, `Bold` quando ativo.
- Pensado para o celular; no desktop, ajustes só com classes `lg:`.

As regras completas e o estado atual de cada parte estão em [`CLAUDE.md`](CLAUDE.md). O modelo de dados está em [`docs/banco-de-dados.md`](docs/banco-de-dados.md).
