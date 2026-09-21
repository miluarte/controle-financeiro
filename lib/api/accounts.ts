import type { Account } from '../types'
import { api } from './client'

export const accountsApi = {
  getAll: () => api.get<Account[]>('getAccounts'),

  create: (data: Omit<Account, 'id' | 'createdAt' | 'currentBalance' | 'availableCredit'>) =>
    api.post<Account>('createAccount', data),

  update: (data: Partial<Account> & { id: string }) =>
    api.post<Account>('updateAccount', data),

  archive: (id: string) =>
    api.post<Account>('archiveAccount', { id }),
}
