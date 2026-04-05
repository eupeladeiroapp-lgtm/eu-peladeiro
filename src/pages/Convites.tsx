import { Bell, Calendar, Check, ClipboardList, Clock, Shield, Sparkles, Star, Trophy, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import { Jogo, Notificacao } from '../types'

interface ItemNotificacao {
  tipo: 'confirmacao' | 'estatistica' | 'avaliacao' | 'times_sorteados' | 'partida_encerrada' | 'lembrete_estatistica' | 'avaliacao_recebida'
  jogo: Jogo
  grupoNome: string
  grupoId?: string
  notificacaoId?: string
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('pt-BR', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
  })
}

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

export default function Convites() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [itens, setItens] = useState<ItemNotificacao[]>([])
  const [loading, setLoading] = useState(true)
  const [respondendo, setRespondendo] = useState<string | null>(null)

  useEffect(() => {
    fetchNotificacoes()
  }, [user])

  async function fetchNotificacoes() {
    if (!user) return
    try {
      setLoading(true)
      const agora = new Date().toISOString()
      const resultado: ItemNotificacao[] = []

      // 1. Jogos pendentes de confirmação (grupos do usuário)
      const { data: membros } = await supabase
        .from('grupo_membros')
        .select('grupo_id, grupo:grupos(nome)')
        .eq('profile_id', user.id)

      const grupoIds = (membros || []).map((m) => m.grupo_id)

      if (grupoIds.length > 0) {
        const { data: jogosAbertos } = await supabase
          .from('jogos')
          .select('*')
          .in('grupo_id', grupoIds)
          .eq('status', 'aberto')
          .gte('data_hora', agora)
          .order('data_hora', { ascending: true })

        if (jogosAbertos && jogosAbertos.length > 0) {
          const { data: minhasConfs } = await supabase
            .from('confirmacoes')
            .select('jogo_id')
            .eq('profile_id', user.id)
            .in('jogo_id', jogosAbertos.map((j) => j.id))

          const jaRespondidos = new Set((minhasConfs || []).map((c) => c.jogo_id))

          for (const jogo of jogosAbertos as Jogo[]) {
            if (!jaRespondidos.has(jogo.id)) {
              const membro = (membros || []).find((m) => m.grupo_id === jogo.grupo_id)
              const grupo = (membro?.grupo as unknown) as { nome: string } | null
              resultado.push({
                tipo: 'confirmacao',
                jogo,
                grupoNome: grupo?.nome || 'Grupo',
                grupoId: jogo.grupo_id,
              })
            }
          }
        }
      }

      // 2. Jogos encerrados nos últimos 3 dias onde o usuário estava confirmado
      const { data: minhasConfsRecentes } = await supabase
        .from('confirmacoes')
        .select('jogo_id')
        .eq('profile_id', user.id)
        .eq('status', 'confirmado')

      if (minhasConfsRecentes && minhasConfsRecentes.length > 0) {
        const jogoIdsConf = minhasConfsRecentes.map((c) => c.jogo_id)

        const tresDiasAtras = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()

        // Busca jogos encerrados — inclui todos independente de grupo (avulsos incluídos)
        const { data: jogosEncerrados } = await supabase
          .from('jogos')
          .select('*, grupo:grupos(nome)')
          .in('id', jogoIdsConf)
          .eq('status', 'encerrado')
          .gte('data_hora', tresDiasAtras)

        if (jogosEncerrados && jogosEncerrados.length > 0) {
          const { data: minhasEsts } = await supabase
            .from('estatisticas')
            .select('jogo_id')
            .eq('profile_id', user.id)
            .in('jogo_id', jogosEncerrados.map((j) => j.id))

          const comEstatistica = new Set((minhasEsts || []).map((e) => e.jogo_id))

          for (const jogo of jogosEncerrados as (Jogo & { grupo: { nome: string } | null })[]) {
            if (!comEstatistica.has(jogo.id)) {
              resultado.push({
                tipo: 'estatistica',
                jogo,
                grupoNome: jogo.grupo?.nome || 'Jogo avulso',
                grupoId: jogo.grupo_id,
              })
            }
          }
        }

        // 3. Jogos encerrados nos últimos 3 dias onde pode avaliar outros jogadores
        const { data: jogosParaAvaliar } = await supabase
          .from('jogos')
          .select('*, grupo:grupos(nome)')
          .in('id', jogoIdsConf)
          .eq('status', 'encerrado')
          .gte('data_hora', tresDiasAtras)

        if (jogosParaAvaliar && jogosParaAvaliar.length > 0) {
          const { data: minhasAvals } = await supabase
            .from('avaliacoes')
            .select('grupo_id')
            .eq('avaliador_id', user.id)
            .in('grupo_id', jogosParaAvaliar.filter((j) => j.grupo_id).map((j) => j.grupo_id))

          const gruposAvaliados = new Set((minhasAvals || []).map((a) => a.grupo_id))

          for (const jogo of jogosParaAvaliar as (Jogo & { grupo: { nome: string } | null })[]) {
            if (!jogo.grupo_id) continue // avulsos sem grupo não têm avaliação de grupo
            if (!gruposAvaliados.has(jogo.grupo_id)) {
              const jaListado = resultado.some(
                (r) => r.tipo === 'avaliacao' && r.jogo.grupo_id === jogo.grupo_id
              )
              if (!jaListado) {
                resultado.push({
                  tipo: 'avaliacao',
                  jogo,
                  grupoNome: jogo.grupo?.nome || 'Grupo',
                  grupoId: jogo.grupo_id,
                })
              }
            }
          }
        }
      }

      // 4. Cria lembretes automáticos para jogos 24h+ sem estatísticas registradas
      if (minhasConfsRecentes && minhasConfsRecentes.length > 0) {
        const jogoIdsConf = minhasConfsRecentes.map((c) => c.jogo_id)
        const umDiaAtras = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
        const tresDiasAtras = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()

        const { data: jogosSemStats } = await supabase
          .from('jogos')
          .select('id')
          .in('id', jogoIdsConf)
          .eq('status', 'encerrado')
          .lte('data_hora', umDiaAtras)
          .gte('data_hora', tresDiasAtras)

        if (jogosSemStats && jogosSemStats.length > 0) {
          const { data: statsExistentes } = await supabase
            .from('estatisticas')
            .select('jogo_id')
            .eq('profile_id', user.id)
            .in('jogo_id', jogosSemStats.map((j) => j.id))

          const comStats = new Set((statsExistentes || []).map((e) => e.jogo_id))

          const { data: lembreteExistentes } = await supabase
            .from('notificacoes')
            .select('jogo_id')
            .eq('profile_id', user.id)
            .eq('tipo', 'lembrete_estatistica')
            .in('jogo_id', jogosSemStats.map((j) => j.id))

          const comLembrete = new Set((lembreteExistentes || []).map((n) => n.jogo_id))

          const lembretes = jogosSemStats
            .filter((j) => !comStats.has(j.id) && !comLembrete.has(j.id))
            .map((j) => ({
              profile_id: user.id,
              tipo: 'lembrete_estatistica',
              jogo_id: j.id,
              lida: false,
            }))

          if (lembretes.length > 0) {
            await supabase.from('notificacoes').insert(lembretes)
          }
        }
      }

      // 5. Notificações do banco (times_sorteados, partida_encerrada, lembrete_estatistica)
      const { data: notifs } = await supabase
        .from('notificacoes')
        .select('*, jogo:jogos(*, grupo:grupos(nome))')
        .eq('profile_id', user.id)
        .eq('lida', false)
        .order('created_at', { ascending: false })

      if (notifs && notifs.length > 0) {
        for (const notif of notifs as (Notificacao & { jogo: Jogo & { grupo: { nome: string } | null } | null })[]) {
          if (!notif.jogo) continue
          resultado.push({
            tipo: notif.tipo,
            jogo: notif.jogo,
            grupoNome: notif.jogo.grupo?.nome || 'Grupo',
            grupoId: notif.jogo.grupo_id,
            notificacaoId: notif.id,
          })
        }
      }

      setItens(resultado)
    } catch (err) {
      console.error(err)
      setItens([])
    } finally {
      setLoading(false)
    }
  }

  async function marcarComoLida(notificacaoId: string) {
    await supabase.from('notificacoes').update({ lida: true }).eq('id', notificacaoId)
  }

  async function handleConfirmar(jogoId: string) {
    if (!user) return
    setRespondendo(jogoId)
    try {
      await supabase.from('confirmacoes').upsert(
        { jogo_id: jogoId, profile_id: user.id, status: 'confirmado', tipo_convite: 'fixo' },
        { onConflict: 'jogo_id,profile_id' }
      )
      setItens((prev) => prev.filter((i) => !(i.tipo === 'confirmacao' && i.jogo.id === jogoId)))
    } finally {
      setRespondendo(null)
    }
  }

  async function handleRecusar(jogoId: string) {
    if (!user) return
    setRespondendo(jogoId)
    try {
      await supabase.from('confirmacoes').upsert(
        { jogo_id: jogoId, profile_id: user.id, status: 'recusado', tipo_convite: 'fixo' },
        { onConflict: 'jogo_id,profile_id' }
      )
      setItens((prev) => prev.filter((i) => !(i.tipo === 'confirmacao' && i.jogo.id === jogoId)))
    } finally {
      setRespondendo(null)
    }
  }

  const confirmacoes = itens.filter((i) => i.tipo === 'confirmacao')
  const estatisticas = itens.filter((i) => i.tipo === 'estatistica')
  const avaliacoes = itens.filter((i) => i.tipo === 'avaliacao')
  const timesSorteados = itens.filter((i) => i.tipo === 'times_sorteados')
  const partidasEncerradas = itens.filter((i) => i.tipo === 'partida_encerrada')
  const lembretes = itens.filter((i) => i.tipo === 'lembrete_estatistica')
  const avaliacoesRecebidas = itens.filter((i) => i.tipo === 'avaliacao_recebida')
  const total = itens.length

  return (
    <Layout>
      <div
        className="px-5 pt-12 pb-6"
        style={{ background: 'linear-gradient(160deg, #1D9E75, #085041)' }}
      >
        <h1 className="text-white text-2xl font-bold">Notificações</h1>
        <p className="text-white/70 text-sm">
          {total > 0 ? `${total} ação${total !== 1 ? 'ões' : ''} pendente${total !== 1 ? 's' : ''}` : 'Tudo em dia!'}
        </p>
      </div>

      <div className="px-5 py-5 space-y-6">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-lg p-4 animate-pulse h-24" />
            ))}
          </div>
        ) : total === 0 ? (
          <div className="text-center py-16">
            <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
              <Bell size={32} className="text-gray-300" />
            </div>
            <h3 className="font-semibold text-gray-600 text-lg mb-2">Tudo em dia!</h3>
            <p className="text-gray-400 text-sm">Nenhuma ação pendente no momento.</p>
          </div>
        ) : (
          <>
            {/* Confirmações pendentes */}
            {confirmacoes.length > 0 && (
              <div>
                <h2 className="font-bold text-gray-700 mb-3 flex items-center gap-2">
                  <Calendar size={16} className="text-orange-500" />
                  Jogos para confirmar
                </h2>
                <div className="space-y-3">
                  {confirmacoes.map(({ jogo, grupoNome }) => (
                    <div key={jogo.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-0.5">
                        {grupoNome}
                      </p>
                      <p className="font-bold text-gray-800 mb-1">{jogo.formato}</p>
                      <p className="text-sm text-gray-500 mb-3 capitalize">
                        {formatDate(jogo.data_hora)} · {formatTime(jogo.data_hora)}
                        {jogo.local ? ` · ${jogo.local}` : ''}
                      </p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleConfirmar(jogo.id)}
                          disabled={respondendo === jogo.id}
                          className="flex-1 flex items-center justify-center gap-2 bg-verde-campo text-white font-semibold py-2.5 rounded-xl text-sm disabled:opacity-60"
                        >
                          <Check size={15} /> Confirmar
                        </button>
                        <button
                          onClick={() => handleRecusar(jogo.id)}
                          disabled={respondendo === jogo.id}
                          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-red-50 text-red-500 font-semibold rounded-xl border-2 border-red-100 text-sm disabled:opacity-60"
                        >
                          <X size={15} /> Recusar
                        </button>
                        <button
                          onClick={() => navigate(`/jogo/${jogo.link_token}`)}
                          className="px-3 py-2.5 bg-gray-100 text-gray-600 rounded-xl text-sm font-semibold"
                        >
                          Ver
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Estatísticas pendentes */}
            {estatisticas.length > 0 && (
              <div>
                <h2 className="font-bold text-gray-700 mb-3 flex items-center gap-2">
                  <ClipboardList size={16} className="text-blue-500" />
                  Registrar estatísticas
                </h2>
                <div className="space-y-3">
                  {estatisticas.map(({ jogo, grupoNome }) => (
                    <div key={jogo.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-0.5">
                        {grupoNome}
                      </p>
                      <p className="font-bold text-gray-800 mb-1">{jogo.formato}</p>
                      <p className="text-sm text-gray-500 mb-3 capitalize">
                        {formatDate(jogo.data_hora)} · {formatTime(jogo.data_hora)}
                      </p>
                      <button
                        onClick={() => navigate(`/jogo/${jogo.link_token}`)}
                        className="w-full bg-blue-500 text-white font-semibold py-2.5 rounded-xl text-sm"
                      >
                        Registrar estatísticas
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Avaliações pendentes */}
            {avaliacoes.length > 0 && (
              <div>
                <h2 className="font-bold text-gray-700 mb-3 flex items-center gap-2">
                  <Star size={16} className="text-amber-500" />
                  Avaliar jogadores
                </h2>
                <div className="space-y-3">
                  {avaliacoes.map(({ jogo, grupoNome, grupoId }) => (
                    <div key={`aval-${jogo.id}`} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-0.5">
                        {grupoNome}
                      </p>
                      <p className="font-bold text-gray-800 mb-1">{jogo.formato}</p>
                      <p className="text-sm text-gray-500 mb-3 capitalize">
                        {formatDate(jogo.data_hora)} · {formatTime(jogo.data_hora)}
                      </p>
                      <button
                        onClick={() => navigate(`/grupo/${grupoId}/avaliar`)}
                        className="w-full bg-amber-500 text-white font-semibold py-2.5 rounded-xl text-sm"
                      >
                        Avaliar jogadores
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Times sorteados */}
            {timesSorteados.length > 0 && (
              <div>
                <h2 className="font-bold text-gray-700 mb-3 flex items-center gap-2">
                  <Shield size={16} className="text-verde-campo" />
                  Times sorteados
                </h2>
                <div className="space-y-3">
                  {timesSorteados.map(({ jogo, grupoNome, notificacaoId }) => (
                    <div key={`ts-${jogo.id}`} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-0.5">
                        {grupoNome}
                      </p>
                      <p className="font-bold text-gray-800 mb-1">{jogo.formato}</p>
                      <p className="text-sm text-gray-500 mb-3 capitalize">
                        {formatDate(jogo.data_hora)} · {formatTime(jogo.data_hora)}
                      </p>
                      <button
                        onClick={async () => {
                          if (notificacaoId) await marcarComoLida(notificacaoId)
                          navigate(`/jogo/${jogo.id}/times`)
                        }}
                        className="w-full bg-verde-campo text-white font-semibold py-2.5 rounded-xl text-sm"
                      >
                        Confira sua escalação ⚽
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Partidas encerradas */}
            {partidasEncerradas.length > 0 && (
              <div>
                <h2 className="font-bold text-gray-700 mb-3 flex items-center gap-2">
                  <Trophy size={16} className="text-purple-500" />
                  Partida encerrada
                </h2>
                <div className="space-y-3">
                  {partidasEncerradas.map(({ jogo, grupoNome, grupoId, notificacaoId }) => (
                    <div key={`pe-${jogo.id}`} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-0.5">
                        {grupoNome}
                      </p>
                      <p className="font-bold text-gray-800 mb-1">{jogo.formato}</p>
                      <p className="text-sm text-gray-500 mb-1 capitalize">
                        {formatDate(jogo.data_hora)} · {formatTime(jogo.data_hora)}
                      </p>
                      <p className="text-xs text-gray-400 mb-3">Registre seus gols, assistências e avalie os jogadores!</p>
                      <div className="flex gap-2">
                        <button
                          onClick={async () => {
                            if (notificacaoId) await marcarComoLida(notificacaoId)
                            navigate(`/jogo/${jogo.id}/registro`)
                          }}
                          className="flex-1 bg-purple-500 text-white font-semibold py-2.5 rounded-xl text-sm"
                        >
                          Registrar realizações
                        </button>
                        <button
                          onClick={async () => {
                            if (notificacaoId) await marcarComoLida(notificacaoId)
                            navigate(`/grupo/${grupoId}/avaliar`)
                          }}
                          className="flex-1 bg-amber-500 text-white font-semibold py-2.5 rounded-xl text-sm"
                        >
                          Avaliar jogadores
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {/* Avaliações recebidas */}
            {avaliacoesRecebidas.length > 0 && (
              <div>
                <h2 className="font-bold text-gray-700 mb-3 flex items-center gap-2">
                  <Sparkles size={16} className="text-yellow-500" />
                  Você foi avaliado!
                </h2>
                <div className="space-y-3">
                  {avaliacoesRecebidas.map(({ notificacaoId }, idx) => (
                    <div key={`aval-rec-${idx}`} className="bg-yellow-50 rounded-xl border border-yellow-200 shadow-sm p-4">
                      <p className="font-bold text-gray-800 mb-1">Sua avaliação foi atualizada</p>
                      <p className="text-sm text-yellow-700 mb-3">
                        Um colega avaliou suas habilidades anonimamente. Confira sua média atualizada!
                      </p>
                      <button
                        onClick={async () => {
                          if (notificacaoId) await marcarComoLida(notificacaoId)
                          navigate('/perfil')
                        }}
                        className="w-full bg-yellow-500 text-white font-semibold py-2.5 rounded-xl text-sm"
                      >
                        Ver meu perfil
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Lembretes de estatísticas pendentes */}
            {lembretes.length > 0 && (
              <div>
                <h2 className="font-bold text-gray-700 mb-3 flex items-center gap-2">
                  <Clock size={16} className="text-orange-500" />
                  Lembrete — registre suas realizações
                </h2>
                <div className="space-y-3">
                  {lembretes.map(({ jogo, grupoNome, notificacaoId }) => (
                    <div key={`lem-${jogo.id}`} className="bg-orange-50 rounded-xl border border-orange-200 shadow-sm p-4">
                      <p className="text-xs font-semibold text-orange-400 uppercase tracking-wide mb-0.5">
                        {grupoNome}
                      </p>
                      <p className="font-bold text-gray-800 mb-1">{jogo.formato}</p>
                      <p className="text-sm text-gray-500 mb-1 capitalize">
                        {formatDate(jogo.data_hora)} · {formatTime(jogo.data_hora)}
                      </p>
                      <p className="text-xs text-orange-500 mb-3">Você ainda não registrou suas realizações!</p>
                      <button
                        onClick={async () => {
                          if (notificacaoId) await marcarComoLida(notificacaoId)
                          navigate(`/jogo/${jogo.id}/registro`)
                        }}
                        className="w-full bg-orange-500 text-white font-semibold py-2.5 rounded-xl text-sm"
                      >
                        Registrar agora
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </Layout>
  )
}
