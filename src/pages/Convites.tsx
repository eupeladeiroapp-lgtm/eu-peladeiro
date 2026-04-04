import { Bell, Calendar, Check, ClipboardList, Star, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import { Jogo } from '../types'

interface ItemNotificacao {
  tipo: 'confirmacao' | 'estatistica' | 'avaliacao'
  jogo: Jogo
  grupoNome: string
  grupoId?: string
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

      // 2. Jogos recentes encerrados que precisam de estatísticas
      const { data: minhasConfsRecentes } = await supabase
        .from('confirmacoes')
        .select('jogo_id')
        .eq('profile_id', user.id)
        .eq('status', 'confirmado')

      if (minhasConfsRecentes && minhasConfsRecentes.length > 0) {
        const jogoIdsConf = minhasConfsRecentes.map((c) => c.jogo_id)

        const seteDiasAtras = new Date()
        seteDiasAtras.setDate(seteDiasAtras.getDate() - 7)

        const { data: jogosEncerrados } = await supabase
          .from('jogos')
          .select('*, grupo:grupos(nome)')
          .in('id', jogoIdsConf)
          .in('status', ['encerrado', 'em_andamento'])
          .lte('data_hora', agora)
          .gte('data_hora', seteDiasAtras.toISOString())

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
                grupoNome: jogo.grupo?.nome || 'Grupo',
                grupoId: jogo.grupo_id,
              })
            }
          }
        }

        // 3. Jogos recentes onde pode avaliar outros jogadores
        const { data: jogosParaAvaliar } = await supabase
          .from('jogos')
          .select('*, grupo:grupos(nome)')
          .in('id', jogoIdsConf)
          .in('status', ['encerrado', 'em_andamento'])
          .lte('data_hora', agora)
          .gte('data_hora', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())

        if (jogosParaAvaliar && jogosParaAvaliar.length > 0) {
          const { data: minhasAvals } = await supabase
            .from('avaliacoes')
            .select('grupo_id')
            .eq('avaliador_id', user.id)
            .in('grupo_id', jogosParaAvaliar.map((j) => j.grupo_id))

          const gruposAvaliados = new Set((minhasAvals || []).map((a) => a.grupo_id))

          for (const jogo of jogosParaAvaliar as (Jogo & { grupo: { nome: string } | null })[]) {
            if (!gruposAvaliados.has(jogo.grupo_id)) {
              // Only add if not already listed as estatistica
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

      setItens(resultado)
    } catch (err) {
      console.error(err)
      setItens([])
    } finally {
      setLoading(false)
    }
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
          </>
        )}
      </div>
    </Layout>
  )
}
