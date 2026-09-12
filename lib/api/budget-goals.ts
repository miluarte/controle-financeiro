import type { BudgetGoal } from '../types'
import { api } from './client'

export const budgetGoalsApi = {
  getByMonth: (month: string) =>
    api.get<BudgetGoal[]>('getBudgetGoals', { month }),

  create: (data: Omit<BudgetGoal, 'id' | 'createdAt'>) =>
    api.post<BudgetGoal>('createBudgetGoal', data),

  update: (data: Partial<BudgetGoal> & { id: string }) =>
    api.post<BudgetGoal>('updateBudgetGoal', data),

  delete: (id: string) =>
    api.post<{ id: string }>('deleteBudgetGoal', { id }),
}
