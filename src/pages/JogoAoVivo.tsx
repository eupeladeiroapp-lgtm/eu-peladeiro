import { ArrowLeft, CheckCircle, Clock, Minus, Plus } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Layout from '../components/Layout'
import { supabase } from '../lib/supabase'
import { Jogo, Partida, Time } from '../types'

export default function JogoAoVivo() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [jogo, setJogo] = useState<Jogo | null>(null)
  const [times, setTimes] = useState<Time[]>([])
  const [partida, setPartida] = useState<Partida | null>(null)
  const [golsA, setGolsA] = useState(0)
  const [golsB, setGolsB] = useState(0)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Timer
  const [tempo, setTempo] = useState(0)
  const [timerRunning, setTimerRunning] = useState(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    fetchData()
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [id])

  useEffect(() => {
    if (timerRunning) {
      timerRef.current = setInterval(() => setTempo((t) => t + 1), 1000)
    } else {
      if (timerRef.current) clearInterval(timerRef.current)
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [timerRunning])

  async function fetchData() {
    if (!id) return
    try {
      setLoading(true)

      const { data: jogoData } = await supabase.from('jogos').select('*').eq('id', id).single()
      setJogo(jogoData as Jogo)

      const { data: timesData } = await supabase
        .from('times')
        .select('*')
        .eq('jogo_id', id)
        .order('ordem_fila', { ascending: true })
      setTimes((timesData as Time[]) || [])

      const { data: partidaData } = await supabase
        .from('partidas')
        .select('*')
        .eq('jogo_id', id)
        .eq('status', 'em_andamento')
        .single()

      if (partidaData) {
        setPartida(partidaData as Partida)
        setGolsA(partidaData.gols_a)
        setGolsB(partidaData.gols_b)
        setTimerRunning(true)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  async function handleIniciarPartida() {
    if (!id || times.length < 2) return
    setSaving(true)
    try {
      const timeA = times.find((t) => t.status === 'jogando') || times[0]
      const timeB = times.filter((t) => t.id !== timeA.id).find((t) => t.status === 'jogando') || times[1]

      const { data: novaPartida, error } = await supabase
        .from('partidas')
        .insert({
          jogo_id: id,
          time_a: timeA.id,
          time_b: timeB.id,
          gols_a: 0,
          gols_b: 0,
          status: 'em_andamento',
          iniciada_em: new Date().toISOString(),
        })
        .select()
        .single()

      if (error) throw error
      setPartida(novaPartida as Partida)
      setGolsA(0)
      setGolsB(0)
      setTempo(0)
      setTimerRunning(true)

      await supabase.from('jogos').update({ status: 'em_andamento' }).eq('id', id)
    } catch (err) {
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  async function handleEncerrarPartida() {
    if (!partida || !id) return
    setSaving(true)
    try {
      await supabase
        .from('partidas')
        .update({
          gols_a: golsA,
          gols_b: golsB,
          status: 'encerrada',
          encerrada_em: new Date().toISOString(),
        })
        .eq('id', partida.id)

      setTimerRunning(false)
      setPartida(null)

      const timeVencedor = golsA > golsB ? partida.time_a : golsB > golsA ? partida.time_b : null
      const timePerdedor = golsA > golsB ? partida.time_b : golsB > golsA ? partida.time_a : null

      if (timePerdedor) {
        await supabase.from('times').update({ status: 'aguardando' }).eq('id', timePerdedor)
      }

      // Marca jogo como encerrado e notifica todos os jogadores
      await supabase.from('jogos').update({ status: 'encerrado' }).eq('id', id)

      const { data: confs } = await supabase
        .from('confirmacoes')
        .select('profile_id')
        .eq('jogo_id', id)
        .eq('status', 'confirmado')

      if (confs && confs.length > 0) {
        const notificacoes = confs.map((c) => ({
          profile_id: c.profile_id,
          tipo: 'partida_encerrada',
          jogo_id: id,
          lida: false,
        }))
        await supabase.from('notificacoes').insert(notificacoes)
      }

      fetchData()
    } catch (err) {
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  async function handleGol(equipe: 'a' | 'b') {
    if (!partida) return
    const newGolsA = equipe === 'a' ? golsA + 1 : golsA
    const newGolsB = equipe === 'b' ? golsB + 1 : golsB
    if (equipe === 'a') setGolsA(newGolsA)
    else setGolsB(newGolsB)

    await supabase
      .from('partidas')
      .update({ gols_a: newGolsA, gols_b: newGolsB })
      .eq('id', partida.id)
  }

  async function handleDesfazerGol(equipe: 'a' | 'b') {
    if (!partida) return
    const newGolsA = equipe === 'a' ? Math.max(0, golsA - 1) : golsA
    const newGolsB = equipe === 'b' ? Math.max(0, golsB - 1) : golsB
    if (equipe === 'a') setGolsA(newGolsA)
    else setGolsB(newGolsB)

    await supabase
      .from('partidas')
      .update({ gols_a: newGolsA, gols_b: newGolsB })
      .eq('id', partida.id)
  }

  function formatTempo(seconds: number) {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0')
    const s = (seconds % 60).toString().padStart(2, '0')
    return `${m}:${s}`
  }

  const timeAtual = partida
    ? [times.find((t) => t.id === partida.time_a), times.find((t) => t.id === partida.time_b)]
    : []

  const timesAguardando = times.filter((t) => t.status === 'aguardando')

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
        <h1 className="text-white text-2xl font-bold">Jogo ao vivo</h1>
        <p className="text-white/70 text-sm mt-0.5">{jogo?.formato} · {times.length} times</p>
      </div>

      <div className="px-5 py-5 space-y-5">
        {/* Partida atual */}
        {partida ? (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            {/* Timer */}
            <div className="bg-verde-campo py-3 flex items-center justify-center gap-3">
              <Clock size={18} className="text-white" />
              <span className="text-white font-mono font-bold text-2xl">{formatTempo(tempo)}</span>
              <button
                onClick={() => setTimerRunning((v) => !v)}
                className="text-white/70 hover:text-white text-xs border border-white/40 px-2 py-0.5 rounded"
              >
                {timerRunning ? 'Pausar' : 'Continuar'}
              </button>
            </div>

            {/* Placar */}
            <div className="p-4">
              <div className="grid grid-cols-3 gap-2 items-center">
                {/* Time A */}
                <div className="text-center">
                  <div
                    className="w-12 h-12 rounded-full mx-auto mb-2 flex items-center justify-center text-white font-bold text-lg"
                    style={{ backgroundColor: timeAtual[0]?.cor || '#1D9E75' }}
                  >
                    {timeAtual[0]?.nome?.[0] || 'A'}
                  </div>
                  <p className="font-semibold text-gray-700 text-sm truncate">{timeAtual[0]?.nome || 'Time A'}</p>
                  <p className="font-black text-4xl text-gray-800 mt-1">{golsA}</p>
                  <div className="flex justify-center gap-1 mt-2">
                    <button
                      onClick={() => handleDesfazerGol('a')}
                      className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200"
                    >
                      <Minus size={14} />
                    </button>
                    <button
                      onClick={() => handleGol('a')}
                      className="w-8 h-8 rounded-full bg-verde-campo flex items-center justify-center text-white hover:bg-verde-escuro"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                </div>

                {/* VS */}
                <div className="text-center">
                  <p className="text-gray-400 font-bold text-lg">VS</p>
                  <p className="text-xs text-gray-400 mt-1">ao vivo</p>
                  <div className="flex items-center justify-center gap-1 mt-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                    <span className="text-xs text-red-500 font-semibold">AO VIVO</span>
                  </div>
                </div>

                {/* Time B */}
                <div className="text-center">
                  <div
                    className="w-12 h-12 rounded-full mx-auto mb-2 flex items-center justify-center text-white font-bold text-lg"
                    style={{ backgroundColor: timeAtual[1]?.cor || '#EF4444' }}
                  >
                    {timeAtual[1]?.nome?.[0] || 'B'}
                  </div>
                  <p className="font-semibold text-gray-700 text-sm truncate">{timeAtual[1]?.nome || 'Time B'}</p>
                  <p className="font-black text-4xl text-gray-800 mt-1">{golsB}</p>
                  <div className="flex justify-center gap-1 mt-2">
                    <button
                      onClick={() => handleDesfazerGol('b')}
                      className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200"
                    >
                      <Minus size={14} />
                    </button>
                    <button
                      onClick={() => handleGol('b')}
                      className="w-8 h-8 rounded-full bg-red-500 flex items-center justify-center text-white hover:bg-red-600"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Gol buttons */}
              <div className="grid grid-cols-2 gap-3 mt-4">
                <button
                  onClick={() => handleGol('a')}
                  className="py-3.5 font-bold text-white rounded-xl text-sm hover:opacity-90 transition-opacity"
                  style={{ backgroundColor: timeAtual[0]?.cor || '#1D9E75' }}
                >
                  ⚽ Gol {timeAtual[0]?.nome || 'Time A'}
                </button>
                <button
                  onClick={() => handleGol('b')}
                  className="py-3.5 font-bold text-white rounded-xl text-sm hover:opacity-90 transition-opacity"
                  style={{ backgroundColor: timeAtual[1]?.cor || '#EF4444' }}
                >
                  ⚽ Gol {timeAtual[1]?.nome || 'Time B'}
                </button>
              </div>

              <button
                onClick={handleEncerrarPartida}
                disabled={saving}
                className="w-full mt-3 flex items-center justify-center gap-2 bg-gray-800 text-white font-bold py-3.5 rounded-xl hover:bg-gray-900 transition-colors disabled:opacity-60"
              >
                <CheckCircle size={18} />
                Encerrar partida
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 text-center">
            <div className="text-4xl mb-3">⚽</div>
            <p className="font-semibold text-gray-700 mb-4">Nenhuma partida em andamento</p>
            {times.length >= 2 ? (
              <button
                onClick={handleIniciarPartida}
                disabled={saving}
                className="bg-verde-campo text-white font-bold px-6 py-3.5 rounded-xl hover:bg-verde-escuro transition-colors disabled:opacity-60"
              >
                {saving ? 'Iniciando...' : 'Iniciar partida'}
              </button>
            ) : (
              <p className="text-gray-400 text-sm">
                É necessário ter times sorteados para iniciar uma partida.
              </p>
            )}
          </div>
        )}

        {/* Fila de times */}
        {times.length > 0 && (
          <div>
            <h2 className="font-bold text-gray-700 mb-3">Times na fila</h2>
            <div className="space-y-2">
              {times.map((time, idx) => (
                <div
                  key={time.id}
                  className="flex items-center gap-3 bg-white rounded-lg border border-gray-100 px-4 py-3"
                >
                  <div
                    className="w-4 h-4 rounded-full flex-shrink-0"
                    style={{ backgroundColor: time.cor }}
                  />
                  <span className="font-semibold text-gray-700 flex-1">{time.nome}</span>
                  <span
                    className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                      time.status === 'jogando'
                        ? 'bg-green-100 text-green-600'
                        : time.status === 'aguardando'
                        ? 'bg-yellow-100 text-yellow-600'
                        : 'bg-gray-100 text-gray-400'
                    }`}
                  >
                    {time.status === 'jogando' ? 'Jogando' : time.status === 'aguardando' ? `#${idx + 1} na fila` : 'Eliminado'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {jogo?.status === 'em_andamento' && (
          <button
            onClick={() => navigate(`/jogo/${id}/registro`)}
            className="w-full border-2 border-verde-campo text-verde-campo font-bold py-4 rounded-xl hover:bg-verde-claro transition-colors"
          >
            Registrar estatísticas
          </button>
        )}
      </div>
    </Layout>
  )
}
