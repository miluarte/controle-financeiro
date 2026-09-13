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

  update: (data: { id: string; description?: string; categoryId?: string | null; accountId?: string }) =>
    api.post<InstallmentGroup>('updateInstallmentGroup', data),

  cancel: (groupId: string) =>
    api.post<InstallmentGroup>('cancelInstallmentGroup', { groupId }),

  payOff: (groupId: string) =>
    api.post<InstallmentGroup>('payOffInstallments', { groupId }),
}
