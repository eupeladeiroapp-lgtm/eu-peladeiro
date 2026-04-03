import { Bell, Calendar, Check, MapPin, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import { Confirmacao, Grupo, Jogo } from '../types'

interface ConviteInfo {
  confirmacao: Confirmacao
  jogo: Jogo
  grupo: Grupo | null
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
  const [convites, setConvites] = useState<ConviteInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [responding, setResponding] = useState<string | null>(null)

  useEffect(() => {
    fetchConvites()
  }, [user])

  async function fetchConvites() {
    if (!user) return
    try {
      setLoading(true)

      // Get pending invites (jogos where the user hasn't confirmed or declined yet)
      // We look for jogos from grupos the user is in but hasn't confirmed
      const { data: membrosData } = await supabase
        .from('grupos_membros')
        .select('grupo_id')
        .eq('profile_id', user.id)

      const grupoIds = (membrosData || []).map((m: { grupo_id: string }) => m.grupo_id)

      if (grupoIds.length === 0) {
        setConvites([])
        setLoading(false)
        return
      }

      const { data: jogosData } = await supabase
        .from('jogos')
        .select('*')
        .in('grupo_id', grupoIds)
        .eq('status', 'aberto')
        .gte('data_hora', new Date().toISOString())
        .order('data_hora', { ascending: true })

      if (!jogosData || jogosData.length === 0) {
        setConvites([])
        setLoading(false)
        return
      }

      const { data: confirmacoesData } = await supabase
        .from('confirmacoes')
        .select('*')
        .eq('profile_id', user.id)
        .in(
          'jogo_id',
          jogosData.map((j: Jogo) => j.id)
        )

      const confirmacoesMap = new Map(
        ((confirmacoesData as Confirmacao[]) || []).map((c) => [c.jogo_id, c])
      )

      // Jogos where user hasn't responded
      const jogosPendentes = (jogosData as Jogo[]).filter((j) => !confirmacoesMap.has(j.id))

      const gruposCache: Record<string, Grupo | null> = {}
      for (const jogo of jogosPendentes) {
        if (!gruposCache[jogo.grupo_id]) {
          const { data: grupoData } = await supabase
            .from('grupos')
            .select('*')
            .eq('id', jogo.grupo_id)
            .single()
          gruposCache[jogo.grupo_id] = grupoData as Grupo
        }
      }

      const pendentes: ConviteInfo[] = jogosPendentes.map((jogo) => ({
        confirmacao: {
          id: `pending-${jogo.id}`,
          jogo_id: jogo.id,
          profile_id: user.id,
          status: 'confirmado',
          tipo_convite: 'fixo',
          created_at: '',
        },
        jogo,
        grupo: gruposCache[jogo.grupo_id] || null,
      }))

      setConvites(pendentes)
    } catch (err) {
      console.error(err)
      setConvites([])
    } finally {
      setLoading(false)
    }
  }

  async function handleResponder(jogoId: string, status: 'confirmado' | 'recusado') {
    if (!user) return
    setResponding(jogoId)
    try {
      await supabase.from('confirmacoes').upsert({
        jogo_id: jogoId,
        profile_id: user.id,
        status,
        tipo_convite: 'fixo',
      })
      setConvites((prev) => prev.filter((c) => c.jogo.id !== jogoId))
    } catch (err) {
      console.error(err)
    } finally {
      setResponding(null)
    }
  }

  return (
    <Layout>
      {/* Header */}
      <div
        className="px-5 pt-12 pb-6"
        style={{ background: 'linear-gradient(160deg, #1D9E75, #085041)' }}
      >
        <h1 className="text-white text-2xl font-bold">Convites</h1>
        <p className="text-white/70 text-sm">
          {convites.length} convite{convites.length !== 1 ? 's' : ''} pendente{convites.length !== 1 ? 's' : ''}
        </p>
      </div>

      <div className="px-5 py-5">
        {loading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="bg-white rounded-lg p-4 animate-pulse h-32" />
            ))}
          </div>
        ) : convites.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
              <Bell size={32} className="text-gray-300" />
            </div>
            <h3 className="font-semibold text-gray-600 text-lg mb-2">
              Nenhum convite pendente
            </h3>
            <p className="text-gray-400 text-sm">
              Quando seus grupos marcarem jogos, eles aparecerão aqui.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {convites.map(({ jogo, grupo }) => (
              <div
                key={jogo.id}
                className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 animate-fade-in"
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div>
                    {grupo && (
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-0.5">
                        {grupo.nome}
                      </p>
                    )}
                    <p className="font-bold text-gray-800">{jogo.formato}</p>
                  </div>
                  <span className="text-xs font-semibold px-2 py-1 bg-orange-100 text-orange-600 rounded-full">
                    Pendente
                  </span>
                </div>

                {/* Details */}
                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Calendar size={14} className="text-verde-campo flex-shrink-0" />
                    <span className="capitalize">{formatDate(jogo.data_hora)}</span>
                    <span className="font-semibold text-verde-campo">{formatTime(jogo.data_hora)}</span>
                  </div>
                  {jogo.local && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <MapPin size={14} className="text-verde-campo flex-shrink-0" />
                      <span className="truncate">{jogo.local}</span>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <button
                    onClick={() => handleResponder(jogo.id, 'confirmado')}
                    disabled={responding === jogo.id}
                    className="flex-1 flex items-center justify-center gap-2 bg-verde-campo text-white font-semibold py-3 rounded-xl hover:bg-verde-escuro transition-colors disabled:opacity-60 text-sm"
                  >
                    <Check size={16} />
                    Confirmar
                  </button>
                  <button
                    onClick={() => handleResponder(jogo.id, 'recusado')}
                    disabled={responding === jogo.id}
                    className="flex items-center justify-center gap-2 bg-red-50 text-red-500 font-semibold px-4 py-3 rounded-xl hover:bg-red-100 transition-colors disabled:opacity-60 text-sm border-2 border-red-100"
                  >
                    <X size={16} />
                    Recusar
                  </button>
                  <button
                    onClick={() => navigate(`/jogo/${jogo.link_token}`)}
                    className="px-3 py-3 bg-gray-100 text-gray-600 rounded-xl hover:bg-gray-200 transition-colors text-sm font-semibold"
                  >
                    Ver
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  )
}
