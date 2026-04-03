import { ArrowLeft, Calendar, Crown, Plus, Share2, Trophy, User, Users, X } from 'lucide-react'
import React, { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import CardJogo from '../components/CardJogo'
import Layout from '../components/Layout'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import { Grupo, GrupoMembro, Jogo, Profile } from '../types'

type TabType = 'membros' | 'jogos' | 'rankings'

const FORMATOS = ['5x5', '7x7', '8x8', '11x11', 'Futsal', 'Society']

export default function GrupoDetalhe() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [grupo, setGrupo] = useState<Grupo | null>(null)
  const [membros, setMembros] = useState<(GrupoMembro & { profile: Profile })[]>([])
  const [jogos, setJogos] = useState<Jogo[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<TabType>('membros')
  const [showCreateJogo, setShowCreateJogo] = useState(false)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [jogoData, setJogoData] = useState('')
  const [jogoHora, setJogoHora] = useState('19:00')
  const [jogoLocal, setJogoLocal] = useState('')
  const [jogoFormato, setJogoFormato] = useState('7x7')
  const [jogoNumTimes, setJogoNumTimes] = useState(2)

  useEffect(() => {
    fetchAll()
  }, [id])

  async function fetchAll() {
    if (!id) return
    try {
      setLoading(true)

      const { data: grupoData } = await supabase
        .from('grupos')
        .select('*')
        .eq('id', id)
        .single()
      setGrupo(grupoData as Grupo)
      if (grupoData) setJogoFormato(grupoData.formato || '7x7')

      const { data: membrosData } = await supabase
        .from('grupo_membros')
        .select('*, profile:profiles(*)')
        .eq('grupo_id', id)

      setMembros((membrosData as (GrupoMembro & { profile: Profile })[]) || [])

      const { data: jogosData } = await supabase
        .from('jogos')
        .select('*')
        .eq('grupo_id', id)
        .order('data_hora', { ascending: false })

      setJogos((jogosData as Jogo[]) || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  async function handleCreateJogo() {
    if (!user || !id) return
    if (!jogoData) {
      setError('Informe a data do jogo.')
      return
    }
    setCreating(true)
    setError(null)
    try {
      const dataHora = new Date(`${jogoData}T${jogoHora}:00`)
      const token = crypto.randomUUID().replace(/-/g, '').substring(0, 12)

      const { error: jogoError } = await supabase
        .from('jogos')
        .insert({
          grupo_id: id,
          data_hora: dataHora.toISOString(),
          local: jogoLocal.trim() || null,
          formato: jogoFormato,
          num_times: jogoNumTimes,
          status: 'aberto',
          link_token: token,
          criado_por: user.id,
        })

      if (jogoError) throw jogoError

      setShowCreateJogo(false)
      navigate(`/jogo/${token}`)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao criar jogo.'
      setError(msg)
    } finally {
      setCreating(false)
    }
  }

  const isAdmin = membros.find((m) => m.profile_id === user?.id)?.role === 'admin'

  return (
    <Layout>
      {/* Header */}
      <div
        className="px-5 pt-10 pb-5"
        style={{ background: 'linear-gradient(160deg, #1D9E75, #085041)' }}
      >
        <button
          onClick={() => navigate('/grupos')}
          className="flex items-center gap-2 text-white/80 text-sm mb-4 hover:text-white transition-colors"
        >
          <ArrowLeft size={18} /> Meus grupos
        </button>

        {loading ? (
          <div className="h-8 bg-white/20 rounded animate-pulse w-48" />
        ) : (
          <>
            <h1 className="text-white text-2xl font-bold">{grupo?.nome}</h1>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-white/70 text-sm">{grupo?.formato}</span>
              <span className="text-white/50">•</span>
              <span className="text-white/70 text-sm">{membros.length} membros</span>
            </div>
            {grupo?.descricao && (
              <p className="text-white/60 text-sm mt-1">{grupo.descricao}</p>
            )}
          </>
        )}
      </div>

      {/* Tabs */}
      <div className="flex bg-white border-b border-gray-200 sticky top-0 z-10">
        {([
          { key: 'membros', label: 'Membros', icon: Users },
          { key: 'jogos', label: 'Jogos', icon: Calendar },
          { key: 'rankings', label: 'Rankings', icon: Trophy },
        ] as { key: TabType; label: string; icon: React.ElementType }[]).map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-sm font-semibold border-b-2 transition-colors ${
              tab === key
                ? 'border-verde-campo text-verde-campo'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Icon size={16} />
            {label}
          </button>
        ))}
      </div>

      <div className="px-5 py-5">
        {/* Membros tab */}
        {tab === 'membros' && (
          <div className="space-y-3">
            <button
              onClick={() => {
                const link = `${window.location.origin}/grupo/convite/${id}`
                const texto = `Vem jogar comigo na pelada! Entra no grupo pelo Eu Peladeiro: ${link}`
                if (navigator.share) {
                  navigator.share({ title: 'Eu Peladeiro', text: texto, url: link })
                } else {
                  const whatsapp = `https://wa.me/?text=${encodeURIComponent(texto)}`
                  window.open(whatsapp, '_blank')
                }
              }}
              className="w-full flex items-center justify-center gap-2 bg-verde-campo text-white font-semibold py-3 rounded-xl hover:bg-verde-escuro transition-colors"
            >
              <Share2 size={18} /> Convidar jogadores
            </button>
            {loading ? (
              [1, 2, 3].map((i) => (
                <div key={i} className="bg-white rounded-lg p-4 animate-pulse h-16" />
              ))
            ) : membros.length > 0 ? (
              membros.map((membro) => (
                <div
                  key={membro.id}
                  className="bg-white rounded-lg border border-gray-100 p-3 flex items-center gap-3"
                >
                  <div className="w-10 h-10 rounded-full overflow-hidden bg-verde-campo flex items-center justify-center flex-shrink-0">
                    {membro.profile?.foto_url ? (
                      <img src={membro.profile.foto_url} alt={membro.profile.nome} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-white font-bold">{membro.profile?.nome?.[0]?.toUpperCase() || '?'}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-800 truncate">{membro.profile?.nome || 'Jogador'}</p>
                    {membro.profile?.posicao_principal && (
                      <p className="text-xs text-gray-500">{membro.profile.posicao_principal}</p>
                    )}
                  </div>
                  {membro.role === 'admin' && (
                    <div className="flex items-center gap-1 text-dourado">
                      <Crown size={14} />
                      <span className="text-xs font-semibold">Admin</span>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-400">
                <User size={32} className="mx-auto mb-2 opacity-30" />
                <p>Nenhum membro ainda</p>
              </div>
            )}
          </div>
        )}

        {/* Jogos tab */}
        {tab === 'jogos' && (
          <div>
            {isAdmin && (
              <button
                onClick={() => setShowCreateJogo(true)}
                className="w-full flex items-center justify-center gap-2 bg-verde-campo text-white font-semibold py-3 rounded-xl mb-4 hover:bg-verde-escuro transition-colors"
              >
                <Plus size={18} /> Criar novo jogo
              </button>
            )}
            {loading ? (
              <div className="space-y-3">
                {[1, 2].map((i) => (
                  <div key={i} className="bg-white rounded-lg p-4 animate-pulse h-24" />
                ))}
              </div>
            ) : jogos.length > 0 ? (
              <div className="space-y-3">
                {jogos.map((jogo) => (
                  <CardJogo
                    key={jogo.id}
                    jogo={jogo}
                    confirmados={0}
                    totalVagas={parseInt(jogo.formato) * 2 || 14}
                    onClick={() => navigate(`/jogo/${jogo.link_token}`)}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-10 text-gray-400">
                <Calendar size={32} className="mx-auto mb-2 opacity-30" />
                <p className="font-medium">Nenhum jogo ainda</p>
                {isAdmin && <p className="text-sm mt-1">Clique em "Criar novo jogo" para começar</p>}
              </div>
            )}
          </div>
        )}

        {/* Rankings tab */}
        {tab === 'rankings' && (
          <div className="text-center py-8">
            <Trophy size={32} className="mx-auto mb-3 text-dourado" />
            <h3 className="font-bold text-gray-700 mb-2">Rankings do grupo</h3>
            <p className="text-gray-400 text-sm mb-4">
              Jogue alguns jogos para ver os rankings aparecerem aqui!
            </p>
            <button
              onClick={() => navigate(`/grupo/${id}/rankings`)}
              className="bg-verde-campo text-white font-semibold px-6 py-3 rounded-xl hover:bg-verde-escuro transition-colors"
            >
              Ver rankings completos
            </button>
          </div>
        )}
      </div>

      {/* Modal criar jogo */}
      {showCreateJogo && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50">
          <div className="w-full max-w-lg bg-white rounded-t-2xl p-6 animate-slide-up max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-bold text-gray-800">Criar jogo</h2>
              <button
                onClick={() => setShowCreateJogo(false)}
                className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Data *</label>
                  <input
                    type="date"
                    value={jogoData}
                    onChange={(e) => setJogoData(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full border-2 border-gray-200 rounded-lg px-3 py-2.5 focus:outline-none focus:border-verde-campo text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Horário</label>
                  <input
                    type="time"
                    value={jogoHora}
                    onChange={(e) => setJogoHora(e.target.value)}
                    className="w-full border-2 border-gray-200 rounded-lg px-3 py-2.5 focus:outline-none focus:border-verde-campo text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Local</label>
                <input
                  type="text"
                  value={jogoLocal}
                  onChange={(e) => setJogoLocal(e.target.value)}
                  placeholder="Ex: Quadra do bairro"
                  className="w-full border-2 border-gray-200 rounded-lg px-4 py-2.5 focus:outline-none focus:border-verde-campo text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Formato</label>
                <div className="grid grid-cols-3 gap-2">
                  {FORMATOS.map((f) => (
                    <button
                      key={f}
                      onClick={() => setJogoFormato(f)}
                      className={`py-2 rounded-lg text-sm font-semibold border-2 transition-colors ${
                        jogoFormato === f
                          ? 'border-verde-campo bg-verde-claro text-verde-campo'
                          : 'border-gray-200 text-gray-600'
                      }`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Número de times: <span className="text-verde-campo">{jogoNumTimes}</span>
                </label>
                <input
                  type="range"
                  min={2}
                  max={8}
                  value={jogoNumTimes}
                  onChange={(e) => setJogoNumTimes(parseInt(e.target.value))}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>2</span><span>4</span><span>6</span><span>8</span>
                </div>
              </div>

              {error && (
                <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm">{error}</div>
              )}

              <button
                onClick={handleCreateJogo}
                disabled={creating}
                className="w-full bg-verde-campo text-white font-bold py-4 rounded-xl hover:bg-verde-escuro transition-colors disabled:opacity-60"
              >
                {creating ? 'Criando...' : 'Criar jogo'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}
