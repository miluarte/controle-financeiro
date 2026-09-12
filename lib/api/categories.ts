import type { Category } from '../types'
import { api } from './client'

export const categoriesApi = {
  getAll: () => api.get<Category[]>('getCategories'),

  create: (data: Omit<Category, 'id' | 'createdAt'>) =>
    api.post<Category>('createCategory', data),
}
