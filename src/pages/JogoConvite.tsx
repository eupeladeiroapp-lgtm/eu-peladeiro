import { Calendar, Check, ChevronDown, ChevronUp, MapPin, Share2, Shuffle, Users, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import AvatarStack from '../components/AvatarStack'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import { Confirmacao, Grupo, Jogo, Profile } from '../types'

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

export default function JogoConvite() {
  const { token } = useParams<{ token: string }>()
  const navigate = useNavigate()
  const { user, profile } = useAuth()

  const [jogo, setJogo] = useState<Jogo | null>(null)
  const [grupo, setGrupo] = useState<Grupo | null>(null)
  const [confirmacoes, setConfirmacoes] = useState<Confirmacao[]>([])
  const [confirmacoesProfiles, setConfirmacoesProfiles] = useState<Profile[]>([])
  const [userStatus, setUserStatus] = useState<'confirmado' | 'recusado' | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [listaExpandida, setListaExpandida] = useState(false)

  useEffect(() => {
    fetchJogo()
  }, [token])

  useEffect(() => {
    if (user && confirmacoes.length > 0) {
      const myConf = confirmacoes.find((c) => c.profile_id === user.id)
      setUserStatus(myConf?.status || null)
    }
  }, [user, confirmacoes])

  async function fetchJogo() {
    if (!token) return
    try {
      setLoading(true)
      const { data: jogoData } = await supabase
        .from('jogos')
        .select('*')
        .eq('link_token', token)
        .single()

      if (jogoData) {
        setJogo(jogoData as Jogo)

        const { data: grupoData } = await supabase
          .from('grupos')
          .select('*')
          .eq('id', jogoData.grupo_id)
          .single()
        setGrupo(grupoData as Grupo)

        const { data: confsData } = await supabase
          .from('confirmacoes')
          .select('*')
          .eq('jogo_id', jogoData.id)
        const confs = (confsData as Confirmacao[]) || []
        setConfirmacoes(confs)

        // Fetch profiles for confirmed players
        const confirmadosIds = confs.filter((c) => c.status === 'confirmado').map((c) => c.profile_id)
        if (confirmadosIds.length > 0) {
          const { data: profilesData } = await supabase
            .from('profiles')
            .select('*')
            .in('id', confirmadosIds)
          setConfirmacoesProfiles((profilesData as Profile[]) || [])
        } else {
          setConfirmacoesProfiles([])
        }
      }
    } catch (err) {
      console.error(err)
      setError('Jogo não encontrado ou link inválido.')
    } finally {
      setLoading(false)
    }
  }

  async function handleConfirmar() {
    if (!user || !jogo) return
    setSaving(true)
    setError(null)
    try {
      const { error: confError } = await supabase.from('confirmacoes').upsert({
        jogo_id: jogo.id,
        profile_id: user.id,
        status: 'confirmado',
        tipo_convite: 'avulso',
      })
      if (confError) throw confError
      setUserStatus('confirmado')
      fetchJogo()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao confirmar presença.'
      setError(msg)
    } finally {
      setSaving(false)
    }
  }

  async function handleRecusar() {
    if (!user || !jogo) return
    setSaving(true)
    setError(null)
    try {
      const { error: confError } = await supabase.from('confirmacoes').upsert({
        jogo_id: jogo.id,
        profile_id: user.id,
        status: 'recusado',
        tipo_convite: 'avulso',
      })
      if (confError) throw confError
      setUserStatus('recusado')
      fetchJogo()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao recusar convite.'
      setError(msg)
    } finally {
      setSaving(false)
    }
  }

  async function handleShare() {
    const url = window.location.href
    if (navigator.share) {
      await navigator.share({
        title: 'Confirma presença na pelada?',
        text: `${grupo?.nome || 'Pelada'} — ${jogo ? formatDate(jogo.data_hora) : ''}`,
        url,
      })
    } else {
      navigator.clipboard.writeText(url)
      alert('Link copiado!')
    }
  }

  const confirmados = confirmacoes.filter((c) => c.status === 'confirmado')

  const jogoEncerrado = jogo
    ? jogo.status === 'encerrado' || new Date() > new Date(jogo.data_hora)
    : false

  const prazoEncerrado = jogo
    ? new Date() > new Date(new Date(jogo.data_hora).getTime() - 30 * 60 * 1000)
    : false

  const isAdmin = user && jogo ? jogo.criado_por === user.id : false

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#1D9E75' }}>
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin" />
          <p className="text-white font-semibold">Carregando convite...</p>
        </div>
      </div>
    )
  }

  if (error || !jogo) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-gray-50">
        <div className="text-5xl mb-4">😕</div>
        <h2 className="text-xl font-bold text-gray-700 mb-2">Jogo não encontrado</h2>
        <p className="text-gray-400 text-sm text-center mb-6">
          {error || 'Este link pode ter expirado ou ser inválido.'}
        </p>
        <button
          onClick={() => navigate('/')}
          className="bg-verde-campo text-white font-semibold px-6 py-3 rounded-xl"
        >
          Ir para o início
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Hero */}
      <div
        className="px-5 pt-16 pb-8 text-center"
        style={{ background: 'linear-gradient(160deg, #1D9E75, #085041)' }}
      >
        <div className="text-5xl mb-3">⚽</div>
        <h1 className="text-white text-2xl font-bold mb-1">
          {grupo?.nome || 'Pelada'}
        </h1>
        <p className="text-white/70 text-sm">Você foi convidado para jogar!</p>
      </div>

      {/* Card */}
      <div className="px-5 -mt-4">
        <div className="bg-white rounded-xl shadow-lg p-5 border border-gray-100">
          <div className="space-y-3 mb-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-verde-claro flex items-center justify-center flex-shrink-0">
                <Calendar size={18} className="text-verde-campo" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Data e horário</p>
                <p className="font-semibold text-gray-800 capitalize">{formatDate(jogo.data_hora)}</p>
                <p className="text-verde-campo font-bold">
                  {formatTime(jogo.data_hora)}
                  {jogo.hora_fim && ` às ${jogo.hora_fim}`}
                </p>
              </div>
            </div>

            {jogo.local && (
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-verde-claro flex items-center justify-center flex-shrink-0">
                  <MapPin size={18} className="text-verde-campo" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Local</p>
                  <p className="font-semibold text-gray-800">{jogo.local}</p>
                </div>
              </div>
            )}

            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-verde-claro flex items-center justify-center flex-shrink-0">
                <Users size={18} className="text-verde-campo" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-gray-500 mb-1">Confirmados</p>
                <div className="flex items-center gap-2">
                  <AvatarStack
                    avatars={confirmacoesProfiles.map((p) => p.foto_url)}
                    names={confirmacoesProfiles.map((p) => p.nome)}
                  />
                  <span className="font-semibold text-gray-700">{confirmados.length} confirmados</span>
                </div>
              </div>
            </div>
          </div>

          {/* Confirmed players list - expandable */}
          {confirmacoesProfiles.length > 0 && (
            <div className="pt-3 border-t border-gray-100">
              <button
                onClick={() => setListaExpandida((v) => !v)}
                className="w-full flex items-center justify-between text-left"
                type="button"
              >
                <p className="text-xs font-semibold text-gray-500">
                  Quem vai jogar ({confirmacoesProfiles.length}):
                </p>
                {listaExpandida
                  ? <ChevronUp size={16} className="text-gray-400" />
                  : <ChevronDown size={16} className="text-gray-400" />
                }
              </button>
              {listaExpandida && (
                <div className="mt-2 space-y-2">
                  {confirmacoesProfiles.map((p) => (
                    <div key={p.id} className="flex items-center gap-2.5 py-1">
                      <div className="w-8 h-8 rounded-full overflow-hidden bg-verde-campo flex items-center justify-center flex-shrink-0">
                        {p.foto_url ? (
                          <img src={p.foto_url} alt={p.nome} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-white text-sm font-bold">{p.nome?.[0]?.toUpperCase()}</span>
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-800">{p.nome}</p>
                        {p.posicao_principal && (
                          <p className="text-xs text-gray-400">{p.posicao_principal}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="pt-3 border-t border-gray-100 mt-3">
            <span className="text-xs font-semibold text-gray-500">Formato: </span>
            <span className="text-xs font-bold text-verde-campo">{jogo.formato}</span>
            <span className="text-xs text-gray-400 ml-2">· {jogo.num_times} times</span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="px-5 mt-5">
        {!user ? (
          <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm text-center">
            <p className="text-gray-600 font-medium mb-4">
              Entre com sua conta Google para confirmar presença
            </p>
            <button
              onClick={() => navigate('/login')}
              className="w-full bg-verde-campo text-white font-bold py-4 rounded-xl hover:bg-verde-escuro transition-colors"
            >
              Entrar com Google para confirmar
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {userStatus === 'confirmado' ? (
              <div className="bg-verde-claro border border-verde-campo/30 rounded-xl p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-verde-campo flex items-center justify-center">
                  <Check size={20} className="text-white" />
                </div>
                <div>
                  <p className="font-bold text-verde-escuro">Você está confirmado!</p>
                  <p className="text-verde-campo text-sm">Até mais, {profile?.nome || 'peladeiro'}!</p>
                </div>
              </div>
            ) : userStatus === 'recusado' ? (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                  <X size={20} className="text-red-500" />
                </div>
                <div>
                  <p className="font-bold text-red-700">Você recusou o convite</p>
                  <p className="text-red-500 text-sm">Quem sabe na próxima!</p>
                </div>
              </div>
            ) : null}

            {prazoEncerrado ? (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center">
                <p className="text-amber-700 font-semibold text-sm">
                  ⏰ Confirmações encerradas 30 min antes do jogo
                </p>
              </div>
            ) : jogo.status === 'aberto' ? (
              <div className="flex gap-3">
                {userStatus !== 'confirmado' && (
                  <button
                    onClick={handleConfirmar}
                    disabled={saving}
                    className="flex-1 flex items-center justify-center gap-2 bg-verde-campo text-white font-bold py-4 rounded-xl hover:bg-verde-escuro transition-colors disabled:opacity-60"
                  >
                    <Check size={20} />
                    {saving ? 'Confirmando...' : 'Confirmar presença'}
                  </button>
                )}
                {userStatus === 'confirmado' && (
                  <button
                    onClick={handleRecusar}
                    disabled={saving}
                    className="flex-1 flex items-center justify-center gap-2 bg-red-50 text-red-500 border-2 border-red-200 font-bold py-4 rounded-xl hover:bg-red-100 transition-colors disabled:opacity-60"
                  >
                    <X size={20} />
                    {saving ? 'Aguarde...' : 'Desistir'}
                  </button>
                )}
                {userStatus === null && (
                  <button
                    onClick={handleRecusar}
                    disabled={saving}
                    className="px-4 flex items-center justify-center gap-2 bg-gray-100 text-gray-500 font-bold py-4 rounded-xl hover:bg-gray-200 transition-colors disabled:opacity-60"
                  >
                    <X size={20} />
                    Recusar
                  </button>
                )}
              </div>
            ) : null}

            {jogoEncerrado && (
              <button
                onClick={() => navigate(`/jogo/${jogo.id}/registro`)}
                className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white font-bold py-4 rounded-xl hover:bg-blue-700 transition-colors"
              >
                📊 Registrar estatísticas
              </button>
            )}

            {isAdmin && jogo.status === 'aberto' && (
              <button
                onClick={() => navigate(`/jogo/${jogo.id}/times`)}
                className="w-full flex items-center justify-center gap-2 bg-amber-500 text-white font-bold py-4 rounded-xl hover:bg-amber-600 transition-colors"
              >
                <Shuffle size={20} /> Sortear times
              </button>
            )}

            {jogo.status !== 'aberto' && !jogoEncerrado && (
              <div className="text-center p-4 bg-gray-100 rounded-xl">
                <p className="text-gray-500 font-medium">
                  {jogo.status === 'em_andamento' ? 'Jogo em andamento!' : 'Jogo encerrado'}
                </p>
              </div>
            )}
          </div>
        )}

        {error && (
          <div className="mt-3 p-3 bg-red-50 text-red-600 rounded-lg text-sm">{error}</div>
        )}

        <button
          onClick={handleShare}
          className="w-full mt-3 flex items-center justify-center gap-2 bg-white border-2 border-gray-200 text-gray-700 font-semibold py-3.5 rounded-xl hover:bg-gray-50 transition-colors"
        >
          <Share2 size={18} />
          Compartilhar convite
        </button>

        {user && (
          <button
            onClick={() => navigate('/')}
            className="w-full mt-2 text-center text-verde-campo text-sm font-semibold py-3"
          >
            Ir para o início
          </button>
        )}
      </div>
    </div>
  )
}
