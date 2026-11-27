import { normPlace } from './category-suggest'

// Chave do nome da maquininha: a mesma regra da sugestão de categoria (sem maiúsculas, acentos,
// prefixo de intermediador e parcela). Nome só com números ("99") fica como está, em minúsculas.
export function placeKey(name: string): string {
  return normPlace(name) || name.trim().toLowerCase()
}
