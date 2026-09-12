import type { ApiResponse } from '../types'

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? ''

async function request<T>(
  method: 'GET' | 'POST',
  action: string,
  params?: Record<string, string>,
  body?: unknown,
): Promise<T> {
  const url = new URL(BASE_URL)
  url.searchParams.set('action', action)

  if (method === 'GET' && params) {
    for (const [k, v] of Object.entries(params)) {
      url.searchParams.set(k, v)
    }
  }

  const res = await fetch(url.toString(), {
    method,
    // text/plain evita o preflight CORS que o Apps Script Web App não trata bem.
    // O backend faz JSON.parse(e.postData.contents) independente do header.
    headers: method === 'POST' ? { 'Content-Type': 'text/plain;charset=utf-8' } : undefined,
    body: method === 'POST' ? JSON.stringify(body) : undefined,
  })

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${res.statusText}`)
  }

  const json: ApiResponse<T> = await res.json()

  if (!json.success) {
    throw new Error(json.error)
  }

  return json.data
}

export const api = {
  get: <T>(action: string, params?: Record<string, string>) =>
    request<T>('GET', action, params),
  post: <T>(action: string, body: unknown) =>
    request<T>('POST', action, undefined, body),
}
