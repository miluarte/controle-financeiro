import type { Category } from './types'

// Sugestão de categoria sem IA: 1) o que você já usou para o mesmo local; 2) palavras-chave do nome do local
// e dos itens. Roda no celular, de graça.

export function normPlace(s: string): string {
  return s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()
    .replace(/\b(pg|pag|ec|mp|mercadopago|pagseguro|ebanx|paypal|iz|sumup|stone|cielo)\s*\*/g, ' ') // intermediadores
    .replace(/\d+\s*(\/|de)\s*\d+/g, ' ')  // parcela 2/12, 2 de 12
    .replace(/[^a-z\s]/g, ' ').replace(/\s+/g, ' ').trim()
}

// palavras-chave por categoria (nome normalizado da categoria padrão)
const KEYWORDS: Record<string, string[]> = {
  'alimentacao': ['mercado', 'supermerc', 'atacad', 'assai', 'carrefour', 'pao de acucar', 'padaria', 'panific', 'restaurante', 'lanch', 'pizza', 'burger', 'mc donald', 'mcdonald', 'bk ', 'ifood', 'rappi', 'acougue', 'hortifruti', 'sacolao', 'cafe', 'cafeteria', 'sorvet', 'doceria', 'confeitaria', 'bar ', 'churrasc', 'sushi', 'emporio', 'mercearia', 'hamburg', 'esfiha', 'pastel', 'outback', 'subway', 'starbucks', 'zé delivery', 'ze delivery'],
  'transporte': ['posto', 'combust', 'gasolina', 'shell', 'ipiranga', 'petrobras', 'br mania', 'uber', '99 ', 'taxi', 'cabify', 'estacion', 'parking', 'pedagio', 'sem parar', 'conectcar', 'veloe', 'metro', 'onibus', 'bilhete unico', 'recarga transp', 'auto pecas', 'oficina', 'borracharia', 'lava jato', 'detran', 'ipva'],
  'saude': ['farmac', 'drogar', 'droga raia', 'drogasil', 'pague menos', 'panvel', 'pacheco', 'hospital', 'clinica', 'laborat', 'odonto', 'dentist', 'medic', 'unimed', 'amil', 'hapvida', 'otica', 'psicolog', 'fisioter', 'exame'],
  'assinaturas': ['netflix', 'spotify', 'amazon prime', 'prime video', 'disney', 'hbo', 'max ', 'globoplay', 'youtube', 'icloud', 'apple com bill', 'google one', 'deezer', 'paramount', 'crunchyroll', 'chatgpt', 'openai', 'claude', 'canva', 'adobe', 'microsoft', 'dropbox', 'applyfy', 'assinatura'],
  'lazer': ['cinema', 'cinemark', 'ingresso', 'sympla', 'eventim', 'show', 'teatro', 'steam', 'playstation', 'xbox', 'nintendo', 'parque', 'boliche', 'museu', 'clube', 'viagem', 'hotel', 'airbnb', 'booking', 'decolar', 'latam', 'gol linhas', 'azul linhas'],
  'moradia': ['aluguel', 'condomin', 'enel', 'light ', 'cemig', 'copel', 'celesc', 'coelba', 'energia', 'sabesp', 'copasa', 'cedae', 'saneamento', 'agua', 'comgas', 'naturgy', 'gas ', 'internet', 'vivo', 'claro', 'tim ', 'oi ', 'net ', 'leroy', 'telhanorte', 'c c', 'tok stok', 'madeiramadeira', 'material de constr', 'iptu'],
  'educacao': ['escola', 'colegio', 'faculdade', 'universidade', 'curso', 'udemy', 'alura', 'coursera', 'livraria', 'saraiva', 'kindle', 'papelaria', 'kalunga', 'mensalidade'],
  'tecnologia e equipamentos': ['kabum', 'apple store', 'samsung', 'dell', 'lenovo', 'positivo', 'eletron', 'informatica', 'pichau', 'terabyte', 'fast shop', 'celular', 'notebook'],
  'vestuario e beleza': ['renner', 'c a ', 'cea ', 'riachuelo', 'marisa', 'zara', 'hering', 'shein', 'centauro', 'netshoes', 'nike', 'adidas', 'calcad', 'roupa', 'moda', 'boutique', 'salao', 'cabeleir', 'barbearia', 'manicure', 'estetica', 'perfum', 'boticario', 'natura', 'sephora', 'avon', 'cosmetic', 'beleza'],
  'pet': ['pet', 'petz', 'cobasi', 'petlove', 'veterin', 'racao', 'agropet', 'banho e tosa'],
  'presentes': ['presente', 'floricult', 'flores', 'gift'],
  'dividas e parcelamentos': ['emprestimo', 'financiamento', 'parcelamento de fatura', 'juros', 'iof', 'consignado', 'acordo'],
}

export type PlaceMemory = Map<string, string> // local normalizado -> categoria mais usada

export function buildPlaceMemory(rows: { place: string | null; categoryId: string | null }[]): PlaceMemory {
  const counts = new Map<string, Map<string, number>>()
  for (const r of rows) {
    if (!r.place || !r.categoryId) continue
    const key = normPlace(r.place)
    if (!key) continue
    const c = counts.get(key) ?? new Map<string, number>()
    c.set(r.categoryId, (c.get(r.categoryId) ?? 0) + 1)
    counts.set(key, c)
  }
  const memory: PlaceMemory = new Map()
  for (const [key, c] of counts) memory.set(key, [...c.entries()].sort((a, b) => b[1] - a[1])[0][0])
  return memory
}

const firstWords = (s: string, n: number) => s.split(' ').slice(0, n).join(' ')

export function suggestCategory(
  input: { place?: string | null; items?: { name: string }[] },
  categories: Category[],
  memory: PlaceMemory,
): string | null {
  const active = categories.filter(c => c.type === 'expense' && c.active)
  const valid = (id: string | undefined) => (id && active.some(c => c.id === id) ? id : null)
  const place = normPlace(input.place ?? '')

  if (place) {
    // 1. mesmo local de antes (igual, ou mesmas duas primeiras palavras)
    const exact = valid(memory.get(place))
    if (exact) return exact
    const head = firstWords(place, 2)
    if (head.length >= 4) {
      for (const [key, id] of memory) if (firstWords(key, 2) === head && valid(id)) return id
    }
  }

  // 2. palavras-chave no local e nos itens
  const hay = ` ${place} ${(input.items ?? []).map(i => normPlace(i.name)).join(' ')} `
  if (!hay.trim()) return null
  for (const c of active) {
    const words = KEYWORDS[normPlace(c.name)]
    // começo de palavra; palavra-chave com espaço no fim exige a palavra inteira ("bk ", "oi ")
    if (words?.some(w => hay.includes(` ${w}`))) return c.id
  }
  return null
}
