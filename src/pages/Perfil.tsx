import { Camera, ChevronRight, Edit3, Info, LogOut } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import { useNavigate } from 'react-router-dom'
import CampoFutebol from '../components/CampoFutebol'
import Layout from '../components/Layout'
import { useAuth } from '../hooks/useAuth'
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
  const { user, signOut, profile, refetchProfile } = useAuth()
  const [stats, setStats] = useState({ jogos: 0, gols: 0, assistencias: 0, defesas: 0 })
  const [editing, setEditing] = useState(false)
  const [editNome, setEditNome] = useState('')
  const [saving, setSaving] = useState(false)
  const [editandoHabilidades, setEditandoHabilidades] = useState(false)
  const [habilidadesEdit, setHabilidadesEdit] = useState<Record<string, number>>({})
  const [posicoesEdit, setPosicoesEdit] = useState<Record<string, 'principal' | 'secundaria'>>({})
  const [savingHabilidades, setSavingHabilidades] = useState(false)
  const [habilidadesMedia, setHabilidadesMedia] = useState<Record<string, number>>({})
  const [uploadingFoto, setUploadingFoto] = useState(false)
  const [erroFoto, setErroFoto] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetchStats()
    if (user) fetchHabilidadesMedia()
  }, [user])

  useEffect(() => {
    if (profile) {
      setEditNome(profile.nome)
      setHabilidadesEdit({
        chute: profile.habilidades?.chute ?? 5,
        drible: profile.habilidades?.drible ?? 5,
        passe: profile.habilidades?.passe ?? 5,
        defesa: profile.habilidades?.defesa ?? 5,
        forca: profile.habilidades?.forca ?? 5,
        velocidade: profile.habilidades?.velocidade ?? 5,
      })
      setPosicoesEdit(
        Object.fromEntries([
          ...(profile.posicao_principal ? [[profile.posicao_principal, 'principal' as const]] : []),
          ...(profile.posicoes_secundarias || []).map((p) => [p, 'secundaria' as const]),
        ])
      )
    }
  }, [profile])

  async function fetchHabilidadesMedia() {
    if (!user) return
    const skills = ['chute', 'drible', 'passe', 'defesa', 'forca', 'velocidade']
    const { data } = await supabase
      .from('avaliacoes')
      .select('habilidades')
      .eq('avaliado_id', user.id)

    const avaliacoes = (data || []).map((a) => a.habilidades as Record<string, number>)
    if (avaliacoes.length === 0) return

    const media: Record<string, number> = {}
    for (const skill of skills) {
      const auto = profile?.habilidades?.[skill as keyof typeof profile.habilidades] ?? 5
      const notas = [...avaliacoes.map((a) => a[skill] ?? 5), auto]
      media[skill] = Math.round((notas.reduce((a, b) => a + b, 0) / notas.length) * 10) / 10
    }
    setHabilidadesMedia(media)
  }

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
      await refetchProfile()
      setEditing(false)
      toast.success('Nome atualizado!')
    } catch (err) {
      console.error(err)
      toast.error('Erro ao salvar nome.')
    } finally {
      setSaving(false)
    }
  }

  function handleTogglePosicao(pos: string) {
    setPosicoesEdit((prev) => {
      const current = prev[pos]
      if (!current) return { ...prev, [pos]: 'secundaria' }
      if (current === 'secundaria') {
        // Promote to principal, demote previous principal to secundaria
        const updated: Record<string, 'principal' | 'secundaria'> = {}
        for (const [k, v] of Object.entries(prev)) {
          updated[k] = k === pos ? 'principal' : v === 'principal' ? 'secundaria' : v
        }
        updated[pos] = 'principal'
        return updated
      }
      // Remove (was principal)
      const updated = { ...prev }
      delete updated[pos]
      return updated
    })
  }

  async function handleSaveHabilidades() {
    if (!user) return
    setSavingHabilidades(true)
    try {
      const posicao_principal = Object.entries(posicoesEdit).find(([, v]) => v === 'principal')?.[0] ?? null
      const posicoes_secundarias = Object.entries(posicoesEdit).filter(([, v]) => v === 'secundaria').map(([k]) => k)
      await supabase
        .from('profiles')
        .update({ habilidades: habilidadesEdit, posicao_principal, posicoes_secundarias })
        .eq('id', user.id)
      await refetchProfile()
      setEditandoHabilidades(false)
      toast.success('Habilidades salvas!')
    } catch (err) {
      console.error(err)
      toast.error('Erro ao salvar habilidades.')
    } finally {
      setSavingHabilidades(false)
    }
  }

  async function handleFotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !user) return
    setUploadingFoto(true)
    setErroFoto(null)
    try {
      const ext = file.name.split('.').pop() || 'jpg'
      const path = `${user.id}/avatar.${ext}`
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, file, { upsert: true, contentType: file.type })
      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path)
      const urlComCache = `${publicUrl}?t=${Date.now()}`
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ foto_url: urlComCache })
        .eq('id', user.id)
      if (updateError) throw updateError
      await refetchProfile()
      toast.success('Foto atualizada!')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao fazer upload da foto.'
      setErroFoto(msg)
      toast.error(msg)
      console.error(err)
    } finally {
      setUploadingFoto(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
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
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploadingFoto}
          className="relative w-24 h-24 rounded-full mx-auto mb-3 block overflow-hidden border-4 border-white/30 group"
        >
          {profile?.foto_url ? (
            <img src={profile.foto_url} alt={profile.nome} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-white/20 flex items-center justify-center">
              <span className="text-white font-bold text-3xl">
                {profile?.nome?.[0]?.toUpperCase() || '?'}
              </span>
            </div>
          )}
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            {uploadingFoto ? (
              <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Camera size={22} className="text-white" />
            )}
          </div>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFotoUpload}
        />

        {erroFoto && (
          <p className="text-red-300 text-xs mt-2">{erroFoto}</p>
        )}

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
          <div className="flex items-center justify-center gap-2 flex-wrap">
            <h1 className="text-white text-2xl font-bold">{profile?.nome || 'Peladeiro'}</h1>
            {profile?.is_pro && (
              <span className="inline-flex items-center gap-1 bg-yellow-400 text-yellow-900 text-xs font-black px-2 py-0.5 rounded-full uppercase tracking-wide">
                PRO
              </span>
            )}
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
      {profile && (
        <div className="px-5 mt-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-gray-700">Habilidades</h2>
            <button
              onClick={() => setEditandoHabilidades((v) => !v)}
              className="text-sm font-semibold text-verde-campo hover:text-verde-escuro transition-colors"
            >
              {editandoHabilidades ? 'Cancelar' : 'Editar habilidades'}
            </button>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 space-y-3">
            {SKILLS.map(({ key, label, emoji }) => {
              const autoValor = profile.habilidades?.[key as keyof typeof profile.habilidades] ?? 5
              const mediaValor = habilidadesMedia[key] ?? autoValor
              const value = editandoHabilidades ? (habilidadesEdit[key] ?? 5) : mediaValor
              const temAvaliacao = Object.keys(habilidadesMedia).length > 0
              return (
                <div key={key}>
                  <div className="flex items-center gap-3">
                    <span className="text-lg w-6">{emoji}</span>
                    <span className="text-sm font-medium text-gray-700 w-20">{label}</span>
                    {editandoHabilidades ? (
                      <>
                        <input
                          type="range"
                          min={1}
                          max={10}
                          value={habilidadesEdit[key] ?? 5}
                          onChange={(e) =>
                            setHabilidadesEdit((prev) => ({ ...prev, [key]: parseInt(e.target.value) }))
                          }
                          className="flex-1"
                        />
                        <span className="text-sm font-bold text-verde-campo w-4">{habilidadesEdit[key] ?? 5}</span>
                      </>
                    ) : (
                      <>
                        <div className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-verde-campo rounded-full transition-all duration-500"
                            style={{ width: `${value * 10}%` }}
                          />
                        </div>
                        <span className="text-sm font-bold text-verde-campo w-6 text-right">{value}</span>
                      </>
                    )}
                  </div>
                  {!editandoHabilidades && temAvaliacao && mediaValor !== autoValor && (
                    <p className="text-xs text-gray-400 ml-8 mt-0.5">
                      Sua nota: {autoValor} · Média do grupo: {mediaValor}
                    </p>
                  )}
                </div>
              )
            })}
            {editandoHabilidades && (
              <button
                onClick={handleSaveHabilidades}
                disabled={savingHabilidades}
                className="w-full bg-verde-campo text-white font-bold py-3 rounded-xl hover:bg-verde-escuro transition-colors disabled:opacity-60 mt-2"
              >
                {savingHabilidades ? 'Salvando...' : 'Salvar habilidades'}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Posições */}
      {(Object.keys(posicoes).length > 0 || editandoHabilidades) && (
        <div className="px-5 mt-5">
          <h2 className="font-bold text-gray-700 mb-3">Posições</h2>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <CampoFutebol
              selected={editandoHabilidades ? posicoesEdit : posicoes}
              onToggle={editandoHabilidades ? handleTogglePosicao : () => {}}
            />
          </div>
        </div>
      )}

      {/* Menu */}
      <div className="px-5 mt-5 mb-5 space-y-2">
        <a
          href="https://www.instagram.com/eupeladeiro?igsh=b3FydjF4aG1zN3Rl"
          target="_blank"
          rel="noopener noreferrer"
          className="w-full flex items-center gap-3 bg-white border border-gray-100 rounded-xl p-4 hover:bg-gray-50 transition-colors"
        >
          <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
          </div>
          <span className="font-semibold text-gray-700 flex-1 text-left">Siga no Instagram</span>
          <ChevronRight size={16} className="text-gray-400" />
        </a>

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
