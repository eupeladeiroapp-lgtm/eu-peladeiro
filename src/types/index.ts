export interface Profile {
  id: string
  nome: string
  foto_url: string | null
  posicao_principal: string | null
  posicoes_secundarias: string[]
  habilidades: {
    chute: number
    drible: number
    passe: number
    defesa: number
    forca: number
    velocidade: number
  }
  created_at: string
}

export interface Grupo {
  id: string
  nome: string
  descricao: string | null
  formato: string
  criado_por: string
  created_at: string
}

export interface GrupoMembro {
  id: string
  grupo_id: string
  profile_id: string
  role: 'admin' | 'membro'
  created_at: string
}

export interface Jogo {
  id: string
  grupo_id: string
  data_hora: string
  hora_fim?: string | null
  local: string | null
  formato: string
  num_times: number
  status: 'aberto' | 'em_andamento' | 'encerrado'
  link_token: string
  criado_por: string
  created_at: string
}

export interface Confirmacao {
  id: string
  jogo_id: string
  profile_id: string
  status: 'confirmado' | 'recusado'
  tipo_convite: 'fixo' | 'avulso'
  created_at: string
}

export interface Time {
  id: string
  jogo_id: string
  nome: string
  cor: string
  ordem_fila: number
  status: 'jogando' | 'aguardando' | 'eliminado'
  created_at: string
}

export interface TimeJogador {
  id: string
  time_id: string
  profile_id: string
  posicao_alocada: string | null
}

export interface Estatistica {
  id: string
  jogo_id: string
  profile_id: string
  gols: number
  assistencias: number
  defesas: number
  cartao_amarelo: number
  cartao_vermelho: number
  created_at: string
}

export interface Avaliacao {
  id: string
  avaliador_id: string
  avaliado_id: string
  grupo_id: string
  habilidades: Record<string, number>
  created_at: string
}

export interface Partida {
  id: string
  jogo_id: string
  time_a: string
  time_b: string
  gols_a: number
  gols_b: number
  status: 'em_andamento' | 'encerrada'
  iniciada_em: string
  encerrada_em: string | null
}

export interface Notificacao {
  id: string
  profile_id: string
  tipo: 'times_sorteados' | 'partida_encerrada'
  jogo_id: string
  lida: boolean
  created_at: string
}
