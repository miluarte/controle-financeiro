import type { RecurringGroup, Transaction } from '../types'
import { api } from './client'

export const recurringApi = {
  getAll: () => api.get<RecurringGroup[]>('getRecurringGroups'),

  create: (data: Omit<RecurringGroup, 'id' | 'createdAt'>) =>
    api.post<{ group: RecurringGroup; transactions: Transaction[] }>(
      'createRecurringGroup',
      data,
    ),

  update: (data: Partial<Omit<RecurringGroup, 'id' | 'createdAt'>> & { id: string }) =>
    api.post<RecurringGroup>('updateRecurringGroup', data),

  deactivate: (groupId: string) =>
    api.post<RecurringGroup>('deactivateRecurringGroup', { groupId }),
}
