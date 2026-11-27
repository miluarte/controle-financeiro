import type { Category } from './types'

// Sugestão de categoria sem IA: 1) o que você já usou para o mesmo local; 2) palavras-chave do nome do local
// e dos itens. Roda no celular, de graça.

export function normPlace(s: string): string {
  return s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()
    .replace(/\b(pg|pag|ec|mp|mercadopago|pagseguro|ebanx|paypal|iz|sumup|stone|cielo)\s*\*/g, ' ') // intermediadores
    .replace(/\d+\s*(\/|de)\s*\d+/g, ' ')  // parcela 2/12, 2 de 12
    .replace(/[^a-z\s]/g, ' ').replace(/\s+/g, ' ').trim()
}

// palavras-chave por categoria (nome normalizado da categoria universal; subcategoria quando dá para saber)
const KEYWORDS: Record<string, string[]> = {
  'supermercado': ['mercado', 'supermerc', 'atacad', 'assai', 'carrefour', 'pao de acucar', 'acougue', 'hortifruti', 'sacolao', 'mercearia', 'emporio'],
  'alimentos e bebidas': ['padaria', 'panific', 'cafe', 'cafeteria', 'sorvet', 'doceria', 'confeitaria', 'starbucks'],
  'delivery de alimentos': ['ifood', 'rappi', 'ze delivery', 'aiqfome'],
  'restaurantes bares e lanchonetes': ['restaurante', 'lanch', 'pizza', 'burger', 'mc donald', 'mcdonald', 'bk ', 'bar ', 'churrasc', 'sushi', 'hamburg', 'esfiha', 'pastel', 'outback', 'subway'],
  'postos de gasolina': ['posto', 'combust', 'gasolina', 'shell', 'ipiranga', 'petrobras', 'br mania'],
  'taxi e transporte privado urbano': ['uber', '99 ', 'taxi', 'cabify'],
  'estacionamentos': ['estacion', 'parking'],
  'pedagios e pagamentos no veiculo': ['pedagio', 'sem parar', 'conectcar', 'veloe'],
  'transporte publico': ['metro', 'onibus', 'bilhete unico', 'recarga transp'],
  'manutencao de veiculos': ['auto pecas', 'oficina', 'borracharia', 'lava jato'],
  'taxas e impostos sobre veiculos': ['detran', 'ipva'],
  'farmacia': ['farmac', 'drogar', 'droga raia', 'drogasil', 'pague menos', 'panvel', 'pacheco'],
  'hospitais clinicas e laboratorios': ['hospital', 'clinica', 'laborat', 'medic', 'exame', 'psicolog', 'fisioter'],
  'dentista': ['odonto', 'dentist'],
  'otica': ['otica'],
  'seguro saude': ['unimed', 'amil', 'hapvida'],
  'streaming de video': ['netflix', 'amazon prime', 'prime video', 'disney', 'hbo', 'max ', 'globoplay', 'paramount', 'crunchyroll'],
  'streaming de musica': ['spotify', 'deezer'],
  'jogos e videogames': ['steam', 'playstation', 'xbox', 'nintendo'],
  'servicos digitais': ['youtube', 'icloud', 'apple com bill', 'google one', 'chatgpt', 'openai', 'claude', 'canva', 'adobe', 'microsoft', 'dropbox', 'applyfy', 'assinatura'],
  'cinema teatro e concertos': ['cinema', 'cinemark', 'ingresso', 'sympla', 'eventim', 'show', 'teatro'],
  'hospedagem': ['hotel', 'airbnb', 'booking'],
  'aeroportos e cias aereas': ['latam', 'gol linhas', 'azul linhas'],
  'viagens': ['viagem', 'decolar'],
  'lazer': ['parque', 'boliche', 'clube'],
  'museus e pontos turisticos': ['museu'],
  'aluguel': ['aluguel'],
  'eletricidade': ['enel', 'light ', 'cemig', 'copel', 'celesc', 'coelba', 'energia'],
  'agua': ['sabesp', 'copasa', 'cedae', 'saneamento', 'agua'],
  'gas': ['comgas', 'naturgy', 'gas '],
  'internet': ['internet', 'net '],
  'celular': ['vivo', 'claro', 'tim ', 'oi '],
  'utensilios para casa': ['leroy', 'telhanorte', 'c c', 'tok stok', 'madeiramadeira', 'material de constr'],
  'impostos sobre moradia': ['iptu'],
  'moradia': ['condomin'],
  'escola': ['escola', 'colegio', 'mensalidade'],
  'universidade': ['faculdade', 'universidade'],
  'cursos online': ['curso', 'udemy', 'alura', 'coursera'],
  'livraria': ['livraria', 'saraiva', 'kindle'],
  'papelaria': ['papelaria', 'kalunga'],
  'eletronicos': ['kabum', 'apple store', 'samsung', 'dell', 'lenovo', 'positivo', 'eletron', 'informatica', 'pichau', 'terabyte', 'fast shop', 'celular', 'notebook'],
  'artigos esportivos': ['centauro', 'netshoes', 'decathlon'],
  'calcados': ['calcad'],
  'roupas': ['renner', 'c a ', 'cea ', 'riachuelo', 'marisa', 'zara', 'hering', 'shein', 'nike', 'adidas', 'roupa', 'moda', 'boutique'],
  'salao de beleza e barbearia': ['salao', 'cabeleir', 'barbearia'],
  'unhas e manicure': ['manicure'],
  'estetica e procedimentos': ['estetica'],
  'perfumaria': ['perfum', 'boticario', 'natura', 'avon'],
  'maquiagem': ['sephora', 'cosmetic'],
  'beleza e cuidados pessoais': ['beleza'],
  'pet shops e veterinarios': ['pet', 'petz', 'cobasi', 'petlove', 'veterin', 'racao', 'agropet', 'banho e tosa'],
  'compras': ['presente', 'floricult', 'flores', 'gift'],
  'parcelamento de fatura': ['parcelamento de fatura'],
  'emprestimos e financiamento': ['emprestimo', 'financiamento', 'consignado', 'acordo'],
  'juros cobrados': ['juros'],
  'impostos sobre operacoes financeiras': ['iof'],
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
