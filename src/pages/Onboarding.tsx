import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import CampoFutebol from '../components/CampoFutebol'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'

const SKILLS = [
  { key: 'chute', label: 'Chute', emoji: '🦵' },
  { key: 'drible', label: 'Drible', emoji: '⚡' },
  { key: 'passe', label: 'Passe', emoji: '🎯' },
  { key: 'defesa', label: 'Defesa', emoji: '🛡️' },
  { key: 'forca', label: 'Força', emoji: '💪' },
  { key: 'velocidade', label: 'Velocidade', emoji: '🏃' },
]

export default function Onboarding() {
  const { user, refetchProfile } = useAuth()
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [nome, setNome] = useState(
    user?.user_metadata?.full_name || user?.user_metadata?.name || ''
  )
  const [fotoUrl] = useState<string | null>(user?.user_metadata?.avatar_url || null)

  const [posicoes, setPosicoes] = useState<Record<string, 'principal' | 'secundaria'>>({})

  const [habilidades, setHabilidades] = useState({
    chute: 5,
    drible: 5,
    passe: 5,
    defesa: 5,
    forca: 5,
    velocidade: 5,
  })

  function handleTogglePosicao(pos: string) {
    setPosicoes((prev) => {
      const current = prev[pos]
      if (!current) return { ...prev, [pos]: 'secundaria' }
      if (current === 'secundaria') return { ...prev, [pos]: 'principal' }
      const next = { ...prev }
      delete next[pos]
      return next
    })
  }

  function getPosPrincipal(): string | null {
    const entry = Object.entries(posicoes).find(([, v]) => v === 'principal')
    return entry ? entry[0] : null
  }

  function getPosSecundarias(): string[] {
    return Object.entries(posicoes)
      .filter(([, v]) => v === 'secundaria')
      .map(([k]) => k)
  }

  async function handleFinish() {
    if (!user) return
    if (!nome.trim()) {
      setError('Por favor, informe seu nome.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const { error: upsertError } = await supabase.from('profiles').upsert({
        id: user.id,
        nome: nome.trim(),
        foto_url: fotoUrl,
        posicao_principal: getPosPrincipal(),
        posicoes_secundarias: getPosSecundarias(),
        habilidades,
        created_at: new Date().toISOString(),
      })
      if (upsertError) throw upsertError
      await refetchProfile()
      const pendingGroup = localStorage.getItem('pendingGroupInvite')
      if (pendingGroup) {
        navigate(`/grupo/convite/${pendingGroup}`, { replace: true })
      } else {
        navigate('/', { replace: true })
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao salvar perfil.'
      setError(msg)
    } finally {
      setSaving(false)
    }
  }

  const totalSteps = 3
  const progress = (step / totalSteps) * 100

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <div className="px-6 pt-12 pb-4" style={{ background: 'linear-gradient(160deg, #1D9E75, #085041)' }}>
        <h2 className="text-white text-sm font-medium mb-1">Configurando seu perfil</h2>
        <h1 className="text-white text-2xl font-bold mb-4">
          {step === 1 && 'Quem é você?'}
          {step === 2 && 'Qual sua posição?'}
          {step === 3 && 'Suas habilidades'}
        </h1>
        {/* Progress bar */}
        <div className="h-1.5 bg-white/30 rounded-full overflow-hidden">
          <div
            className="h-full bg-white rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-white/70 text-xs mt-1">Passo {step} de {totalSteps}</p>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        {/* Step 1: Name */}
        {step === 1 && (
          <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col items-center gap-4">
              <div className="relative">
                <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-verde-claro bg-gray-100">
                  {fotoUrl ? (
                    <img src={fotoUrl} alt="Foto" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-verde-campo">
                      <span className="text-white text-3xl font-bold">
                        {nome ? nome[0].toUpperCase() : '?'}
                      </span>
                    </div>
                  )}
                </div>
                <button className="absolute bottom-0 right-0 w-8 h-8 bg-verde-campo text-white rounded-full flex items-center justify-center shadow-lg hover:bg-verde-escuro transition-colors text-lg">
                  +
                </button>
              </div>
              <p className="text-sm text-gray-500">Sua foto do Google foi importada automaticamente</p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Como você quer ser chamado?
              </label>
              <input
                type="text"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Seu apelido ou nome"
                className="w-full border-2 border-gray-200 rounded-lg px-4 py-3 text-base focus:outline-none focus:border-verde-campo transition-colors"
                autoFocus
              />
              <p className="text-xs text-gray-400 mt-1">
                Esse nome aparecerá para os seus companheiros de pelada
              </p>
            </div>
          </div>
        )}

        {/* Step 2: Position */}
        {step === 2 && (
          <div className="animate-fade-in">
            <p className="text-gray-600 text-sm mb-4">
              Toque na posição para selecionar. Toque duas vezes para marcar como <strong>posição principal</strong>.
            </p>
            <CampoFutebol selected={posicoes} onToggle={handleTogglePosicao} />

            {Object.keys(posicoes).length > 0 && (
              <div className="mt-4 p-3 bg-verde-claro rounded-lg">
                <p className="text-xs font-semibold text-verde-escuro mb-1">Selecionadas:</p>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(posicoes).map(([pos, tipo]) => (
                    <span
                      key={pos}
                      className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                        tipo === 'principal'
                          ? 'bg-verde-campo text-white border-2 border-dourado'
                          : 'bg-verde-campo/20 text-verde-escuro'
                      }`}
                    >
                      {tipo === 'principal' ? `★ ${pos}` : pos}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 3: Skills */}
        {step === 3 && (
          <div className="animate-fade-in space-y-5">
            <p className="text-gray-600 text-sm">
              Seja honesto! Essas notas ajudam a montar times equilibrados. Você pode ajustá-las depois.
            </p>
            {SKILLS.map(({ key, label, emoji }) => {
              const value = habilidades[key as keyof typeof habilidades]
              return (
                <div key={key}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span>{emoji}</span>
                      <span className="font-semibold text-gray-700 text-sm">{label}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex gap-0.5">
                        {[...Array(10)].map((_, i) => (
                          <div
                            key={i}
                            className={`w-2 h-2 rounded-full ${
                              i < value ? 'bg-verde-campo' : 'bg-gray-200'
                            }`}
                          />
                        ))}
                      </div>
                      <span className="text-verde-campo font-bold w-4 text-sm">{value}</span>
                    </div>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={10}
                    value={value}
                    onChange={(e) =>
                      setHabilidades((prev) => ({
                        ...prev,
                        [key]: parseInt(e.target.value),
                      }))
                    }
                    className="w-full"
                  />
                </div>
              )
            })}
          </div>
        )}

        {error && (
          <div className="mt-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm">{error}</div>
        )}
      </div>

      {/* Footer buttons */}
      <div className="px-6 py-4 border-t border-gray-100 flex gap-3 bg-white">
        {step > 1 && (
          <button
            onClick={() => setStep((s) => s - 1)}
            className="flex-1 py-3.5 border-2 border-gray-200 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-colors"
          >
            Voltar
          </button>
        )}
        {step < totalSteps ? (
          <button
            onClick={() => {
              if (step === 1 && !nome.trim()) {
                setError('Por favor, informe seu nome.')
                return
              }
              setError(null)
              setStep((s) => s + 1)
            }}
            className="flex-1 py-3.5 bg-verde-campo text-white font-semibold rounded-xl hover:bg-verde-escuro transition-colors"
          >
            Continuar
          </button>
        ) : (
          <button
            onClick={handleFinish}
            disabled={saving}
            className="flex-1 py-3.5 bg-verde-campo text-white font-bold rounded-xl hover:bg-verde-escuro transition-colors disabled:opacity-60 text-base"
          >
            {saving ? 'Salvando...' : 'Entrar na pelada! ⚽'}
          </button>
        )}
      </div>
    </div>
  )
}
