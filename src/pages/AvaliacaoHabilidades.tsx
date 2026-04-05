import { ArrowLeft, ChevronDown, ChevronUp } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Layout from '../components/Layout'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import { GrupoMembro, Profile } from '../types'
import { getPosicaoCor, getPosicaoLabel } from '../utils/posicoes'

const SKILLS = [
  { key: 'chute', label: 'Chute', emoji: '🦵' },
  { key: 'drible', label: 'Drible', emoji: '⚡' },
  { key: 'passe', label: 'Passe', emoji: '🎯' },
  { key: 'defesa', label: 'Defesa', emoji: '🛡️' },
  { key: 'forca', label: 'Força', emoji: '💪' },
  { key: 'velocidade', label: 'Velocidade', emoji: '🏃' },
]

type MembroComProfile = GrupoMembro & { profile: Profile }

export default function AvaliacaoHabilidades() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [membros, setMembros] = useState<MembroComProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expandido, setExpandido] = useState<Record<string, boolean>>({})

  // avaliacoes[profileId] = { chute: 5, drible: 5, ... }
  const [avaliacoes, setAvaliacoes] = useState<Record<string, Record<string, number>>>({})

  useEffect(() => {
    fetchMembros()
  }, [id])

  async function fetchMembros() {
    if (!id) return
    try {
      setLoading(true)
      const { data } = await supabase
        .from('grupo_membros')
        .select('*, profile:profiles(*)')
        .eq('grupo_id', id)

      const todos = (data as MembroComProfile[]) || []
      const outros = todos.filter((m) => m.profile_id !== user?.id)
      setMembros(outros)

      // Initialize ratings at 5 for each member
      const init: Record<string, Record<string, number>> = {}
      for (const m of outros) {
        init[m.profile_id] = {
          chute: 5,
          drible: 5,
          passe: 5,
          defesa: 5,
          forca: 5,
          velocidade: 5,
        }
      }
      setAvaliacoes(init)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  function toggleExpandido(profileId: string) {
    setExpandido((prev) => ({ ...prev, [profileId]: !prev[profileId] }))
  }

  function setHabilidade(profileId: string, skill: string, value: number) {
    setAvaliacoes((prev) => ({
      ...prev,
      [profileId]: { ...prev[profileId], [skill]: value },
    }))
  }

  async function handleSubmit() {
    if (!user || !id) return
    setSaving(true)
    setError(null)
    try {
      const upserts = membros.map((m) => ({
        avaliador_id: user.id,
        avaliado_id: m.profile_id,
        grupo_id: id,
        habilidades: avaliacoes[m.profile_id] || {},
      }))

      const { error: upsertError } = await supabase
        .from('avaliacoes')
        .upsert(upserts, { onConflict: 'avaliador_id,avaliado_id,grupo_id' })

      if (upsertError) throw upsertError
      setSaved(true)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao salvar avaliações.'
      setError(msg)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-20">
          <div className="w-10 h-10 border-4 border-verde-campo border-t-transparent rounded-full animate-spin" />
        </div>
      </Layout>
    )
  }

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
        <h1 className="text-white text-2xl font-bold">Avaliar jogadores</h1>
        <p className="text-white/70 text-sm mt-1">Suas avaliações são anônimas</p>
      </div>

      <div className="px-5 py-5 pb-32">
        {/* Aviso anonimato */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-5 flex items-start gap-3">
          <span className="text-xl">🔒</span>
          <div>
            <p className="font-semibold text-blue-800 text-sm">Suas avaliações são anônimas</p>
            <p className="text-blue-600 text-xs mt-0.5">
              Cada jogador vê apenas a média de todas as avaliações recebidas, sem saber quem avaliou.
            </p>
          </div>
        </div>

        {saved ? (
          <div className="bg-verde-claro border border-verde-campo/30 rounded-xl p-6 text-center">
            <div className="text-4xl mb-3">✅</div>
            <p className="font-bold text-verde-escuro text-lg">Avaliações enviadas!</p>
            <p className="text-verde-campo text-sm mt-1">Obrigado por contribuir com o grupo.</p>
            <button
              onClick={() => navigate(-1)}
              className="mt-4 bg-verde-campo text-white font-semibold px-6 py-3 rounded-xl hover:bg-verde-escuro transition-colors"
            >
              Voltar ao grupo
            </button>
          </div>
        ) : membros.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <p className="text-4xl mb-3">👥</p>
            <p className="font-semibold text-gray-600 text-lg">Nenhum outro membro para avaliar</p>
            <p className="text-sm mt-2 text-gray-400">Convide jogadores para o grupo e volte aqui para avaliá-los.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {membros.map((membro) => {
              const aberto = expandido[membro.profile_id] || false
              const notas = avaliacoes[membro.profile_id] || {}
              return (
                <div key={membro.id} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                  {/* Header do membro */}
                  <button
                    className="w-full flex items-center gap-3 p-4 active:bg-gray-50 transition-colors text-left"
                    onClick={() => toggleExpandido(membro.profile_id)}
                    type="button"
                  >
                    <div className="w-10 h-10 rounded-full overflow-hidden bg-verde-campo flex items-center justify-center flex-shrink-0">
                      {membro.profile?.foto_url ? (
                        <img src={membro.profile.foto_url} alt={membro.profile.nome} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-white font-bold">{membro.profile?.nome?.[0]?.toUpperCase() || '?'}</span>
                      )}
                    </div>
                    <div className="flex-1 text-left">
                      <p className="font-semibold text-gray-800">{membro.profile?.nome || 'Jogador'}</p>
                      {membro.profile?.posicao_principal && (
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${getPosicaoCor(membro.profile.posicao_principal)}`}>
                          {getPosicaoLabel(membro.profile.posicao_principal)}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400">
                        Média: {(Object.values(notas).reduce((a, b) => a + b, 0) / SKILLS.length).toFixed(1)}
                      </span>
                      {aberto ? (
                        <ChevronUp size={18} className="text-gray-400" />
                      ) : (
                        <ChevronDown size={18} className="text-gray-400" />
                      )}
                    </div>
                  </button>

                  {/* Sliders */}
                  {aberto && (
                    <div className="px-4 pb-4 space-y-3 border-t border-gray-100 pt-3">
                      {SKILLS.map(({ key, label, emoji }) => (
                        <div key={key} className="flex items-center gap-3">
                          <span className="text-lg w-6">{emoji}</span>
                          <span className="text-sm font-medium text-gray-700 w-20">{label}</span>
                          <input
                            type="range"
                            min={1}
                            max={10}
                            value={notas[key] ?? 5}
                            onChange={(e) => setHabilidade(membro.profile_id, key, parseInt(e.target.value))}
                            className="flex-1"
                          />
                          <span className="text-sm font-bold text-verde-campo w-4">{notas[key] ?? 5}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}

            {error && (
              <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm">{error}</div>
            )}

            <button
              onClick={handleSubmit}
              disabled={saving}
              className="w-full bg-verde-campo text-white font-bold py-4 rounded-xl hover:bg-verde-escuro transition-colors disabled:opacity-60 mt-4"
            >
              {saving ? 'Enviando avaliações...' : 'Enviar avaliações'}
            </button>
          </div>
        )}
      </div>
    </Layout>
  )
}
