export interface Jogador {
  id: string
  nome: string
  foto_url: string | null
  posicao_principal: string | null
  posicoes_secundarias: string[]
  nivel: number
}

export function sortearTimes(jogadores: Jogador[], numTimes: number): Jogador[][] {
  const goleiros = jogadores.filter(j => j.posicao_principal === 'GOL')
  const outros = jogadores.filter(j => j.posicao_principal !== 'GOL')

  const times: Jogador[][] = Array.from({ length: numTimes }, () => [])

  // Distribute goalkeepers first (one per team if possible)
  const goleirosOrdenados = [...goleiros].sort((a, b) => b.nivel - a.nivel)
  goleirosOrdenados.forEach((gol, i) => {
    times[i % numTimes].push(gol)
  })

  // Distribute rest by snake draft
  const outrosOrdenados = [...outros].sort((a, b) => b.nivel - a.nivel)

  let direcao = 1
  let timeAtual = 0
  for (const jogador of outrosOrdenados) {
    times[timeAtual].push(jogador)
    timeAtual += direcao
    if (timeAtual >= numTimes) { direcao = -1; timeAtual = numTimes - 1 }
    if (timeAtual < 0) { direcao = 1; timeAtual = 0 }
  }

  return times
}

export function calcularNivel(
  habilidades: Record<string, number>,
  avaliacoes: Array<Record<string, number>>
): number {
  const skills = ['chute', 'drible', 'passe', 'defesa', 'forca', 'velocidade']
  const autoMedia = skills.reduce((sum, h) => sum + (habilidades[h] || 5), 0) / skills.length
  if (avaliacoes.length === 0) return autoMedia
  const todasNotas = [
    ...avaliacoes.map(av => skills.reduce((sum, h) => sum + (av[h] || 5), 0) / skills.length),
    autoMedia
  ]
  return todasNotas.reduce((a, b) => a + b, 0) / todasNotas.length
}

export function calcularMediaTime(jogadores: Jogador[]): number {
  if (jogadores.length === 0) return 0
  return jogadores.reduce((sum, j) => sum + j.nivel, 0) / jogadores.length
}

export const CORES_TIMES: { nome: string; cor: string; corTexto: string }[] = [
  { nome: 'Verde', cor: '#1D9E75', corTexto: '#ffffff' },
  { nome: 'Vermelho', cor: '#EF4444', corTexto: '#ffffff' },
  { nome: 'Azul', cor: '#3B82F6', corTexto: '#ffffff' },
  { nome: 'Amarelo', cor: '#F59E0B', corTexto: '#1f2937' },
  { nome: 'Roxo', cor: '#8B5CF6', corTexto: '#ffffff' },
  { nome: 'Laranja', cor: '#F97316', corTexto: '#ffffff' },
  { nome: 'Rosa', cor: '#EC4899', corTexto: '#ffffff' },
  { nome: 'Preto', cor: '#1F2937', corTexto: '#ffffff' },
]
