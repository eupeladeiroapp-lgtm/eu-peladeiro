import { Jogo } from '../types'

/** Calcula o horário real de fim do jogo. Se não tiver hora_fim, assume 1h30 de duração. */
export function calcularFimJogo(dataHora: string, horaFim?: string | null): Date {
  const inicio = new Date(dataHora)
  if (horaFim) {
    const [h, m] = horaFim.split(':').map(Number)
    const fim = new Date(inicio)
    fim.setHours(h, m, 0, 0)
    // Se hora_fim < hora_inicio (ex: começa às 23h, termina às 00h30), avança um dia
    if (fim <= inicio) fim.setDate(fim.getDate() + 1)
    return fim
  }
  return new Date(inicio.getTime() + 90 * 60 * 1000)
}

/** Retorna o status efetivo do jogo, considerando se o horário de fim já passou. */
export function statusEfetivo(jogo: Jogo): Jogo['status'] {
  if (jogo.status === 'encerrado') return 'encerrado'
  if (jogo.status === 'em_andamento' && calcularFimJogo(jogo.data_hora, jogo.hora_fim) < new Date()) {
    return 'encerrado'
  }
  return jogo.status
}
