# Prompt para Claude Code: migrar hooks de dados para SWR

Contexto: app Next.js (App Router) + shadcn, repositório `controle-financeiro`. Backend é Google Apps Script (Web App), acessado via `lib/api/client.ts`. Hoje cada hook de dados (`hooks/use-*.ts`) busca os dados com `useState` + `useEffect` puro, sem nenhum cache: toda vez que um componente que usa o hook monta (inclusive ao trocar de aba e voltar), ele bate de novo no Apps Script. Isso é lento (Apps Script tem latência alta e cota de execução) e gera chamadas repetidas desnecessárias.

Objetivo desta tarefa: trocar a camada de busca de dados de `useState`/`useEffect` para SWR, mantendo o cache em memória entre navegações, sem mudar a assinatura pública de nenhum hook (mesmos campos de retorno, mesmos nomes de método) para não precisar tocar em nenhum componente que consome esses hooks.

## Escopo

Migrar exatamente estes 6 arquivos em `hooks/`:
- `use-accounts.ts`
- `use-transactions.ts`
- `use-installments.ts`
- `use-recurring-groups.ts`
- `use-categories.ts`
- `use-budget-goals.ts`

Não mexer em `lib/api/*.ts` (accounts.ts, transactions.ts, installments.ts, recurring.ts, categories.ts, budget-goals.ts, client.ts). Esses arquivos continuam sendo a única camada que fala com o backend; o SWR só entra como cache por cima deles.

Não mexer em nenhum componente que consome os hooks (`AccountBalanceList`, `TransactionForm`, `InstallmentMonthlyChart`, etc.). Se o retorno de um hook mudar de formato, algo vai quebrar em silêncio — o contrato de retorno de cada hook tem que ficar idêntico ao atual.

## Passo 1: instalar dependência

```
npm install swr
```

## Passo 2: configurar o SWRConfig global

Em `app/layout.tsx` (ou onde for o client root do app), envolver a árvore com `SWRConfig` do pacote `swr`, com esta config:

```tsx
import { SWRConfig } from 'swr'

<SWRConfig
  value={{
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
    dedupingInterval: 5000,
  }}
>
  {children}
</SWRConfig>
```

`dedupingInterval: 5000` evita disparar duas requisições idênticas em menos de 5s (ex.: dois componentes que usam `useTransactions()` no mesmo mês, montando ao mesmo tempo). `revalidateOnFocus: true` mantém os dados atualizados quando o usuário volta pro app depois de trocar de aba/app no celular, o que importa porque é um app financeiro.

## Passo 3: padrão de migração de cada hook

Para cada hook, o padrão é:

1. Trocar o `useState` + `useEffect` de carregamento por `useSWR(key, fetcher)`.
2. A `key` do SWR deve ser um array com a ação e os parâmetros relevantes, ex.: `['getTransactions', month]`. Isso já garante cache por parâmetro (um mês diferente = chave diferente = não reaproveita cache errado).
3. Os métodos de escrita (`create`, `update`, `delete`, `archive`, etc.) continuam chamando a função correspondente de `lib/api/*.ts`, mas em vez de `setState`, atualizam o cache do SWR com `mutate(key, novoArray, false)` — o `false` no final evita revalidar de novo no servidor imediatamente, já que a resposta da própria escrita já traz o dado atualizado. Isso reproduz exatamente o comportamento atual (atualização otimista local), só que morando no cache do SWR em vez de um `useState` isolado por componente.
4. O retorno do hook mantém os mesmos nomes: `{ dado, loading, error, reload, create, update, ... }` — troque `loading` para vir de `isLoading` do SWR, `error` para vir do `error` do SWR (convertido pra string como já é feito hoje), e `reload` vira uma chamada a `mutate()` sem argumento (revalida do zero).

### Exemplo completo: `hooks/use-accounts.ts`

Arquivo atual:

```ts
'use client'

import { useState, useEffect, useCallback } from 'react'
import type { Account } from '@/lib/types'
import { accountsApi } from '@/lib/api/accounts'

export function useAccounts() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await accountsApi.getAll()
      setAccounts(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar contas')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const create = useCallback(async (data: Parameters<typeof accountsApi.create>[0]) => {
    const account = await accountsApi.create(data)
    setAccounts(prev => [...prev, account])
    return account
  }, [])

  const update = useCallback(async (data: Parameters<typeof accountsApi.update>[0]) => {
    const account = await accountsApi.update(data)
    setAccounts(prev => prev.map(a => a.id === account.id ? account : a))
    return account
  }, [])

  const archive = useCallback(async (id: string) => {
    const account = await accountsApi.archive(id)
    setAccounts(prev => prev.map(a => a.id === account.id ? account : a))
    return account
  }, [])

  return { accounts, loading, error, reload: load, create, update, archive }
}
```

