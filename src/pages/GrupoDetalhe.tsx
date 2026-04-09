import { ArrowLeft, Calendar, Crown, Pencil, Plus, Share2, Shuffle, Trash2, Trophy, User, Users, X } from 'lucide-react'
import { statusEfetivo } from '../utils/jogo'
import { getPosicaoCor, getPosicaoLabel } from '../utils/posicoes'
import React, { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { useNavigate, useParams } from 'react-router-dom'
import CardJogo from '../components/CardJogo'
import Layout from '../components/Layout'
import ModalUpgradePro from '../components/ModalUpgradePro'
import RankingList from '../components/RankingList'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import { Estatistica, Grupo, GrupoMembro, Jogo, Profile } from '../types'

interface RankingEntry {
  id: string
  nome: string
  foto_url: string | null
  valor: number
}

type TabRanking = 'goleador' | 'garcom' | 'muralha' | 'vitorias' | 'empates'

type TabType = 'membros' | 'jogos' | 'rankings'

const FORMATOS = ['5x5', '7x7', '8x8', '11x11', 'Futsal', 'Society']

export default function GrupoDetalhe() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user, profile } = useAuth()
  const [showUpgradeMembros, setShowUpgradeMembros] = useState(false)

  const [grupo, setGrupo] = useState<Grupo | null>(null)
  const [membros, setMembros] = useState<(GrupoMembro & { profile: Profile })[]>([])
  const [jogos, setJogos] = useState<Jogo[]>([])
  const [confirmadosPorJogo, setConfirmadosPorJogo] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<TabType>('membros')
  const [showCreateJogo, setShowCreateJogo] = useState(false)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [rankingTab, setRankingTab] = useState<TabRanking>('goleador')
  const [rankings, setRankings] = useState<RankingEntry[]>([])
  const [rankingLoading, setRankingLoading] = useState(false)

  // Edit group
  const [showEditGrupo, setShowEditGrupo] = useState(false)
  const [editNome, setEditNome] = useState('')
  const [editDescricao, setEditDescricao] = useState('')
  const [editFormato, setEditFormato] = useState('')
  const [saving, setSaving] = useState(false)
  const [showDeleteGrupo, setShowDeleteGrupo] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [showSairGrupo, setShowSairGrupo] = useState(false)
  const [saindo, setSaindo] = useState(false)
  const [membroParaRemover, setMembroParaRemover] = useState<(GrupoMembro & { profile: Profile }) | null>(null)
  const [removendo, setRemovendo] = useState(false)

  // Edit/delete jogo
  const [showEditJogo, setShowEditJogo] = useState(false)
  const [editJogo, setEditJogo] = useState<Jogo | null>(null)
  const [editJogoData, setEditJogoData] = useState('')
  const [editJogoHora, setEditJogoHora] = useState('')
  const [editJogoHoraFim, setEditJogoHoraFim] = useState('')
  const [editJogoLocal, setEditJogoLocal] = useState('')
  const [editJogoFormato, setEditJogoFormato] = useState('')
  const [editJogoNumTimes, setEditJogoNumTimes] = useState(2)
  const [showDeleteJogo, setShowDeleteJogo] = useState(false)
  const [jogoParaDeletar, setJogoParaDeletar] = useState<Jogo | null>(null)

  const [jogoData, setJogoData] = useState('')
  const [jogoHora, setJogoHora] = useState('19:00')
  const [jogoHoraFim, setJogoHoraFim] = useState('')
  const [jogoLocal, setJogoLocal] = useState('')
  const [jogoFormato, setJogoFormato] = useState('7x7')
  const [jogoNumTimes, setJogoNumTimes] = useState(2)

  useEffect(() => {
    fetchAll()
  }, [id])

  useEffect(() => {
    if (tab === 'rankings') fetchRankings()
  }, [tab, rankingTab, id])

  async function fetchRankings() {
    if (!id) return
    setRankingLoading(true)
    try {
      const { data: jogoIds } = await supabase
        .from('jogos')
        .select('id')
        .eq('grupo_id', id)

      if (!jogoIds || jogoIds.length === 0) { setRankings([]); return }

      const ids = jogoIds.map((j: { id: string }) => j.id)

      const { data: statsData } = await supabase
        .from('estatisticas')
        .select('*, profile:profiles(*)')
        .in('jogo_id', ids)

      if (!statsData || statsData.length === 0) { setRankings([]); return }

      const agg: Record<string, { profile: Profile; gols: number; assistencias: number; defesas: number; vitorias: number; empates: number }> = {}
      for (const stat of statsData as (Estatistica & { profile: Profile })[]) {
        if (!agg[stat.profile_id]) {
          agg[stat.profile_id] = { profile: stat.profile, gols: 0, assistencias: 0, defesas: 0, vitorias: 0, empates: 0 }
        }
        agg[stat.profile_id].gols += stat.gols
        agg[stat.profile_id].assistencias += stat.assistencias
        agg[stat.profile_id].defesas += stat.defesas
        agg[stat.profile_id].vitorias += (stat as any).vitorias || 0
        agg[stat.profile_id].empates += (stat as any).empates || 0
      }

      const field = rankingTab === 'goleador' ? 'gols' : rankingTab === 'garcom' ? 'assistencias' : rankingTab === 'muralha' ? 'defesas' : rankingTab === 'vitorias' ? 'vitorias' : 'empates'
      const sorted = Object.values(agg)
        .map((e) => ({ id: e.profile.id, nome: e.profile.nome, foto_url: e.profile.foto_url, valor: e[field] }))
        .sort((a, b) => b.valor - a.valor)

      setRankings(sorted)
    } catch (err) {
      console.error(err)
    } finally {
      setRankingLoading(false)
    }
  }

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

      const jogosQuery = supabase
        .from('jogos')
        .select('*')
        .eq('grupo_id', id)
        .order('data_hora', { ascending: false })

      // Free: histórico limitado aos últimos 30 dias
      if (!profile?.is_pro) {
        const limite = new Date()
        limite.setDate(limite.getDate() - 30)
        jogosQuery.gte('data_hora', limite.toISOString())
      }

      const { data: jogosData } = await jogosQuery
      const jogosList = (jogosData as Jogo[]) || []
      setJogos(jogosList)

      if (jogosList.length > 0) {
        const jogoIds = jogosList.map((j) => j.id)
        const { data: confsData } = await supabase
          .from('confirmacoes')
          .select('jogo_id')
          .in('jogo_id', jogoIds)
          .eq('status', 'confirmado')

        const counts: Record<string, number> = {}
        for (const c of confsData || []) {
          counts[c.jogo_id] = (counts[c.jogo_id] || 0) + 1
        }
        setConfirmadosPorJogo(counts)
      }
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
      const jogoId = crypto.randomUUID()
      const dataHora = new Date(`${jogoData}T${jogoHora}:00`)
      const token = crypto.randomUUID().replace(/-/g, '').substring(0, 12)

      const { error: jogoError } = await supabase
        .from('jogos')
        .insert({
          id: jogoId,
          grupo_id: id,
          data_hora: dataHora.toISOString(),
          hora_fim: jogoHoraFim || null,
          local: jogoLocal.trim() || null,
          formato: jogoFormato,
          num_times: jogoNumTimes,
          status: 'aberto',
          link_token: token,
          criado_por: user.id,
        })

      if (jogoError) throw jogoError

      // Auto-confirm all group members
      const membrosParaConfirmar = membros.map((m) => ({
        jogo_id: jogoId,
        profile_id: m.profile_id,
        status: 'confirmado',
        tipo_convite: 'fixo',
      }))

      if (membrosParaConfirmar.length > 0) {
        await supabase.from('confirmacoes').upsert(membrosParaConfirmar)
      }

      setShowCreateJogo(false)
      navigate(`/jogo/${token}`)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao criar jogo.'
      setError(msg)
    } finally {
      setCreating(false)
    }
  }

  function handleConvidarJogo(jogo: Jogo) {
    const link = `${window.location.origin}/jogo/${jogo.link_token}`
    const texto = `Confirma presença na pelada? ${grupo?.nome || ''} — ${new Date(jogo.data_hora).toLocaleDateString('pt-BR')} às ${new Date(jogo.data_hora).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}\n${link}`
    if (navigator.share) {
      navigator.share({ title: 'Eu Peladeiro', text: texto, url: link })
    } else {
      const whatsapp = `https://wa.me/?text=${encodeURIComponent(texto)}`
      window.open(whatsapp, '_blank')
    }
  }

  const isAdmin = membros.find((m) => m.profile_id === user?.id)?.role === 'admin'

  function openEditGrupo() {
    setEditNome(grupo?.nome || '')
    setEditDescricao(grupo?.descricao || '')
    setEditFormato(grupo?.formato || '')
    setShowEditGrupo(true)
  }

  async function handleSaveGrupo() {
    if (!id) return
    setSaving(true)
    try {
      await supabase.from('grupos').update({
        nome: editNome.trim(),
        descricao: editDescricao.trim() || null,
        formato: editFormato,
      }).eq('id', id)
      setShowEditGrupo(false)
      fetchAll()
    } finally {
      setSaving(false)
    }
  }

  async function limparConfirmacoesDoMembro(profileId: string) {
    // Busca jogos abertos do grupo e remove as confirmações do membro
    const { data: jogosAbertos } = await supabase
      .from('jogos')
      .select('id')
      .eq('grupo_id', id)
      .eq('status', 'aberto')
    if (jogosAbertos && jogosAbertos.length > 0) {
      const jogoIds = jogosAbertos.map((j: { id: string }) => j.id)
      await supabase
        .from('confirmacoes')
        .delete()
        .eq('profile_id', profileId)
        .in('jogo_id', jogoIds)
    }
  }

  async function handleRemoverMembro() {
    if (!id || !membroParaRemover) return
    setRemovendo(true)
    try {
      const profileId = membroParaRemover.profile_id
      const { error } = await supabase
        .from('grupo_membros')
        .delete()
        .eq('grupo_id', id)
        .eq('profile_id', profileId)
      if (error) { console.error('Erro ao remover membro:', error); toast.error('Não foi possível remover o membro. Tente novamente.'); setMembroParaRemover(null); return }
      await limparConfirmacoesDoMembro(profileId)
      setMembroParaRemover(null)
      fetchAll()
      toast.success(`${membroParaRemover.profile?.nome || 'Membro'} removido do grupo.`)
    } finally {
      setRemovendo(false)
    }
  }

  async function handleSairGrupo() {
    if (!id || !user) return
    setSaindo(true)
    try {
      if (isAdmin) {
        const outrosMembros = membros.filter((m) => m.profile_id !== user.id)
        if (outrosMembros.length === 0) {
          // Último membro — exclui o grupo inteiro
          const { error } = await supabase.from('grupos').delete().eq('id', id)
          if (error) { console.error('Erro ao excluir grupo vazio:', error); toast.error('Não foi possível excluir o grupo. Tente novamente.'); setShowSairGrupo(false); return }
          navigate('/grupos')
          return
        }
        // Transfere admin para um membro aleatório
        const novoAdmin = outrosMembros[Math.floor(Math.random() * outrosMembros.length)]
        const { error: errAdmin } = await supabase
          .from('grupo_membros')
          .update({ role: 'admin' })
          .eq('grupo_id', id)
          .eq('profile_id', novoAdmin.profile_id)
        if (errAdmin) { console.error('Erro ao transferir admin:', errAdmin); toast.error('Não foi possível transferir a administração. Tente novamente.'); setShowSairGrupo(false); return }
      }
      const { error } = await supabase
        .from('grupo_membros')
        .delete()
        .eq('grupo_id', id)
        .eq('profile_id', user.id)
      if (error) { console.error('Erro ao sair do grupo:', error); toast.error('Não foi possível sair do grupo. Tente novamente.'); setShowSairGrupo(false); return }
      await limparConfirmacoesDoMembro(user.id)
      navigate('/grupos')
    } finally {
      setSaindo(false)
    }
  }

  async function handleDeleteGrupo() {
    if (!id) return
    setDeleting(true)
    try {
      const { error } = await supabase.from('grupos').delete().eq('id', id)
      if (error) { console.error('Erro ao deletar grupo:', error); setError('Não foi possível excluir o grupo. Tente novamente.'); setShowDeleteGrupo(false); return }
      navigate('/grupos')
    } finally {
      setDeleting(false)
    }
  }

  function openEditJogo(jogo: Jogo) {
    const dt = new Date(jogo.data_hora)
    setEditJogo(jogo)
    setEditJogoData(dt.toISOString().split('T')[0])
    setEditJogoHora(dt.toTimeString().slice(0, 5))
    setEditJogoHoraFim(jogo.hora_fim || '')
    setEditJogoLocal(jogo.local || '')
    setEditJogoFormato(jogo.formato)
    setEditJogoNumTimes(jogo.num_times)
    setShowEditJogo(true)
  }

  async function handleSaveJogo() {
    if (!editJogo) return
    setSaving(true)
    try {
      const dataHora = new Date(`${editJogoData}T${editJogoHora}:00`)
      await supabase.from('jogos').update({
        data_hora: dataHora.toISOString(),
        hora_fim: editJogoHoraFim || null,
        local: editJogoLocal.trim() || null,
        formato: editJogoFormato,
        num_times: editJogoNumTimes,
      }).eq('id', editJogo.id)
      setShowEditJogo(false)
      fetchAll()
    } finally {
      setSaving(false)
    }
  }

  async function handleDeleteJogo() {
    if (!jogoParaDeletar) return
    setDeleting(true)
    try {
      const { error } = await supabase.from('jogos').delete().eq('id', jogoParaDeletar.id)
      if (error) { console.error('Erro ao deletar jogo:', error); setError('Não foi possível excluir o jogo. Tente novamente.'); return }
      setShowDeleteJogo(false)
      setJogoParaDeletar(null)
      fetchAll()
    } finally {
      setDeleting(false)
    }
  }

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
            <div className="flex items-center justify-between">
              <h1 className="text-white text-2xl font-bold">{grupo?.nome}</h1>
              {isAdmin && (
                <button
                  onClick={openEditGrupo}
                  className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors"
                >
                  <Pencil size={16} className="text-white" />
                </button>
              )}
            </div>
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

      <div className="px-5 py-5 pb-32">
        {/* Membros tab */}
        {tab === 'membros' && (
          <div className="space-y-3">
            <button
              onClick={() => {
                if (!profile?.is_pro && membros.length >= 25) {
                  setShowUpgradeMembros(true)
                  return
                }
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
              {!profile?.is_pro && membros.length >= 25 && <span className="text-xs bg-white/20 px-1.5 py-0.5 rounded-full">🔒</span>}
            </button>

            <button
              onClick={() => navigate(`/grupo/${id}/avaliar`)}
              className="w-full flex items-center justify-center gap-2 bg-white border-2 border-verde-campo text-verde-campo font-semibold py-3 rounded-xl hover:bg-verde-claro transition-colors"
            >
              ⭐ Avaliar jogadores
            </button>

            <button
              onClick={() => setShowSairGrupo(true)}
              className="w-full flex items-center justify-center gap-2 text-red-500 font-semibold py-3 rounded-xl border-2 border-red-100 hover:bg-red-50 transition-colors"
            >
              <X size={16} /> Sair do grupo
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
                    <div className="flex items-center gap-1.5">
                      <p className="font-semibold text-gray-800 truncate">{membro.profile?.nome || 'Jogador'}</p>
                      {membro.profile?.is_pro && (
                        <span className="inline-flex items-center bg-yellow-400 text-yellow-900 text-xs font-black px-1.5 py-0.5 rounded-full uppercase tracking-wide flex-shrink-0">
                          PRO
                        </span>
                      )}
                    </div>
                    {membro.profile?.posicao_principal && (
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${getPosicaoCor(membro.profile.posicao_principal)}`}>
                        {getPosicaoLabel(membro.profile.posicao_principal)}
                      </span>
                    )}
                  </div>
                  {membro.role === 'admin' ? (
                    <div className="flex items-center gap-1 text-dourado">
                      <Crown size={14} />
                      <span className="text-xs font-semibold">Admin</span>
                    </div>
                  ) : isAdmin && (
                    <button
                      onClick={() => setMembroParaRemover(membro)}
                      className="w-8 h-8 flex items-center justify-center rounded-full text-red-400 hover:bg-red-50 transition-colors flex-shrink-0"
                    >
                      <X size={16} />
                    </button>
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
            {!profile?.is_pro && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4 flex items-center gap-2">
                <span className="text-base">⭐</span>
                <p className="text-amber-700 text-xs flex-1">
                  Plano Free exibe apenas os últimos 30 dias. <button onClick={() => setShowUpgradeMembros(true)} className="font-bold underline">Ver Pro</button>
                </p>
              </div>
            )}
            <button
              onClick={() => setShowCreateJogo(true)}
              className="w-full flex items-center justify-center gap-2 bg-verde-campo text-white font-semibold py-3 rounded-xl mb-4 hover:bg-verde-escuro transition-colors"
            >
              <Plus size={18} /> Criar novo jogo
            </button>
            {loading ? (
              <div className="space-y-3">
                {[1, 2].map((i) => (
                  <div key={i} className="bg-white rounded-lg p-4 animate-pulse h-24" />
                ))}
              </div>
            ) : jogos.length > 0 ? (
              <div className="space-y-4">
                {jogos.map((jogo) => {
                  const jogoStatus = statusEfetivo(jogo)
                  const dentroJanelaRealizacoes = new Date() < new Date(new Date(jogo.data_hora).getTime() + 3 * 24 * 60 * 60 * 1000)
                  const podeApontarRealizacoes = jogoStatus === 'encerrado' && dentroJanelaRealizacoes
                  return (
                  <div key={jogo.id} className="space-y-2">
                    <CardJogo
                      jogo={{ ...jogo, status: jogoStatus }}
                      confirmados={confirmadosPorJogo[jogo.id] || 0}
                      totalVagas={membros.length}
                      onClick={() => navigate(`/jogo/${jogo.link_token}`)}
                    />
                    <div className="flex gap-2 px-1">
                      {jogoStatus !== 'encerrado' && (
                        <button
                          onClick={() => handleConvidarJogo(jogo)}
                          className="flex-1 flex items-center justify-center gap-1.5 bg-white border border-gray-200 text-gray-700 text-sm font-semibold py-2 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          <Share2 size={14} /> Convidar
                        </button>
                      )}
                      {podeApontarRealizacoes && (
                        <button
                          onClick={() => navigate(`/jogo/${jogo.id}/registro`)}
                          className="flex-1 flex items-center justify-center gap-1.5 bg-verde-campo text-white text-sm font-semibold py-2 rounded-lg hover:bg-verde-escuro transition-colors"
                        >
                          📊 Minhas Realizações
                        </button>
                      )}
                      {isAdmin && jogoStatus === 'aberto' && (
                        <>
                          <button
                            onClick={() => navigate(`/jogo/${jogo.id}/times`)}
                            className="flex-1 flex items-center justify-center gap-1.5 bg-verde-campo text-white text-sm font-semibold py-2 rounded-lg hover:bg-verde-escuro transition-colors"
                          >
                            <Shuffle size={14} /> Sortear
                          </button>
                          <button
                            onClick={() => openEditJogo(jogo)}
                            className="w-9 flex items-center justify-center bg-white border border-gray-200 text-gray-500 py-2 rounded-lg hover:bg-gray-50 transition-colors"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            onClick={() => { setJogoParaDeletar(jogo); setShowDeleteJogo(true) }}
                            className="w-9 flex items-center justify-center bg-red-50 border border-red-100 text-red-400 py-2 rounded-lg hover:bg-red-100 transition-colors"
                          >
                            <Trash2 size={14} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                  )
                })}
              </div>
            ) : (
              <div className="text-center py-10 text-gray-400">
                <Calendar size={32} className="mx-auto mb-2 opacity-30" />
                <p className="font-medium">Nenhum jogo ainda</p>
                <p className="text-sm mt-1">Clique em "Criar novo jogo" para começar</p>
              </div>
            )}
          </div>
        )}

        {/* Rankings tab */}
        {tab === 'rankings' && (
          <div>
            {/* Sub-tabs */}
            <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
              {([
                { key: 'goleador', label: '⚽ Gols' },
                { key: 'garcom', label: '🎯 Assist.' },
                { key: 'muralha', label: '🛡️ Defesas' },
                { key: 'vitorias', label: '🏆 Vitórias' },
                { key: 'empates', label: '🤝 Empates' },
              ] as { key: TabRanking; label: string }[]).map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setRankingTab(key)}
                  className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-semibold border-2 transition-colors ${
                    rankingTab === key
                      ? 'border-verde-campo bg-verde-claro text-verde-campo'
                      : 'border-gray-200 text-gray-500'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {rankingLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => <div key={i} className="bg-white rounded-lg p-4 animate-pulse h-16" />)}
              </div>
            ) : (
              <RankingList
                entries={rankings}
                unidade={rankingTab === 'goleador' ? 'gols' : rankingTab === 'garcom' ? 'assist.' : rankingTab === 'muralha' ? 'defesas' : rankingTab === 'empates' ? 'empates' : 'vitórias'}
              />
            )}

            <button
              onClick={() => navigate(`/grupo/${id}/rankings`)}
              className="w-full mt-4 border-2 border-verde-campo text-verde-campo font-semibold py-3 rounded-xl hover:bg-verde-claro transition-colors"
            >
              Ver ranking global entre todos os jogadores
            </button>
          </div>
        )}
      </div>

      {/* Modal editar grupo */}
      {showEditGrupo && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50">
          <div className="w-full max-w-lg bg-white rounded-t-2xl p-6 pb-10 animate-slide-up max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-bold text-gray-800">Editar grupo</h2>
              <button onClick={() => setShowEditGrupo(false)} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                <X size={18} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Nome do grupo</label>
                <input
                  type="text"
                  value={editNome}
                  onChange={(e) => setEditNome(e.target.value)}
                  className="w-full border-2 border-gray-200 rounded-lg px-4 py-2.5 focus:outline-none focus:border-verde-campo text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Descrição (opcional)</label>
                <input
                  type="text"
                  value={editDescricao}
                  onChange={(e) => setEditDescricao(e.target.value)}
                  className="w-full border-2 border-gray-200 rounded-lg px-4 py-2.5 focus:outline-none focus:border-verde-campo text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Formato</label>
                <div className="grid grid-cols-3 gap-2">
                  {FORMATOS.map((f) => (
                    <button key={f} onClick={() => setEditFormato(f)}
                      className={`py-2 rounded-lg text-sm font-semibold border-2 transition-colors ${editFormato === f ? 'border-verde-campo bg-verde-claro text-verde-campo' : 'border-gray-200 text-gray-600'}`}>
                      {f}
                    </button>
                  ))}
                </div>
              </div>
              <button onClick={handleSaveGrupo} disabled={saving || !editNome.trim()}
                className="w-full bg-verde-campo text-white font-bold py-4 rounded-xl disabled:opacity-60">
                {saving ? 'Salvando...' : 'Salvar alterações'}
              </button>
              <button onClick={() => { setShowEditGrupo(false); setShowDeleteGrupo(true) }}
                className="w-full flex items-center justify-center gap-2 text-red-500 font-semibold py-3 rounded-xl border-2 border-red-100 hover:bg-red-50 transition-colors">
                <Trash2 size={16} /> Excluir grupo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal confirmar exclusão do grupo */}
      {showDeleteGrupo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-5">
          <div className="w-full max-w-sm bg-white rounded-2xl p-6">
            <h2 className="text-lg font-bold text-gray-800 mb-2">Excluir grupo?</h2>
            <p className="text-gray-500 text-sm mb-5">
              Esta ação é permanente. Todos os jogos, confirmações e estatísticas do grupo serão apagados.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setShowDeleteGrupo(false)}
                className="flex-1 py-3 rounded-xl border-2 border-gray-200 text-gray-600 font-semibold">
                Cancelar
              </button>
              <button onClick={handleDeleteGrupo} disabled={deleting}
                className="flex-1 py-3 rounded-xl bg-red-500 text-white font-bold disabled:opacity-60">
                {deleting ? 'Excluindo...' : 'Excluir'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal editar jogo */}
      {showEditJogo && editJogo && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50">
          <div className="w-full max-w-lg bg-white rounded-t-2xl p-6 pb-10 animate-slide-up max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-bold text-gray-800">Editar jogo</h2>
              <button onClick={() => setShowEditJogo(false)} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                <X size={18} />
              </button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Data</label>
                  <input type="date" value={editJogoData} onChange={(e) => setEditJogoData(e.target.value)}
                    className="w-full border-2 border-gray-200 rounded-lg px-3 py-2.5 focus:outline-none focus:border-verde-campo text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Horário início</label>
                  <input type="time" value={editJogoHora} onChange={(e) => setEditJogoHora(e.target.value)}
                    className="w-full border-2 border-gray-200 rounded-lg px-3 py-2.5 focus:outline-none focus:border-verde-campo text-sm" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Horário fim (opcional)</label>
                <input type="time" value={editJogoHoraFim} onChange={(e) => setEditJogoHoraFim(e.target.value)}
                  className="w-full border-2 border-gray-200 rounded-lg px-3 py-2.5 focus:outline-none focus:border-verde-campo text-sm" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Local</label>
                <input type="text" value={editJogoLocal} onChange={(e) => setEditJogoLocal(e.target.value)}
                  placeholder="Ex: Quadra do bairro"
                  className="w-full border-2 border-gray-200 rounded-lg px-4 py-2.5 focus:outline-none focus:border-verde-campo text-sm" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Formato</label>
                <div className="grid grid-cols-3 gap-2">
                  {FORMATOS.map((f) => (
                    <button key={f} onClick={() => setEditJogoFormato(f)}
                      className={`py-2 rounded-lg text-sm font-semibold border-2 transition-colors ${editJogoFormato === f ? 'border-verde-campo bg-verde-claro text-verde-campo' : 'border-gray-200 text-gray-600'}`}>
                      {f}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Número de times: <span className="text-verde-campo">{editJogoNumTimes}</span>
                </label>
                <input type="range" min={2} max={8} value={editJogoNumTimes}
                  onChange={(e) => setEditJogoNumTimes(parseInt(e.target.value))} className="w-full" />
              </div>
              <button onClick={handleSaveJogo} disabled={saving}
                className="w-full bg-verde-campo text-white font-bold py-4 rounded-xl disabled:opacity-60">
                {saving ? 'Salvando...' : 'Salvar alterações'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal confirmar exclusão do jogo */}
      {showDeleteJogo && jogoParaDeletar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-5">
          <div className="w-full max-w-sm bg-white rounded-2xl p-6">
            <h2 className="text-lg font-bold text-gray-800 mb-2">Excluir jogo?</h2>
            <p className="text-gray-500 text-sm mb-5">
              O jogo de <strong>{new Date(jogoParaDeletar.data_hora).toLocaleDateString('pt-BR')}</strong> e todas as confirmações serão apagados permanentemente.
            </p>
            <div className="flex gap-3">
              <button onClick={() => { setShowDeleteJogo(false); setJogoParaDeletar(null) }}
                className="flex-1 py-3 rounded-xl border-2 border-gray-200 text-gray-600 font-semibold">
                Cancelar
              </button>
              <button onClick={handleDeleteJogo} disabled={deleting}
                className="flex-1 py-3 rounded-xl bg-red-500 text-white font-bold disabled:opacity-60">
                {deleting ? 'Excluindo...' : 'Excluir'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal criar jogo */}
      {showCreateJogo && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50">
          <div className="w-full max-w-lg bg-white rounded-t-2xl p-6 pb-10 animate-slide-up max-h-[90vh] overflow-y-auto">
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
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Horário início</label>
                  <input
                    type="time"
                    value={jogoHora}
                    onChange={(e) => setJogoHora(e.target.value)}
                    className="w-full border-2 border-gray-200 rounded-lg px-3 py-2.5 focus:outline-none focus:border-verde-campo text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Horário fim (opcional)</label>
                <input
                  type="time"
                  value={jogoHoraFim}
                  onChange={(e) => setJogoHoraFim(e.target.value)}
                  className="w-full border-2 border-gray-200 rounded-lg px-3 py-2.5 focus:outline-none focus:border-verde-campo text-sm"
                />
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
      {showUpgradeMembros && (
        <ModalUpgradePro
          titulo="Limite de membros atingido"
          descricao="No plano Free cada grupo pode ter até 25 membros. Faça upgrade para Pro e convide jogadores ilimitados!"
          onFechar={() => setShowUpgradeMembros(false)}
        />
      )}

      {/* Modal confirmar remoção de membro (admin) */}
      {membroParaRemover && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-5">
          <div className="w-full max-w-sm bg-white rounded-2xl p-6">
            <h2 className="text-lg font-bold text-gray-800 mb-2">Remover membro?</h2>
            <p className="text-gray-500 text-sm mb-5">
              <strong>{membroParaRemover.profile?.nome || 'Este jogador'}</strong> será removido do grupo e precisará de um novo convite para entrar.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setMembroParaRemover(null)}
                className="flex-1 py-3 rounded-xl border-2 border-gray-200 text-gray-600 font-semibold">
                Cancelar
              </button>
              <button onClick={handleRemoverMembro} disabled={removendo}
                className="flex-1 py-3 rounded-xl bg-red-500 text-white font-bold disabled:opacity-60">
                {removendo ? 'Removendo...' : 'Remover'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal confirmar saída do grupo */}
      {showSairGrupo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-5">
          <div className="w-full max-w-sm bg-white rounded-2xl p-6">
            <h2 className="text-lg font-bold text-gray-800 mb-2">Sair do grupo?</h2>
            <p className="text-gray-500 text-sm mb-4">
              Você perderá acesso ao grupo <strong>{grupo?.nome}</strong> e precisará de um novo convite para entrar.
            </p>
            {isAdmin && (
              <p className="text-amber-600 text-xs bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-4">
                {membros.filter((m) => m.profile_id !== user?.id).length === 0
                  ? 'Você é o único membro. Sair irá excluir o grupo permanentemente.'
                  : 'Você é admin. A administração será transferida automaticamente para outro membro.'}
              </p>
            )}
            <div className="flex gap-3">
              <button onClick={() => setShowSairGrupo(false)}
                className="flex-1 py-3 rounded-xl border-2 border-gray-200 text-gray-600 font-semibold">
                Cancelar
              </button>
              <button onClick={handleSairGrupo} disabled={saindo}
                className="flex-1 py-3 rounded-xl bg-red-500 text-white font-bold disabled:opacity-60">
                {saindo ? 'Saindo...' : 'Sair'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}
