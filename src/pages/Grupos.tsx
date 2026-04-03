import { ChevronRight, Plus, Users, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import { Grupo } from '../types'

const FORMATOS = ['5x5', '7x7', '8x8', '11x11', 'Futsal', 'Society']

export default function Grupos() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [grupos, setGrupos] = useState<Grupo[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [novoNome, setNovoNome] = useState('')
  const [novaDesc, setNovaDesc] = useState('')
  const [novoFormato, setNovoFormato] = useState('7x7')

  useEffect(() => {
    fetchGrupos()
  }, [user])

  async function fetchGrupos() {
    if (!user) return
    try {
      setLoading(true)
      const { data } = await supabase
        .from('grupos')
        .select('*, grupos_membros!inner(profile_id)')
        .eq('grupos_membros.profile_id', user.id)
        .order('created_at', { ascending: false })

      setGrupos((data as Grupo[]) || [])
    } catch {
      setGrupos([])
    } finally {
      setLoading(false)
    }
  }

  async function handleCreateGrupo() {
    if (!user) return
    if (!novoNome.trim()) {
      setError('Nome do grupo é obrigatório.')
      return
    }
    setCreating(true)
    setError(null)
    try {
      const { data: grupo, error: grupoError } = await supabase
        .from('grupos')
        .insert({
          nome: novoNome.trim(),
          descricao: novaDesc.trim() || null,
          formato: novoFormato,
          criado_por: user.id,
        })
        .select()
        .single()

      if (grupoError) throw grupoError

      await supabase.from('grupos_membros').insert({
        grupo_id: grupo.id,
        profile_id: user.id,
        role: 'admin',
      })

      setShowModal(false)
      setNovoNome('')
      setNovaDesc('')
      setNovoFormato('7x7')
      navigate(`/grupos/${grupo.id}`)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao criar grupo.'
      setError(msg)
    } finally {
      setCreating(false)
    }
  }

  return (
    <Layout>
      {/* Header */}
      <div
        className="px-5 pt-12 pb-6 flex items-center justify-between"
        style={{ background: 'linear-gradient(160deg, #1D9E75, #085041)' }}
      >
        <div>
          <h1 className="text-white text-2xl font-bold">Meus grupos</h1>
          <p className="text-white/70 text-sm">{grupos.length} grupo{grupos.length !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white hover:bg-white/30 transition-colors"
        >
          <Plus size={22} />
        </button>
      </div>

      <div className="px-5 py-5">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-lg p-4 animate-pulse h-20" />
            ))}
          </div>
        ) : grupos.length > 0 ? (
          <div className="space-y-3">
            {grupos.map((grupo) => (
              <button
                key={grupo.id}
                onClick={() => navigate(`/grupos/${grupo.id}`)}
                className="w-full bg-white rounded-lg border border-gray-100 shadow-sm p-4 flex items-center gap-3 hover:shadow-md transition-shadow text-left"
              >
                <div className="w-12 h-12 rounded-xl bg-verde-claro flex items-center justify-center flex-shrink-0">
                  <Users size={22} className="text-verde-campo" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-gray-800 truncate">{grupo.nome}</p>
                  {grupo.descricao && (
                    <p className="text-gray-500 text-sm truncate">{grupo.descricao}</p>
                  )}
                  <span className="inline-block mt-1 text-xs font-semibold text-verde-campo bg-verde-claro px-2 py-0.5 rounded-full">
                    {grupo.formato}
                  </span>
                </div>
                <ChevronRight size={18} className="text-gray-400 flex-shrink-0" />
              </button>
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">👥</div>
            <h3 className="text-gray-700 font-semibold text-lg mb-2">Nenhum grupo ainda</h3>
            <p className="text-gray-400 text-sm mb-6">
              Crie um grupo para organizar as peladas com seus amigos!
            </p>
            <button
              onClick={() => setShowModal(true)}
              className="bg-verde-campo text-white font-semibold px-6 py-3 rounded-xl hover:bg-verde-escuro transition-colors"
            >
              Criar meu primeiro grupo
            </button>
          </div>
        )}
      </div>

      {/* Modal criar grupo */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50">
          <div className="w-full max-w-lg bg-white rounded-t-2xl p-6 animate-slide-up">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-bold text-gray-800">Criar grupo</h2>
              <button
                onClick={() => setShowModal(false)}
                className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Nome do grupo *
                </label>
                <input
                  type="text"
                  value={novoNome}
                  onChange={(e) => setNovoNome(e.target.value)}
                  placeholder="Ex: Pelada dos Amigos"
                  className="w-full border-2 border-gray-200 rounded-lg px-4 py-3 focus:outline-none focus:border-verde-campo transition-colors"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Descrição (opcional)
                </label>
                <input
                  type="text"
                  value={novaDesc}
                  onChange={(e) => setNovaDesc(e.target.value)}
                  placeholder="Ex: Toda quinta às 19h"
                  className="w-full border-2 border-gray-200 rounded-lg px-4 py-3 focus:outline-none focus:border-verde-campo transition-colors"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Formato padrão
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {FORMATOS.map((f) => (
                    <button
                      key={f}
                      onClick={() => setNovoFormato(f)}
                      className={`py-2.5 rounded-lg text-sm font-semibold border-2 transition-colors ${
                        novoFormato === f
                          ? 'border-verde-campo bg-verde-claro text-verde-campo'
                          : 'border-gray-200 text-gray-600 hover:border-gray-300'
                      }`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>

              {error && (
                <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm">{error}</div>
              )}

              <button
                onClick={handleCreateGrupo}
                disabled={creating}
                className="w-full bg-verde-campo text-white font-bold py-4 rounded-xl hover:bg-verde-escuro transition-colors disabled:opacity-60 text-base"
              >
                {creating ? 'Criando...' : 'Criar grupo'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}
