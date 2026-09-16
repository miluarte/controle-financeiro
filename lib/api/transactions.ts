import type { Transaction } from '../types'
import { api } from './client'

export const transactionsApi = {
  getAll: () => api.get<Transaction[]>('getTransactions'),

  getByMonth: (month: string) =>
    api.get<Transaction[]>('getTransactions', { month }),

  getByAccount: (accountId: string, startDate: string, endDate: string) =>
    api.get<Transaction[]>('getTransactions', { accountId, startDate, endDate }),

  create: (data: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>) =>
    api.post<Transaction>('createTransaction', data),

  update: (data: Partial<Transaction> & { id: string }) =>
    api.post<Transaction>('updateTransaction', data),

  delete: (id: string) =>
    api.post<{ id: string }>('deleteTransaction', { id }),
}
