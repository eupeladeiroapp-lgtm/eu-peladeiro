import { ArrowLeft, Save } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Layout from '../components/Layout'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import { Confirmacao, Estatistica, Profile } from '../types'

interface JogadorStats {
  profile: Profile
  gols: number
  assistencias: number
  defesas: number
  vitorias: number
}

function CounterInput({
  value,
  onChange,
  label,
}: {
  value: number
  onChange: (v: number) => void
  label: string
}) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <p className="text-xs text-gray-500 font-medium text-center leading-tight">{label}</p>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onChange(value - 1)}
          className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-gray-200 font-bold text-base"
        >
          −
        </button>
        <span className="font-bold text-lg w-6 text-center text-verde-campo">{value}</span>
        <button
          onClick={() => onChange(value + 1)}
          className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-gray-200 font-bold text-base"
        >
          +
        </button>
      </div>
    </div>
  )
}

export default function JogoRegistro() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [jogadores, setJogadores] = useState<JogadorStats[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchData()
  }, [id])

  async function fetchData() {
    if (!id) return
    try {
      setLoading(true)

      const { data: confsData } = await supabase
        .from('confirmacoes')
        .select('*, profile:profiles(*)')
        .eq('jogo_id', id)
        .eq('status', 'confirmado')

      const { data: statsData } = await supabase
        .from('estatisticas')
        .select('*')
        .eq('jogo_id', id)

      const jogadoresStats: JogadorStats[] = ((confsData as (Confirmacao & { profile: Profile })[]) || []).map(
        (conf) => {
          const stats = (statsData as Estatistica[])?.find((s) => s.profile_id === conf.profile_id)
          return {
            profile: conf.profile,
            gols: stats?.gols || 0,
            assistencias: stats?.assistencias || 0,
            defesas: stats?.defesas || 0,
            vitorias: (stats as any)?.vitorias || 0,
          }
        }
      )

      setJogadores(jogadoresStats)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  function updateJogador(profileId: string, field: keyof Omit<JogadorStats, 'profile'>, value: number) {
    setJogadores((prev) =>
      prev.map((j) =>
        j.profile.id === profileId ? { ...j, [field]: Math.max(0, value) } : j
      )
    )
  }

  async function handleSalvar() {
    if (!id || !user) return
    setSaving(true)
    setError(null)
    try {
      // Salva apenas as estatísticas do próprio usuário logado
      const minha = jogadores.find((j) => j.profile.id === user.id)
      if (!minha) {
        setError('Você não está na lista de confirmados neste jogo.')
        return
      }

      const { error: upsertError } = await supabase
        .from('estatisticas')
        .upsert(
          {
            jogo_id: id,
            profile_id: user.id,
            gols: minha.gols,
            assistencias: minha.assistencias,
            defesas: minha.defesas,
            vitorias: minha.vitorias,
          },
          { onConflict: 'jogo_id,profile_id' }
        )

      if (upsertError) {
        setError(`${upsertError.message} (${upsertError.code})`)
        return
      }
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err: unknown) {
      console.error('Erro ao salvar:', JSON.stringify(err))
      const msg = err instanceof Error ? err.message : 'Erro ao salvar estatísticas.'
      setError(msg)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Layout>
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
        <h1 className="text-white text-2xl font-bold">Registrar estatísticas</h1>
        <p className="text-white/70 text-sm mt-0.5">{jogadores.length} jogadores confirmados</p>
      </div>

      <div className="px-5 py-5">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-xl p-4 animate-pulse h-28" />
            ))}
          </div>
        ) : jogadores.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <p className="text-4xl mb-2">👥</p>
            <p className="font-medium">Nenhum jogador confirmado</p>
          </div>
        ) : (
          <div className="space-y-4">
            {jogadores.map((j) => (
              <div key={j.profile.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                {/* Jogador info */}
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full overflow-hidden bg-verde-campo flex items-center justify-center flex-shrink-0">
                    {j.profile.foto_url ? (
                      <img src={j.profile.foto_url} alt={j.profile.nome} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-white font-bold">{j.profile.nome[0].toUpperCase()}</span>
                    )}
                  </div>
                  <div>
                    <p className="font-bold text-gray-800">{j.profile.nome}</p>
                    {j.profile.posicao_principal && (
                      <p className="text-xs text-gray-500">{j.profile.posicao_principal}</p>
                    )}
                  </div>
                </div>

                {/* Stats — linha 1 */}
                <div className="grid grid-cols-3 gap-2 mb-3">
                  <CounterInput
                    value={j.gols}
                    onChange={(v) => updateJogador(j.profile.id, 'gols', v)}
                    label="⚽ Gols"
                  />
                  <CounterInput
                    value={j.assistencias}
                    onChange={(v) => updateJogador(j.profile.id, 'assistencias', v)}
                    label="👟 Assist."
                  />
                  <CounterInput
                    value={j.vitorias}
                    onChange={(v) => updateJogador(j.profile.id, 'vitorias', v)}
                    label="🏆 Vitórias"
                  />
                </div>

                {/* Stats — linha 2 */}
                <div className="grid grid-cols-3 gap-2">
                  <CounterInput
                    value={j.defesas}
                    onChange={(v) => updateJogador(j.profile.id, 'defesas', v)}
                    label="🧤 Defesas"
                  />
                </div>
              </div>
            ))}

            {error && (
              <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm">{error}</div>
            )}

            {saved && (
              <div className="p-3 bg-verde-claro text-verde-escuro rounded-lg text-sm font-semibold text-center">
                ✅ Estatísticas salvas com sucesso!
              </div>
            )}

            <button
              onClick={handleSalvar}
              disabled={saving}
              className="w-full flex items-center justify-center gap-2 bg-verde-campo text-white font-bold py-4 rounded-xl hover:bg-verde-escuro transition-colors disabled:opacity-60"
            >
              <Save size={18} />
              {saving ? 'Salvando...' : 'Salvar estatísticas'}
            </button>
          </div>
        )}
      </div>
    </Layout>
  )
}
