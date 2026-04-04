import { ArrowLeft } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Layout from '../components/Layout'
import RankingList from '../components/RankingList'
import { useAuth } from '../hooks/useAuth'
import { useProfile } from '../hooks/useProfile'
import { supabase } from '../lib/supabase'
import { Estatistica, Profile } from '../types'

type TabRanking = 'goleador' | 'garcom' | 'muralha' | 'destaque'
type Periodo = 'mes' | 'temporada' | 'historico'

interface RankingEntry {
  id: string
  nome: string
  foto_url: string | null
  valor: number
  posicao?: number
}

export default function Rankings() {
  const { id: grupoId } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { profile } = useProfile()

  const [tab, setTab] = useState<TabRanking>('goleador')
  const [periodo, setPeriodo] = useState<Periodo>('temporada')
  const [rankings, setRankings] = useState<RankingEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [userEntry, setUserEntry] = useState<RankingEntry | null>(null)

  useEffect(() => {
    fetchRankings()
  }, [grupoId, tab, periodo])

  async function fetchRankings() {
    if (!user) return
    try {
      setLoading(true)

      // Busca todos os jogos onde o usuário esteve confirmado
      const { data: minhasConfs } = await supabase
        .from('confirmacoes')
        .select('jogo_id')
        .eq('profile_id', user.id)
        .eq('status', 'confirmado')

      if (!minhasConfs || minhasConfs.length === 0) {
        setRankings([])
        setLoading(false)
        return
      }

      const jogoIds = minhasConfs.map((c) => c.jogo_id)

      let dateFilter: Date | null = null
      if (periodo === 'mes') {
        dateFilter = new Date()
        dateFilter.setDate(1)
        dateFilter.setHours(0, 0, 0, 0)
      } else if (periodo === 'temporada') {
        dateFilter = new Date(new Date().getFullYear(), 0, 1)
      }

      // Busca estatísticas de TODOS os jogadores nesses jogos
      let query = supabase
        .from('estatisticas')
        .select('*, profile:profiles(*)')
        .in('jogo_id', jogoIds)

      if (dateFilter) {
        query = query.gte('created_at', dateFilter.toISOString())
      }

      const { data: statsData } = await query

      if (!statsData || statsData.length === 0) {
        setRankings([])
        setLoading(false)
        return
      }

      // Agrega por jogador
      const aggregated: Record<string, { profile: Profile; gols: number; assistencias: number; defesas: number; vitorias: number }> = {}

      for (const stat of statsData as (Estatistica & { profile: Profile })[]) {
        if (!aggregated[stat.profile_id]) {
          aggregated[stat.profile_id] = { profile: stat.profile, gols: 0, assistencias: 0, defesas: 0, vitorias: 0 }
        }
        aggregated[stat.profile_id].gols += stat.gols
        aggregated[stat.profile_id].assistencias += stat.assistencias
        aggregated[stat.profile_id].defesas += stat.defesas
        aggregated[stat.profile_id].vitorias += (stat as any).vitorias || 0
      }

      let sorted: RankingEntry[] = []

      if (tab === 'goleador') {
        sorted = Object.values(aggregated)
          .map((e) => ({ id: e.profile.id, nome: e.profile.nome, foto_url: e.profile.foto_url, valor: e.gols }))
          .sort((a, b) => b.valor - a.valor)
      } else if (tab === 'garcom') {
        sorted = Object.values(aggregated)
          .map((e) => ({ id: e.profile.id, nome: e.profile.nome, foto_url: e.profile.foto_url, valor: e.assistencias }))
          .sort((a, b) => b.valor - a.valor)
      } else if (tab === 'muralha') {
        sorted = Object.values(aggregated)
          .map((e) => ({ id: e.profile.id, nome: e.profile.nome, foto_url: e.profile.foto_url, valor: e.defesas }))
          .sort((a, b) => b.valor - a.valor)
      } else if (tab === 'destaque') {
        sorted = Object.values(aggregated)
          .map((e) => ({
            id: e.profile.id,
            nome: e.profile.nome,
            foto_url: e.profile.foto_url,
            valor: e.gols * 3 + e.assistencias * 2 + e.vitorias * 2 + Math.floor(e.defesas / 3),
          }))
          .sort((a, b) => b.valor - a.valor)
      }

      setRankings(sorted)

      if (user) {
        const myEntry = sorted.find((e) => e.id === user.id)
        if (myEntry) setUserEntry({ ...myEntry, posicao: sorted.indexOf(myEntry) + 1 } as RankingEntry)
        else setUserEntry(null)
      }
    } catch (err) {
      console.error(err)
      setRankings([])
    } finally {
      setLoading(false)
    }
  }

  const TABS: { key: TabRanking; label: string; emoji: string; unidade: string }[] = [
    { key: 'goleador', label: 'Goleador', emoji: '⚽', unidade: 'gols' },
    { key: 'garcom', label: 'Garçom', emoji: '🎯', unidade: 'assist.' },
    { key: 'muralha', label: 'Muralha', emoji: '🛡️', unidade: 'defesas' },
    { key: 'destaque', label: 'Destaque', emoji: '⭐', unidade: 'pts' },
  ]

  const currentTab = TABS.find((t) => t.key === tab)!

  return (
    <Layout>
      {/* Header */}
      <div
        className="px-5 pt-10 pb-5"
        style={{ background: 'linear-gradient(160deg, #1D9E75, #085041)' }}
      >
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-white/80 text-sm mb-4 hover:text-white transition-colors"
        >
          <ArrowLeft size={18} /> Voltar
        </button>
        <h1 className="text-white text-2xl font-bold">Ranking global</h1>
        <p className="text-white/70 text-sm mt-0.5">Todos os jogadores que jogaram com você</p>
      </div>

      {/* Tab bar */}
      <div className="bg-white border-b border-gray-200 flex overflow-x-auto">
        {TABS.map(({ key, label, emoji }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-3 text-sm font-semibold border-b-2 transition-colors ${
              tab === key
                ? 'border-verde-campo text-verde-campo'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <span>{emoji}</span>
            <span>{label}</span>
          </button>
        ))}
      </div>

      {/* Periodo filter */}
      <div className="px-5 py-4 flex gap-2">
        {(['mes', 'temporada', 'historico'] as Periodo[]).map((p) => (
          <button
            key={p}
            onClick={() => setPeriodo(p)}
            className={`flex-1 py-2 text-sm font-semibold rounded-lg border-2 transition-colors ${
              periodo === p
                ? 'border-verde-campo bg-verde-claro text-verde-campo'
                : 'border-gray-200 text-gray-500 hover:border-gray-300'
            }`}
          >
            {p === 'mes' ? 'Mês' : p === 'temporada' ? 'Temporada' : 'Histórico'}
          </button>
        ))}
      </div>

      <div className="px-5 pb-5">
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="bg-white rounded-lg p-4 animate-pulse h-16" />
            ))}
          </div>
        ) : (
          <RankingList entries={rankings} unidade={currentTab.unidade} />
        )}
      </div>

      {/* Current user fixed card */}
      {userEntry && (
        <div className="fixed bottom-20 left-0 right-0 px-4 max-w-lg mx-auto">
          <div className="bg-verde-escuro rounded-xl p-3 flex items-center gap-3 shadow-lg border border-verde-campo/50">
            <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0">
              {profile?.foto_url ? (
                <img src={profile.foto_url} alt={profile.nome} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-verde-campo flex items-center justify-center">
                  <span className="text-white font-bold text-xs">{profile?.nome?.[0]?.toUpperCase()}</span>
                </div>
              )}
            </div>
            <p className="text-white font-semibold text-sm flex-1">Você · #{rankings.findIndex((e) => e.id === user?.id) + 1}</p>
            <p className="text-white font-bold">
              {userEntry.valor} <span className="text-white/70 text-xs">{currentTab.unidade}</span>
            </p>
          </div>
        </div>
      )}
    </Layout>
  )
}
