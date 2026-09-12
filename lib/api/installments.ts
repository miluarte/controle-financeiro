import type { InstallmentGroup, Transaction } from '../types'
import { api } from './client'

export const installmentsApi = {
  getAll: () => api.get<InstallmentGroup[]>('getInstallmentGroups'),

  getByAccount: (accountId: string) =>
    api.get<InstallmentGroup[]>('getInstallmentGroups', { accountId }),

  create: (data: Omit<InstallmentGroup, 'id' | 'createdAt' | 'paidCount' | 'status'>) =>
    api.post<{ group: InstallmentGroup; transactions: Transaction[] }>(
      'createInstallmentGroup',
      data,
    ),

  payOff: (groupId: string) =>
    api.post<InstallmentGroup>('payOffInstallments', { groupId }),
}
