import { ArrowLeft, CheckCircle, RefreshCw, Shuffle, Users } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Layout from '../components/Layout'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import { Confirmacao, Jogo, Profile } from '../types'
import { CORES_TIMES, Jogador, ResultadoSorteio, calcularMediaTime, sortearTimes } from '../utils/sorteio'
import { getPosicaoCor, getPosicaoLabel } from '../utils/posicoes'

export default function JogoTimes() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [jogo, setJogo] = useState<Jogo | null>(null)
  const [jogadores, setJogadores] = useState<Jogador[]>([])
  const [resultado, setResultado] = useState<ResultadoSorteio>({ times: [], goleiroFixo: false, reservas: [] })
  const [loading, setLoading] = useState(true)
  const [confirmando, setConfirmando] = useState(false)
  const [configStep, setConfigStep] = useState(true)
  const [numTimesConfig, setNumTimesConfig] = useState(2)
  const [jogadoresPorTime, setJogadoresPorTime] = useState(5)

  useEffect(() => {
    fetchData()
  }, [id])

  async function fetchData() {
    if (!id) return
    try {
      setLoading(true)

      const { data: jogoData } = await supabase
        .from('jogos')
        .select('*')
        .eq('id', id)
        .single()
      setJogo(jogoData as Jogo)

      if (jogoData) {
        const { data: confsData } = await supabase
          .from('confirmacoes')
          .select('*, profile:profiles(*)')
          .eq('jogo_id', id)
          .eq('status', 'confirmado')

        const jogadoresData: Jogador[] = ((confsData as (Confirmacao & { profile: Profile })[]) || []).map(
          (conf) => ({
            id: conf.profile.id,
            nome: conf.profile.nome,
            foto_url: conf.profile.foto_url,
            posicao_principal: conf.profile.posicao_principal,
            posicoes_secundarias: conf.profile.posicoes_secundarias || [],
            nivel:
              conf.profile.habilidades
                ? Object.values(conf.profile.habilidades).reduce((a: number, b) => a + (b as number), 0) /
                  Object.values(conf.profile.habilidades).length
                : 5,
          })
        )

        setJogadores(jogadoresData)

        // Set smart defaults for config
        const defaultNumTimes = jogoData.num_times || 2
        const defaultPorTime = jogadoresData.length > 0
          ? Math.round(jogadoresData.length / defaultNumTimes)
          : 5
        setNumTimesConfig(defaultNumTimes)
        setJogadoresPorTime(Math.max(1, defaultPorTime))
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  function handleSortear() {
    if (jogadores.length === 0) return
    const shuffled = [...jogadores].sort(() => Math.random() - 0.5)
    setResultado(sortearTimes(shuffled, numTimesConfig, jogadoresPorTime))
    setConfigStep(false)
  }

  function handleSortearNovamente() {
    if (jogadores.length === 0) return
    const shuffled = [...jogadores].sort(() => Math.random() - 0.5)
    setResultado(sortearTimes(shuffled, numTimesConfig, jogadoresPorTime))
  }

  function handleVoltarConfig() {
    setConfigStep(true)
  }

  async function handleConfirmarSorteio() {
    if (!id || resultado.times.length === 0) return
    setConfirmando(true)
    try {
      // Remove times anteriores deste jogo
      await supabase.from('time_jogadores').delete().in(
        'time_id',
        (await supabase.from('times').select('id').eq('jogo_id', id)).data?.map((t) => t.id) || []
      )
      await supabase.from('times').delete().eq('jogo_id', id)

      // Salva os novos times
      for (let idx = 0; idx < resultado.times.length; idx++) {
        const corConfig = CORES_TIMES[idx % CORES_TIMES.length]
        const { data: timeData } = await supabase
          .from('times')
          .insert({
            jogo_id: id,
            nome: `Time ${corConfig.nome}`,
            cor: corConfig.cor,
            ordem_fila: idx,
            status: idx < 2 ? 'jogando' : 'aguardando',
          })
          .select()
          .single()

        if (timeData) {
          const timeJogadores = resultado.times[idx].map((j) => ({
            time_id: timeData.id,
            profile_id: j.id,
            posicao_alocada: j.posicao_principal,
          }))
          await supabase.from('time_jogadores').insert(timeJogadores)
        }
      }

      // Atualiza status do jogo
      await supabase.from('jogos').update({ status: 'em_andamento' }).eq('id', id)

      // Remove notificações antigas de times_sorteados para este jogo e recria
      await supabase.from('notificacoes').delete().eq('jogo_id', id).eq('tipo', 'times_sorteados')
      const jogadoresSorteados = resultado.times.flat()
      const notificacoes = jogadoresSorteados.map((j) => ({
        profile_id: j.id,
        tipo: 'times_sorteados',
        jogo_id: id,
        lida: false,
      }))
      await supabase.from('notificacoes').insert(notificacoes)

      navigate(`/jogo/${id}/registro`)
    } catch (err) {
      console.error(err)
    } finally {
      setConfirmando(false)
    }
  }

  const { times, goleiroFixo, reservas } = resultado
  const isCreator = user?.id === jogo?.criado_por

  // Config calculations
  const timesCompletos = jogadoresPorTime > 0 ? Math.floor(jogadores.length / jogadoresPorTime) : 0
  const jogadoresNecessarios = numTimesConfig * jogadoresPorTime
  const sobram = jogadores.length - jogadoresNecessarios
  const faltam = jogadoresNecessarios - jogadores.length
  const temQuorum = jogadores.length >= jogadoresNecessarios

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-20">
          <div className="w-10 h-10 border-4 border-verde-campo border-t-transparent rounded-full animate-spin" />
        </div>
      </Layout>
    )
  }

  // Config step (only for creator, before drawing)
  if (configStep && isCreator) {
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
          <h1 className="text-white text-2xl font-bold">Configurar sorteio</h1>
          <p className="text-white/70 text-sm mt-0.5">
            {jogadores.length} jogadores confirmados
          </p>
        </div>

        <div className="px-5 py-5 space-y-5">
          {jogadores.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-5xl mb-4">👥</div>
              <h3 className="font-semibold text-gray-700 mb-2">Nenhum jogador confirmado</h3>
              <p className="text-gray-400 text-sm">
                Aguarde os jogadores confirmarem presença para sortear os times.
              </p>
            </div>
          ) : (
            <>
              {/* Quantos times */}
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                <p className="text-sm font-semibold text-gray-700 mb-3">Quantos times?</p>
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => setNumTimesConfig(v => Math.max(2, v - 1))}
                    className="w-10 h-10 rounded-full border-2 border-gray-200 flex items-center justify-center text-gray-600 text-xl font-bold hover:border-verde-campo hover:text-verde-campo transition-colors"
                  >
                    −
                  </button>
                  <span className="text-3xl font-bold text-gray-800 w-8 text-center">{numTimesConfig}</span>
                  <button
                    onClick={() => setNumTimesConfig(v => Math.min(8, v + 1))}
                    className="w-10 h-10 rounded-full border-2 border-gray-200 flex items-center justify-center text-gray-600 text-xl font-bold hover:border-verde-campo hover:text-verde-campo transition-colors"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Jogadores por time */}
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                <p className="text-sm font-semibold text-gray-700 mb-3">Jogadores por time?</p>
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => setJogadoresPorTime(v => Math.max(1, v - 1))}
                    className="w-10 h-10 rounded-full border-2 border-gray-200 flex items-center justify-center text-gray-600 text-xl font-bold hover:border-verde-campo hover:text-verde-campo transition-colors"
                  >
                    −
                  </button>
                  <span className="text-3xl font-bold text-gray-800 w-8 text-center">{jogadoresPorTime}</span>
                  <button
                    onClick={() => setJogadoresPorTime(v => Math.min(15, v + 1))}
                    className="w-10 h-10 rounded-full border-2 border-gray-200 flex items-center justify-center text-gray-600 text-xl font-bold hover:border-verde-campo hover:text-verde-campo transition-colors"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Status / aviso */}
              {temQuorum ? (
                <div className="flex items-start gap-3 bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-sm text-green-800">
                  <span className="text-lg leading-none mt-0.5">✅</span>
                  <span>
                    {sobram === 0
                      ? `Todos os ${jogadores.length} jogadores serão sorteados em ${numTimesConfig} times de ${jogadoresPorTime}.`
                      : `${numTimesConfig} times de ${jogadoresPorTime} jogadores. ${sobram} jogador${sobram > 1 ? 'es' : ''} ficarão como reserva.`}
                  </span>
                </div>
              ) : (
                <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800 space-y-1">
                  <p className="font-semibold">Jogadores insuficientes para {numTimesConfig} times completos</p>
                  <p>
                    Faltam {faltam} jogador{faltam > 1 ? 'es' : ''} para fechar {numTimesConfig} times de {jogadoresPorTime}.
                    {timesCompletos > 0 && ` Com ${jogadores.length} confirmados, é possível fazer ${timesCompletos} time${timesCompletos > 1 ? 's' : ''} completo${timesCompletos > 1 ? 's' : ''}.`}
                  </p>
                  {timesCompletos > 0 && timesCompletos < numTimesConfig && (
                    <button
                      onClick={() => setNumTimesConfig(timesCompletos)}
                      className="mt-1 text-amber-900 font-semibold underline underline-offset-2"
                    >
                      Usar {timesCompletos} times
                    </button>
                  )}
                </div>
              )}

              <button
                onClick={handleSortear}
                className="w-full flex items-center justify-center gap-2 bg-verde-campo text-white font-bold py-4 rounded-xl hover:bg-verde-escuro transition-colors"
              >
                <Shuffle size={18} />
                Sortear times
              </button>
            </>
          )}
        </div>
      </Layout>
    )
  }

  // Results step
  return (
    <Layout>
      <div
        className="px-5 pt-10 pb-5"
        style={{ background: 'linear-gradient(160deg, #1D9E75, #085041)' }}
      >
        <button
          onClick={isCreator ? handleVoltarConfig : () => navigate(-1)}
          className="flex items-center gap-2 text-white/80 text-sm mb-4 hover:text-white transition-colors"
        >
          <ArrowLeft size={18} /> {isCreator ? 'Reconfigurar' : 'Voltar'}
        </button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-white text-2xl font-bold">Times sorteados</h1>
            <p className="text-white/70 text-sm mt-0.5">
              {times.flat().length} jogadores · {times.length} times
              {reservas.length > 0 && ` · ${reservas.length} reserva${reservas.length > 1 ? 's' : ''}`}
            </p>
          </div>
          {isCreator && (
            <button
              onClick={handleSortearNovamente}
              className="flex items-center gap-2 bg-white/20 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-white/30 transition-colors"
            >
              <Shuffle size={16} />
              Sortear
            </button>
          )}
        </div>
      </div>

      <div className="px-5 py-5 space-y-4">
        {jogadores.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-5xl mb-4">👥</div>
            <h3 className="font-semibold text-gray-700 mb-2">Nenhum jogador confirmado</h3>
            <p className="text-gray-400 text-sm">
              Aguarde os jogadores confirmarem presença para sortear os times.
            </p>
          </div>
        ) : (
          <>
            {goleiroFixo && (
              <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-700">
                <span className="text-lg">🧤</span>
                <span>Goleiros fixos — não entram no revezamento entre os times.</span>
              </div>
            )}

            {times.map((time, idx) => {
              const corConfig = CORES_TIMES[idx % CORES_TIMES.length]
              const media = calcularMediaTime(time)

              return (
                <div
                  key={idx}
                  className="bg-white rounded-xl border-2 shadow-sm overflow-hidden"
                  style={{ borderColor: corConfig.cor }}
                >
                  {/* Header do time */}
                  <div
                    className="px-4 py-3 flex items-center justify-between"
                    style={{ backgroundColor: corConfig.cor }}
                  >
                    <div>
                      <h3 className="font-bold text-lg" style={{ color: corConfig.corTexto }}>
                        Time {corConfig.nome}
                      </h3>
                      <p className="text-xs opacity-80" style={{ color: corConfig.corTexto }}>
                        {time.length} jogadores
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs opacity-70" style={{ color: corConfig.corTexto }}>
                        Nível médio
                      </p>
                      <p className="font-bold text-xl" style={{ color: corConfig.corTexto }}>
                        {media.toFixed(1)}
                      </p>
                    </div>
                  </div>

                  {/* Jogadores */}
                  <div className="divide-y divide-gray-50">
                    {time.map((jogador) => (
                      <div key={jogador.id} className="flex items-center gap-3 px-4 py-2.5">
                        <div className="w-9 h-9 rounded-full overflow-hidden flex-shrink-0 border-2 border-gray-100">
                          {jogador.foto_url ? (
                            <img src={jogador.foto_url} alt={jogador.nome} className="w-full h-full object-cover" />
                          ) : (
                            <div
                              className="w-full h-full flex items-center justify-center text-white font-bold text-sm"
                              style={{ backgroundColor: corConfig.cor }}
                            >
                              {jogador.nome[0].toUpperCase()}
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-800 text-sm truncate">{jogador.nome}</p>
                          {jogador.posicao_principal && (
                            <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-full ${getPosicaoCor(jogador.posicao_principal)}`}>
                              {getPosicaoLabel(jogador.posicao_principal)}
                            </span>
                          )}
                        </div>
                        <div className="flex-shrink-0">
                          <span
                            className="text-xs font-bold px-2 py-0.5 rounded-full"
                            style={{ backgroundColor: `${corConfig.cor}20`, color: corConfig.cor }}
                          >
                            {jogador.nivel.toFixed(1)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}

            {/* Reservas */}
            {reservas.length > 0 && (
              <div className="bg-white rounded-xl border-2 border-gray-200 shadow-sm overflow-hidden">
                <div className="px-4 py-3 flex items-center gap-2 bg-gray-100">
                  <Users size={16} className="text-gray-500" />
                  <h3 className="font-bold text-gray-700">
                    Reservas ({reservas.length})
                  </h3>
                </div>
                <div className="divide-y divide-gray-50">
                  {reservas.map((jogador) => (
                    <div key={jogador.id} className="flex items-center gap-3 px-4 py-2.5">
                      <div className="w-9 h-9 rounded-full overflow-hidden flex-shrink-0 border-2 border-gray-100">
                        {jogador.foto_url ? (
                          <img src={jogador.foto_url} alt={jogador.nome} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gray-300 text-gray-600 font-bold text-sm">
                            {jogador.nome[0].toUpperCase()}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-800 text-sm truncate">{jogador.nome}</p>
                        {jogador.posicao_principal && (
                          <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-full ${getPosicaoCor(jogador.posicao_principal)}`}>
                            {getPosicaoLabel(jogador.posicao_principal)}
                          </span>
                        )}
                      </div>
                      <div className="flex-shrink-0">
                        <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                          {jogador.nivel.toFixed(1)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {isCreator && (
              <>
                <button
                  onClick={handleSortearNovamente}
                  disabled={confirmando}
                  className="w-full flex items-center justify-center gap-2 border-2 border-verde-campo text-verde-campo font-semibold py-4 rounded-xl hover:bg-verde-claro transition-colors disabled:opacity-50"
                >
                  <RefreshCw size={18} />
                  Sortear novamente
                </button>

                <button
                  onClick={handleConfirmarSorteio}
                  disabled={confirmando}
                  className="w-full flex items-center justify-center gap-2 bg-verde-campo text-white font-bold py-4 rounded-xl hover:bg-verde-escuro transition-colors disabled:opacity-60"
                >
                  <CheckCircle size={18} />
                  {confirmando ? 'Confirmando...' : 'Confirmar sorteio'}
                </button>
              </>
            )}
          </>
        )}
      </div>
    </Layout>
  )
}
