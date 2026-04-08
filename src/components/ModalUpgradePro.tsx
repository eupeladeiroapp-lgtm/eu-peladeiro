import { useEffect, useState } from 'react'
import { X, Loader2 } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import {
  isTWA,
  isPlayBillingAvailable,
  purchaseProSubscription,
  type ProSku,
} from '../hooks/usePlayBilling'

interface Props {
  titulo: string
  descricao: string
  onFechar: () => void
}

export default function ModalUpgradePro({ titulo, descricao, onFechar }: Props) {
  const { user, refetchProfile } = useAuth()
  const [playBillingDisponivel, setPlayBillingDisponivel] = useState(false)
  const [planoSelecionado, setPlanoSelecionado] = useState<ProSku>('pro_mensal')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')

  useEffect(() => {
    isPlayBillingAvailable().then(setPlayBillingDisponivel)
  }, [])

  async function handleAssinar() {
    if (!user) return
    setStatus('loading')
    const resultado = await purchaseProSubscription(
      planoSelecionado,
      user.id,
      async () => {
        await refetchProfile()
        setStatus('success')
        setTimeout(onFechar, 1500)
      }
    )
    if (resultado === 'cancelled') setStatus('idle')
    if (resultado === 'error') setStatus('error')
  }

  const emTWA = isTWA()

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50">
      <div className="w-full max-w-lg bg-white rounded-t-2xl p-6 pb-10 animate-slide-up">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="text-2xl">⭐</span>
            <h2 className="text-xl font-bold text-gray-800">Eu Peladeiro Pro</h2>
          </div>
          <button
            onClick={onFechar}
            className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200"
          >
            <X size={18} />
          </button>
        </div>

        <div className="bg-gradient-to-r from-verde-campo to-verde-escuro rounded-xl p-4 mb-5 text-white">
          <p className="font-bold text-lg mb-1">{titulo}</p>
          <p className="text-white/80 text-sm">{descricao}</p>
        </div>

        <div className="space-y-2 mb-5">
          {[
            'Grupos ilimitados',
            'Até 25 membros por grupo',
            'Avaliações ilimitadas por mês',
            'Badge Pro no perfil',
            'Ranking global',
          ].map((item) => (
            <div key={item} className="flex items-center gap-2 text-sm text-gray-700">
              <span className="text-verde-campo font-bold">✓</span>
              {item}
            </div>
          ))}
        </div>

        {playBillingDisponivel && emTWA ? (
          <>
            {/* Seletor de plano */}
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => setPlanoSelecionado('pro_mensal')}
                className={`flex-1 border-2 rounded-xl p-3 text-center transition-all ${
                  planoSelecionado === 'pro_mensal'
                    ? 'border-verde-campo bg-verde-campo/5'
                    : 'border-gray-200'
                }`}
              >
                <p className="font-bold text-gray-800 text-sm">Mensal</p>
                <p className="text-verde-campo font-bold">R$ 9,90<span className="text-gray-400 font-normal text-xs">/mês</span></p>
              </button>
              <button
                onClick={() => setPlanoSelecionado('pro_anual')}
                className={`flex-1 border-2 rounded-xl p-3 text-center transition-all relative ${
                  planoSelecionado === 'pro_anual'
                    ? 'border-verde-campo bg-verde-campo/5'
                    : 'border-gray-200'
                }`}
              >
                <span className="absolute -top-2 left-1/2 -translate-x-1/2 bg-verde-campo text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                  MELHOR VALOR
                </span>
                <p className="font-bold text-gray-800 text-sm">Anual</p>
                <p className="text-verde-campo font-bold">R$ 79,90<span className="text-gray-400 font-normal text-xs">/ano</span></p>
              </button>
            </div>

            {status === 'success' ? (
              <div className="w-full bg-green-500 text-white font-bold py-4 rounded-xl text-base text-center">
                Pro ativado! ⭐
              </div>
            ) : (
              <button
                onClick={handleAssinar}
                disabled={status === 'loading'}
                className="w-full bg-gradient-to-r from-verde-campo to-verde-escuro text-white font-bold py-4 rounded-xl text-base flex items-center justify-center gap-2 disabled:opacity-70"
              >
                {status === 'loading' ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Processando...
                  </>
                ) : (
                  'Assinar Pro'
                )}
              </button>
            )}

            {status === 'error' && (
              <p className="text-center text-red-500 text-xs mt-2">
                Erro ao processar pagamento. Tente novamente.
              </p>
            )}
          </>
        ) : (
          <button
            onClick={onFechar}
            className="w-full bg-gradient-to-r from-verde-campo to-verde-escuro text-white font-bold py-4 rounded-xl text-base"
          >
            Em breve — fique ligado! 🚀
          </button>
        )}

        <button
          onClick={onFechar}
          className="w-full mt-2 text-gray-400 text-sm py-2"
        >
          Fechar
        </button>
      </div>
    </div>
  )
}
