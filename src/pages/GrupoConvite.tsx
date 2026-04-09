import { CheckCircle, Users } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import { Grupo } from '../types'

export default function GrupoConvite() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user, profile, loading: authLoading, profileLoading, signInWithGoogle } = useAuth()

  const [grupo, setGrupo] = useState<Grupo | null>(null)
  const [loadingGrupo, setLoadingGrupo] = useState(true)
  const [joining, setJoining] = useState(false)
  const [joined, setJoined] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [membrosCount, setMembrosCount] = useState(0)

  useEffect(() => {
    if (id) {
      localStorage.setItem('pendingGroupInvite', id)
      fetchGrupo()
    }
  }, [id])

  useEffect(() => {
    if (authLoading || profileLoading) return
    if (!user) return
    if (!profile) {
      navigate('/onboarding')
      return
    }
    handleJoinGrupo()
  }, [user, profile, authLoading, profileLoading])

  async function fetchGrupo() {
    try {
      const { data } = await supabase.from('grupos').select('*').eq('id', id).single()
      setGrupo(data as Grupo)
      const { count } = await supabase
        .from('grupo_membros')
        .select('*', { count: 'exact', head: true })
        .eq('grupo_id', id)
      setMembrosCount(count || 0)
    } catch {
      setError('Grupo não encontrado.')
    } finally {
      setLoadingGrupo(false)
    }
  }

  async function handleJoinGrupo() {
    if (!user || !id) return
    setJoining(true)
    try {
      const { data: existing } = await supabase
        .from('grupo_membros')
        .select('id')
        .eq('grupo_id', id)
        .eq('profile_id', user.id)
        .single()

      if (!existing) {
        // Verifica limite de grupos para usuário Free
        if (!profile?.is_pro) {
          const { count: gruposCount } = await supabase
            .from('grupo_membros')
            .select('*', { count: 'exact', head: true })
            .eq('profile_id', user.id)
          if ((gruposCount || 0) >= 3) {
            setError('Você atingiu o limite de 3 grupos do plano Free. Faça upgrade para Pro para participar de grupos ilimitados.')
            return
          }
        }

        const { error: joinError } = await supabase.from('grupo_membros').insert({
          grupo_id: id,
          profile_id: user.id,
          role: 'membro',
        })
        if (joinError) throw joinError
      }

      localStorage.removeItem('pendingGroupInvite')
      setJoined(true)
      setTimeout(() => navigate(`/grupos/${id}`), 2000)
    } catch {
      setError('Erro ao entrar no grupo.')
    } finally {
      setJoining(false)
    }
  }

  if (authLoading || profileLoading || joining) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#1D9E75' }}>
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin" />
          <p className="text-white font-semibold">
            {joining ? 'Entrando no grupo...' : 'Carregando...'}
          </p>
        </div>
      </div>
    )
  }

  if (joined) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6" style={{ background: '#1D9E75' }}>
        <div className="text-center">
          <CheckCircle size={64} className="text-white mx-auto mb-4" />
          <h1 className="text-white text-2xl font-bold mb-2">Você entrou no grupo!</h1>
          <p className="text-white/80">Redirecionando...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'linear-gradient(160deg, #1D9E75, #085041)' }}>
      {/* Header */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        <div className="w-20 h-20 rounded-3xl bg-white/20 flex items-center justify-center mb-6">
          <span className="text-4xl">⚽</span>
        </div>
        <h1 className="text-white text-3xl font-black mb-1">Eu Peladeiro</h1>
        <p className="text-white/70 text-sm mb-8">Seu futebol, organizado.</p>

        {loadingGrupo ? (
          <div className="w-full max-w-sm bg-white/10 rounded-2xl p-6 animate-pulse">
            <div className="h-5 bg-white/20 rounded mb-3 w-3/4" />
            <div className="h-4 bg-white/10 rounded w-1/2" />
          </div>
        ) : error ? (
          <div className="w-full max-w-sm bg-red-500/20 rounded-2xl p-6 text-center">
            <p className="text-white font-semibold">{error}</p>
          </div>
        ) : (
          <div className="w-full max-w-sm">
            {/* Card do grupo */}
            <div className="bg-white/15 rounded-2xl p-5 mb-6 text-center">
              <p className="text-white/70 text-sm mb-1">Você foi convidado para</p>
              <h2 className="text-white text-2xl font-bold mb-1">{grupo?.nome}</h2>
              {grupo?.descricao && (
                <p className="text-white/60 text-sm mb-2">{grupo.descricao}</p>
              )}
              <div className="flex items-center justify-center gap-4 mt-3">
                <span className="bg-white/20 text-white text-xs font-semibold px-3 py-1 rounded-full">
                  {grupo?.formato}
                </span>
                <div className="flex items-center gap-1 text-white/70 text-sm">
                  <Users size={14} />
                  <span>{membrosCount} membros</span>
                </div>
              </div>
            </div>

            {/* Login button */}
            <button
              onClick={() =>
                supabase.auth.signInWithOAuth({
                  provider: 'google',
                  options: {
                    redirectTo: window.location.href,
                    queryParams: { prompt: 'select_account' },
                  },
                })
              }
              className="w-full bg-white text-verde-campo font-bold py-4 rounded-2xl flex items-center justify-center gap-3 shadow-lg hover:bg-verde-claro transition-colors text-base"
            >
              <svg width="20" height="20" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Entrar com Google para participar
            </button>
            <p className="text-white/50 text-xs text-center mt-3">
              Novo por aqui? Você vai criar seu perfil rapidinho antes de entrar.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
