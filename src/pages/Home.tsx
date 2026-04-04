import { Bell, Plus, Shield, Users, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import CardJogo from '../components/CardJogo'
import Layout from '../components/Layout'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import { Jogo } from '../types'

interface JogoComDados extends Jogo {
  confirmados: number
  totalMembros: number
  grupoNome: string
  userStatus: 'confirmado' | 'recusado' | null
}

export default function Home() {
  const { user, profile } = useAuth()
  const navigate = useNavigate()
  const [jogos, setJogos] = useState<JogoComDados[]>([])
  const [loading, setLoading] = useState(true)
  const [totalGrupos, setTotalGrupos] = useState(0)
  const [golsMes, setGolsMes] = useState(0)
  const [defesasMes, setDefesasMes] = useState(0)
  const [showFAB, setShowFAB] = useState(false)

  useEffect(() => {
    if (!user) return
    fetchJogos()
    fetchStats()
  }, [user])

  async function fetchJogos() {
    if (!user) return
    try {
      setLoading(true)

      const { data: membros } = await supabase
        .from('grupo_membros')
        .select('grupo_id')
        .eq('profile_id', user.id)

      const grupoIds = (membros || []).map((m) => m.grupo_id)

      // Busca jogos dos grupos
      const jogosGrupo = grupoIds.length > 0
        ? (await supabase
            .from('jogos')
            .select('*, grupo:grupos(nome)')
            .in('grupo_id', grupoIds)
            .in('status', ['aberto', 'em_andamento'])
            .gte('data_hora', new Date().toISOString())
            .order('data_hora', { ascending: true })
            .limit(10)
          ).data || []
        : []

      // Busca jogos avulsos (convidado via link)
      const { data: confsAvulsas } = await supabase
        .from('confirmacoes')
        .select('jogo_id')
        .eq('profile_id', user.id)
        .eq('tipo_convite', 'avulso')

      const jogoIdsAvulsos = (confsAvulsas || []).map((c) => c.jogo_id)
      const grupoIdsJaVistos = new Set(jogosGrupo.map((j) => j.id))

      const jogosAvulsos = jogoIdsAvulsos.length > 0
        ? (await supabase
            .from('jogos')
            .select('*, grupo:grupos(nome)')
            .in('id', jogoIdsAvulsos)
            .in('status', ['aberto', 'em_andamento'])
            .gte('data_hora', new Date().toISOString())
          ).data?.filter((j) => !grupoIdsJaVistos.has(j.id)) || []
        : []

      const todosJogos = [...jogosGrupo, ...jogosAvulsos].sort(
        (a, b) => new Date(a.data_hora).getTime() - new Date(b.data_hora).getTime()
      ).slice(0, 10)

      if (todosJogos.length === 0) { setJogos([]); return }

      const jogoIds = todosJogos.map((j) => j.id)

      // Busca confirmações de todos os jogos
      const { data: confsData } = await supabase
        .from('confirmacoes')
        .select('jogo_id, profile_id, status')
        .in('jogo_id', jogoIds)

      // Busca total de membros por grupo
      const allGrupoIds = [...new Set(todosJogos.map((j) => j.grupo_id))]
      const { data: membrosGrupo } = await supabase
        .from('grupo_membros')
        .select('grupo_id')
        .in('grupo_id', allGrupoIds)

      const membrosPorGrupo: Record<string, number> = {}
      for (const m of membrosGrupo || []) {
        membrosPorGrupo[m.grupo_id] = (membrosPorGrupo[m.grupo_id] || 0) + 1
      }

      const jogosComDados: JogoComDados[] = todosJogos.map((jogo) => {
        const confsJogo = (confsData || []).filter((c) => c.jogo_id === jogo.id)
        const confirmados = confsJogo.filter((c) => c.status === 'confirmado').length
        const myConf = confsJogo.find((c) => c.profile_id === user.id)
        return {
          ...jogo,
          confirmados,
          totalMembros: membrosPorGrupo[jogo.grupo_id] || 0,
          grupoNome: (jogo.grupo as { nome: string } | null)?.nome || 'Grupo',
          userStatus: (myConf?.status as 'confirmado' | 'recusado') || null,
        }
      })

      setJogos(jogosComDados)
    } catch {
      setJogos([])
    } finally {
      setLoading(false)
    }
  }

  async function handleConfirmar(jogoId: string) {
    if (!user) return
    await supabase.from('confirmacoes').upsert(
      { jogo_id: jogoId, profile_id: user.id, status: 'confirmado', tipo_convite: 'fixo' },
      { onConflict: 'jogo_id,profile_id' }
    )
    setJogos((prev) => prev.map((j) => j.id === jogoId ? { ...j, userStatus: 'confirmado', confirmados: j.confirmados + (j.userStatus === 'confirmado' ? 0 : 1) } : j))
  }

  async function handleRecusar(jogoId: string) {
    if (!user) return
    await supabase.from('confirmacoes').upsert(
      { jogo_id: jogoId, profile_id: user.id, status: 'recusado', tipo_convite: 'fixo' },
      { onConflict: 'jogo_id,profile_id' }
    )
    setJogos((prev) => prev.map((j) => j.id === jogoId ? { ...j, userStatus: 'recusado', confirmados: j.confirmados - (j.userStatus === 'confirmado' ? 1 : 0) } : j))
  }

  async function fetchStats() {
    if (!user) return
    const { count } = await supabase
      .from('grupo_membros')
      .select('*', { count: 'exact', head: true })
      .eq('profile_id', user.id)
    setTotalGrupos(count || 0)

    const inicioMes = new Date()
    inicioMes.setDate(1)
    inicioMes.setHours(0, 0, 0, 0)
    const { data: stats } = await supabase
      .from('estatisticas')
      .select('gols, defesas')
      .eq('profile_id', user.id)
      .gte('created_at', inicioMes.toISOString())
    setGolsMes((stats || []).reduce((sum, s) => sum + (s.gols || 0), 0))
    setDefesasMes((stats || []).reduce((sum, s) => sum + (s.defesas || 0), 0))
  }

  const isGoleiro = profile?.posicao_principal === 'GOL'
  const nome = profile?.nome || user?.user_metadata?.full_name || 'Peladeiro'
  const primeiroNome = nome.split(' ')[0]
  const avatarUrl = profile?.foto_url || user?.user_metadata?.avatar_url || null

  return (
    <Layout>
      {/* Header */}
      <div className="px-5 pt-12 pb-6" style={{ background: 'linear-gradient(160deg, #1D9E75, #085041)' }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full overflow-hidden border-2 border-white/40">
              {avatarUrl ? (
                <img src={avatarUrl} alt={nome} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-white/20 flex items-center justify-center">
                  <span className="text-white font-bold text-lg">{primeiroNome[0]?.toUpperCase()}</span>
                </div>
              )}
            </div>
            <div>
              <p className="text-white/70 text-xs">Bem-vindo de volta,</p>
              <p className="text-white font-bold text-lg leading-tight">Olá, {primeiroNome}! 👋</p>
            </div>
          </div>
          <button
            onClick={() => navigate('/convites')}
            className="relative w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white hover:bg-white/30 transition-colors"
          >
            <Bell size={20} />
          </button>
        </div>

        <div className="grid grid-cols-3 gap-3 mt-5">
          {[
            { label: 'Próximos jogos', value: jogos.length, icon: '⚽' },
            { label: 'Grupos', value: totalGrupos, icon: '👥' },
            isGoleiro
              ? { label: 'Defesas no mês', value: defesasMes, icon: '🛡️' }
              : { label: 'Gols no mês', value: golsMes, icon: '🥅' },
          ].map((stat) => (
            <div key={stat.label} className="bg-white/15 rounded-lg p-3 text-center">
              <p className="text-xl">{stat.icon}</p>
              <p className="text-white font-bold text-xl">{stat.value}</p>
              <p className="text-white/70 text-xs leading-tight">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="px-5 py-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-gray-800 font-bold text-lg">Próximos jogos</h2>
          <button onClick={() => navigate('/grupos')} className="text-verde-campo text-sm font-semibold">
            Ver grupos
          </button>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="bg-white rounded-lg p-4 animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-1/3 mb-3" />
                <div className="h-3 bg-gray-100 rounded w-2/3 mb-2" />
                <div className="h-3 bg-gray-100 rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : jogos.length > 0 ? (
          <div className="space-y-3">
            {jogos.map((jogo) => (
              <CardJogo
                key={jogo.id}
                jogo={jogo}
                groupName={jogo.grupoNome}
                confirmados={jogo.confirmados}
                totalVagas={jogo.totalMembros}
                userStatus={jogo.userStatus}
                onConfirmar={() => handleConfirmar(jogo.id)}
                onRecusar={() => handleRecusar(jogo.id)}
                onClick={() => navigate(`/jogo/${jogo.link_token}`)}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">⚽</div>
            <h3 className="text-gray-700 font-semibold text-lg mb-2">Nenhum jogo marcado</h3>
            <p className="text-gray-400 text-sm mb-6">
              Crie um grupo e marque o próximo jogo com seus amigos!
            </p>
            <button
              onClick={() => navigate('/grupos')}
              className="bg-verde-campo text-white font-semibold px-6 py-3 rounded-xl hover:bg-verde-escuro transition-colors"
            >
              Criar ou entrar em um grupo
            </button>
          </div>
        )}

        <div className="mt-6">
          <h2 className="text-gray-800 font-bold text-lg mb-3">Ações rápidas</h2>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => navigate('/grupos')}
              className="flex flex-col items-center gap-2 bg-white border border-gray-100 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="w-10 h-10 rounded-full bg-verde-claro flex items-center justify-center">
                <Users size={20} className="text-verde-campo" />
              </div>
              <span className="text-sm font-semibold text-gray-700">Meus grupos</span>
            </button>
            <button
              onClick={() => navigate('/perfil')}
              className="flex flex-col items-center gap-2 bg-white border border-gray-100 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center">
                <Shield size={20} className="text-blue-500" />
              </div>
              <span className="text-sm font-semibold text-gray-700">Meu perfil</span>
            </button>
          </div>
        </div>
      </div>

      {/* FAB */}
      <div className="fixed bottom-24 right-5 z-40">
        {showFAB && (
          <div className="absolute bottom-14 right-0 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden min-w-[180px]">
            <button
              onClick={() => { setShowFAB(false); navigate('/grupos') }}
              className="w-full text-left px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 flex items-center gap-2 border-b border-gray-100"
            >
              <span className="text-lg">⚽</span> Criar jogo
            </button>
            <button
              onClick={() => { setShowFAB(false); navigate('/grupos') }}
              className="w-full text-left px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 flex items-center gap-2"
            >
              <span className="text-lg">👥</span> Criar grupo
            </button>
          </div>
        )}
        <button
          onClick={() => setShowFAB((v) => !v)}
          className="w-14 h-14 rounded-full bg-verde-campo text-white shadow-lg flex items-center justify-center hover:bg-verde-escuro transition-all active:scale-95"
        >
          {showFAB ? <X size={24} /> : <Plus size={24} />}
        </button>
      </div>

      {showFAB && <div className="fixed inset-0 z-30" onClick={() => setShowFAB(false)} />}
    </Layout>
  )
}
