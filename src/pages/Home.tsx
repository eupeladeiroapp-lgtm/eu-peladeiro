import { Bell, Plus, Shield, Users, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import CardJogo from '../components/CardJogo'
import Layout from '../components/Layout'
import { useAuth } from '../hooks/useAuth'
import { useProfile } from '../hooks/useProfile'
import { supabase } from '../lib/supabase'
import { Jogo } from '../types'

const MOCK_JOGOS: Jogo[] = [
  {
    id: '1',
    grupo_id: 'g1',
    data_hora: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
    local: 'Society do Zé, Rua das Flores, 123',
    formato: '7x7',
    num_times: 4,
    status: 'aberto',
    link_token: 'abc123',
    criado_por: 'user1',
    created_at: new Date().toISOString(),
  },
  {
    id: '2',
    grupo_id: 'g2',
    data_hora: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
    local: 'Quadra Municipal Centro',
    formato: '5x5',
    num_times: 3,
    status: 'aberto',
    link_token: 'def456',
    criado_por: 'user2',
    created_at: new Date().toISOString(),
  },
]

export default function Home() {
  const { user } = useAuth()
  const { profile } = useProfile()
  const navigate = useNavigate()
  const [jogos, setJogos] = useState<Jogo[]>([])
  const [loading, setLoading] = useState(true)
  const [showFAB, setShowFAB] = useState(false)

  useEffect(() => {
    async function fetchJogos() {
      if (!user) return
      try {
        const { data } = await supabase
          .from('jogos')
          .select('*, grupos_membros!inner(profile_id)')
          .eq('grupos_membros.profile_id', user.id)
          .in('status', ['aberto', 'em_andamento'])
          .order('data_hora', { ascending: true })
          .limit(10)

        if (data && data.length > 0) {
          setJogos(data as Jogo[])
        } else {
          setJogos(MOCK_JOGOS)
        }
      } catch {
        setJogos(MOCK_JOGOS)
      } finally {
        setLoading(false)
      }
    }
    fetchJogos()
  }, [user])

  const nome = profile?.nome || user?.user_metadata?.full_name || 'Peladeiro'
  const primeiroNome = nome.split(' ')[0]

  const avatarUrl = profile?.foto_url || user?.user_metadata?.avatar_url || null

  return (
    <Layout>
      {/* Header */}
      <div
        className="px-5 pt-12 pb-6"
        style={{ background: 'linear-gradient(160deg, #1D9E75, #085041)' }}
      >
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

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mt-5">
          {[
            { label: 'Próximos jogos', value: jogos.length, icon: '⚽' },
            { label: 'Grupos', value: 2, icon: '👥' },
            { label: 'Gols no mês', value: 3, icon: '🥅' },
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
          <button
            onClick={() => navigate('/grupos')}
            className="text-verde-campo text-sm font-semibold"
          >
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
                groupName={jogo.grupo_id === 'g1' ? 'Pelada dos Amigos' : 'Fut Quinta-Feira'}
                confirmados={8}
                totalVagas={14}
                avatars={[null, null, null]}
                nomes={['João', 'Pedro', 'Carlos']}
                onConfirmar={() => {}}
                onRecusar={() => {}}
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

        {/* Quick actions */}
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
          <div className="absolute bottom-14 right-0 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden animate-slide-up min-w-[180px]">
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

      {/* Backdrop */}
      {showFAB && (
        <div
          className="fixed inset-0 z-30"
          onClick={() => setShowFAB(false)}
        />
      )}
    </Layout>
  )
}
