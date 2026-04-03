import { ChevronRight, Edit3, Info, LogOut } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import CampoFutebol from '../components/CampoFutebol'
import Layout from '../components/Layout'
import { useAuth } from '../hooks/useAuth'
import { useProfile } from '../hooks/useProfile'
import { supabase } from '../lib/supabase'
import { Estatistica } from '../types'

const SKILLS = [
  { key: 'chute', label: 'Chute', emoji: '🦵' },
  { key: 'drible', label: 'Drible', emoji: '⚡' },
  { key: 'passe', label: 'Passe', emoji: '🎯' },
  { key: 'defesa', label: 'Defesa', emoji: '🛡️' },
  { key: 'forca', label: 'Força', emoji: '💪' },
  { key: 'velocidade', label: 'Velocidade', emoji: '🏃' },
]

export default function Perfil() {
  const navigate = useNavigate()
  const { user, signOut } = useAuth()
  const { profile, refetch } = useProfile()
  const [stats, setStats] = useState({ jogos: 0, gols: 0, assistencias: 0, defesas: 0 })
  const [editing, setEditing] = useState(false)
  const [editNome, setEditNome] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchStats()
  }, [user])

  useEffect(() => {
    if (profile) setEditNome(profile.nome)
  }, [profile])

  async function fetchStats() {
    if (!user) return
    try {
      const { data } = await supabase
        .from('estatisticas')
        .select('*')
        .eq('profile_id', user.id)
        .gte('created_at', new Date(new Date().getFullYear(), 0, 1).toISOString())

      if (data) {
        const s = (data as Estatistica[]).reduce(
          (acc, e) => ({
            jogos: acc.jogos + 1,
            gols: acc.gols + e.gols,
            assistencias: acc.assistencias + e.assistencias,
            defesas: acc.defesas + e.defesas,
          }),
          { jogos: 0, gols: 0, assistencias: 0, defesas: 0 }
        )
        setStats(s)
      }
    } catch {
      /* ignore */
    }
  }

  async function handleSaveNome() {
    if (!user || !editNome.trim()) return
    setSaving(true)
    try {
      await supabase.from('profiles').update({ nome: editNome.trim() }).eq('id', user.id)
      await refetch()
      setEditing(false)
    } catch (err) {
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  async function handleSignOut() {
    await signOut()
    navigate('/login', { replace: true })
  }

  const posicoes = profile
    ? Object.fromEntries([
        ...(profile.posicao_principal ? [[profile.posicao_principal, 'principal' as const]] : []),
        ...(profile.posicoes_secundarias || []).map((p) => [p, 'secundaria' as const]),
      ])
    : {}

  return (
    <Layout>
      {/* Header */}
      <div
        className="px-5 pt-12 pb-8 text-center"
        style={{ background: 'linear-gradient(160deg, #1D9E75, #085041)' }}
      >
        <div className="relative inline-block mb-3">
          <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-white/30 mx-auto">
            {profile?.foto_url ? (
              <img src={profile.foto_url} alt={profile.nome} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-white/20 flex items-center justify-center">
                <span className="text-white font-bold text-3xl">
                  {profile?.nome?.[0]?.toUpperCase() || '?'}
                </span>
              </div>
            )}
          </div>
        </div>

        {editing ? (
          <div className="flex items-center gap-2 max-w-xs mx-auto">
            <input
              type="text"
              value={editNome}
              onChange={(e) => setEditNome(e.target.value)}
              className="flex-1 bg-white/20 text-white placeholder-white/60 border border-white/40 rounded-lg px-3 py-2 text-center font-bold focus:outline-none focus:border-white"
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && handleSaveNome()}
            />
            <button
              onClick={handleSaveNome}
              disabled={saving}
              className="px-3 py-2 bg-white text-verde-campo font-semibold rounded-lg text-sm"
            >
              {saving ? '...' : 'Salvar'}
            </button>
            <button
              onClick={() => setEditing(false)}
              className="px-3 py-2 bg-white/20 text-white rounded-lg text-sm"
            >
              ✕
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-center gap-2">
            <h1 className="text-white text-2xl font-bold">{profile?.nome || 'Peladeiro'}</h1>
            <button
              onClick={() => setEditing(true)}
              className="text-white/60 hover:text-white transition-colors"
            >
              <Edit3 size={16} />
            </button>
          </div>
        )}

        {profile?.posicao_principal && (
          <p className="text-white/70 text-sm mt-1">
            Posição: <span className="font-semibold text-white">{profile.posicao_principal}</span>
          </p>
        )}
      </div>

      {/* Stats da temporada */}
      <div className="px-5 -mt-4">
        <div className="bg-white rounded-xl shadow-md border border-gray-100 p-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Estatísticas da temporada
          </p>
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: 'Jogos', value: stats.jogos, emoji: '⚽' },
              { label: 'Gols', value: stats.gols, emoji: '🥅' },
              { label: 'Assist.', value: stats.assistencias, emoji: '🎯' },
              { label: 'Defesas', value: stats.defesas, emoji: '🛡️' },
            ].map(({ label, value, emoji }) => (
              <div key={label} className="text-center">
                <p className="text-xl">{emoji}</p>
                <p className="font-black text-2xl text-gray-800">{value}</p>
                <p className="text-xs text-gray-500 font-medium">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Habilidades */}
      {profile?.habilidades && (
        <div className="px-5 mt-5">
          <h2 className="font-bold text-gray-700 mb-3">Habilidades</h2>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 space-y-3">
            {SKILLS.map(({ key, label, emoji }) => {
              const value = profile.habilidades[key as keyof typeof profile.habilidades] || 5
              return (
                <div key={key} className="flex items-center gap-3">
                  <span className="text-lg w-6">{emoji}</span>
                  <span className="text-sm font-medium text-gray-700 w-20">{label}</span>
                  <div className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-verde-campo rounded-full transition-all duration-500"
                      style={{ width: `${value * 10}%` }}
                    />
                  </div>
                  <span className="text-sm font-bold text-verde-campo w-4">{value}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Posições */}
      {Object.keys(posicoes).length > 0 && (
        <div className="px-5 mt-5">
          <h2 className="font-bold text-gray-700 mb-3">Posições</h2>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <CampoFutebol selected={posicoes} onToggle={() => {}} />
          </div>
        </div>
      )}

      {/* Menu */}
      <div className="px-5 mt-5 mb-5 space-y-2">
        <button
          onClick={() => navigate('/sobre')}
          className="w-full flex items-center gap-3 bg-white border border-gray-100 rounded-xl p-4 hover:bg-gray-50 transition-colors"
        >
          <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
            <Info size={18} className="text-blue-500" />
          </div>
          <span className="font-semibold text-gray-700 flex-1 text-left">Sobre o Eu Peladeiro</span>
          <ChevronRight size={16} className="text-gray-400" />
        </button>

        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-3 bg-red-50 border border-red-100 rounded-xl p-4 hover:bg-red-100 transition-colors"
        >
          <div className="w-9 h-9 rounded-lg bg-red-100 flex items-center justify-center">
            <LogOut size={18} className="text-red-500" />
          </div>
          <span className="font-semibold text-red-600 flex-1 text-left">Sair da conta</span>
        </button>
      </div>
    </Layout>
  )
}