Versão migrada:

```ts
'use client'

import useSWR from 'swr'
import { useCallback } from 'react'
import type { Account } from '@/lib/types'
import { accountsApi } from '@/lib/api/accounts'

const KEY = ['getAccounts'] as const

export function useAccounts() {
  const { data, error, isLoading, mutate } = useSWR<Account[]>(KEY, () => accountsApi.getAll())

  const accounts = data ?? []

  const create = useCallback(async (data: Parameters<typeof accountsApi.create>[0]) => {
    const account = await accountsApi.create(data)
    mutate([...accounts, account], false)
    return account
  }, [accounts, mutate])

  const update = useCallback(async (data: Parameters<typeof accountsApi.update>[0]) => {
    const account = await accountsApi.update(data)
    mutate(accounts.map(a => a.id === account.id ? account : a), false)
    return account
  }, [accounts, mutate])

  const archive = useCallback(async (id: string) => {
    const account = await accountsApi.archive(id)
    mutate(accounts.map(a => a.id === account.id ? account : a), false)
    return account
  }, [accounts, mutate])

  return {
    accounts,
    loading: isLoading,
    error: error ? (error instanceof Error ? error.message : 'Erro ao carregar contas') : null,
    reload: () => mutate(),
    create,
    update,
    archive,
  }
}
```

Repare que `accounts` (o array já resolvido) entra nas dependências dos `useCallback` de escrita, porque a mutação local precisa do array anterior. Isso é diferente do `setAccounts(prev => ...)` de antes (que não precisava de dependência porque recebia o `prev` do próprio setState). É a única mudança de comportamento que exige atenção: como agora não tem `prev` no `mutate`, cada `useCallback` de escrita precisa do valor atual do array como dependência, senão vai operar em cima de um array desatualizado. Aplicar o mesmo cuidado nos outros 5 hooks.

### Chaves de cada hook

- `use-accounts.ts`: `['getAccounts']`
- `use-transactions.ts`: `['getTransactions', activeMonth]` (mantém o `month ?? currentMonth()` que já existe)
- `use-installments.ts`: `accountId ? ['getInstallmentGroups', accountId] : ['getInstallmentGroups']`
- `use-recurring-groups.ts`: `['getRecurringGroups']`
- `use-categories.ts`: `['getCategories']`
- `use-budget-goals.ts`: `['getBudgetGoals', activeMonth]`

### Casos com retorno composto

`use-installments.ts` tem um método `create` cujo retorno da API é `{ group, transactions }`, não só o grupo. Ao mutar o cache local, adicionar só `result.group` ao array de grupos (é o que o hook já faz hoje com `setGroups(prev => [...prev, result.group])`), sem se preocupar com o array de `transactions` retornado (esse hook não gerencia lista de transações).

`use-recurring-groups.ts` só tem `deactivate`, sem `create`/`update` — ao mutar, replicar exatamente a lógica atual (`prev.map(g => g.id === groupId ? { ...g, active: false } : g)`), só trocando `setGroups` por `mutate(..., false)`.

`use-categories.ts` só tem `create`, sem `update`/`delete` (o backend não suporta essas ações pra categoria) — manter assim, só trocando a camada de cache.

## Passo 4: teste manual depois da migração

Rodar `npm run dev` e conferir, em cada tela, que carregar e editar continuam funcionando sem regressão:
- Dashboard (resumo mensal)
- Contas (listar, criar, editar, arquivar)
- Transações (listar por mês, criar, editar, excluir)
- Transferência entre contas
- Parcelamentos (listar, criar, editar, cancelar, quitar)
- Recorrências (listar, criar, desativar)
- Categorias (listar, criar)
- Metas de orçamento (listar por mês, criar, editar, excluir)

Confirmar especificamente:
1. Depois de criar/editar/excluir um registro, a tela atualiza na hora (mutação local), sem precisar de reload manual.
2. Trocar de aba (ex.: Contas → Parcelamentos → Contas) não dispara uma nova requisição decorativa quando os dados já estão em cache e não mudaram há poucos segundos (dá pra confirmar isso na aba Network do DevTools, filtrando pela URL do Apps Script).
3. Voltar pro app depois de um tempo fora (revalidateOnFocus) atualiza os dados sozinho.

## Fora de escopo, não fazer nesta tarefa

- Não mexer no service worker / cache do Serwist (é uma camada de cache diferente, de assets, não de dados).
- Não mudar nenhuma ação do backend (`Code.gs`).
- Não adicionar paginação, infinite scroll, nem qualquer feature nova de UI.
