export const POSICAO_LABELS: Record<string, string> = {
  GOL: 'Goleiro',
  LD: 'Lateral Direito',
  LE: 'Lateral Esquerdo',
  ZD: 'Zagueiro',
  ZE: 'Zagueiro',
  VD: 'Volante',
  VE: 'Volante',
  MC: 'Meia Central',
  MD: 'Meia Direito',
  ME: 'Meia Esquerdo',
  CA: 'Centroavante',
  PD: 'Ponta Direita',
  PE: 'Ponta Esquerda',
}

export const POSICAO_CORES: Record<string, string> = {
  GOL: 'bg-amber-100 text-amber-700',
  LD: 'bg-blue-100 text-blue-700',
  LE: 'bg-blue-100 text-blue-700',
  ZD: 'bg-indigo-100 text-indigo-700',
  ZE: 'bg-indigo-100 text-indigo-700',
  VD: 'bg-purple-100 text-purple-700',
  VE: 'bg-purple-100 text-purple-700',
  MC: 'bg-green-100 text-green-700',
  MD: 'bg-green-100 text-green-700',
  ME: 'bg-green-100 text-green-700',
  CA: 'bg-red-100 text-red-700',
  PD: 'bg-orange-100 text-orange-700',
  PE: 'bg-orange-100 text-orange-700',
}

export function getPosicaoLabel(pos: string): string {
  return POSICAO_LABELS[pos] ?? pos
}

export function getPosicaoCor(pos: string): string {
  return POSICAO_CORES[pos] ?? 'bg-gray-100 text-gray-600'
}
