import { useEffect, useState } from 'react'
import { X, Loader2, ExternalLink, CheckCircle2 } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
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

type Status = 'idle' | 'cpf' | 'loading' | 'aguardando_pagamento' | 'success' | 'error'

function mascararCPF(valor: string) {
  return valor
    .replace(/\D/g, '')
    .slice(0, 11)
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
}

export default function ModalUpgradePro({ titulo, descricao, onFechar }: Props) {
  const { user, profile, refetchProfile } = useAuth()
  const [playBillingDisponivel, setPlayBillingDisponivel] = useState(false)
  const [planoSelecionado, setPlanoSelecionado] = useState<ProSku>('pro_mensal')
  const [status, setStatus] = useState<Status>('idle')
  const [erro, setErro] = useState('')
  const [cpf, setCpf] = useState('')
  const [checkoutUrl, setCheckoutUrl] = useState('')

  const emTWA = isTWA()

  useEffect(() => {
    if (emTWA) isPlayBillingAvailable().then(setPlayBillingDisponivel)
  }, [emTWA])

  // Fluxo Google Play Billing (TWA / Android)
  async function handleAssinarPlay() {
    if (!user) return
    setStatus('loading')
    setErro('')
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
    if (resultado === 'error') {
      setErro('Erro ao processar pagamento. Tente novamente.')
      setStatus('error')
    }
  }

  // Fluxo Asaas (web / PWA) — abre o passo de CPF
  function handleAssinarWeb() {
    setErro('')
    setStatus('cpf')
  }

  async function handleConfirmarCPF() {
    const cpfDigitos = cpf.replace(/\D/g, '')
    if (cpfDigitos.length !== 11) {
      setErro('CPF inválido. Digite os 11 dígitos.')
      return
    }
    if (!user) return
    setStatus('loading')
    setErro('')

    const { data, error } = await supabase.functions.invoke('create-asaas-checkout', {
      body: { userId: user.id, cpf: cpfDigitos },
    })

    if (error || !data?.checkoutUrl) {
      console.error('[ModalUpgradePro] erro checkout:', error, data)
      setErro('Não foi possível gerar o link de pagamento. Tente novamente.')
      setStatus('error')
      return
    }

    setCheckoutUrl(data.checkoutUrl)
    window.open(data.checkoutUrl, '_blank', 'noopener,noreferrer')
    setStatus('aguardando_pagamento')
  }

  async function handleVerificarAtivacao() {
    setStatus('loading')
    await refetchProfile()
    if (profile?.is_pro) {
      setStatus('success')
      setTimeout(onFechar, 1500)
    } else {
      setErro('Pagamento ainda não confirmado. Aguarde alguns instantes e tente novamente.')
      setStatus('aguardando_pagamento')
    }
  }

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

        {/* Comparação Free vs Pro */}
        <div className="grid grid-cols-2 gap-2 mb-5">
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-3">
            <p className="text-gray-400 text-[11px] font-bold uppercase tracking-wide mb-2">Free</p>
            {[
              '3 grupos',
              'Máx. 25 membros',
              '3 avaliações/mês',
              'Histórico 30 dias',
              'Sem badge',
            ].map((f) => (
              <p key={f} className="text-gray-400 text-xs flex items-center gap-1.5 mb-1.5">
                <span className="text-gray-300 font-bold">✕</span> {f}
              </p>
            ))}
          </div>
          <div className="bg-verde-campo/5 border-2 border-verde-campo rounded-xl p-3">
            <p className="text-verde-campo text-[11px] font-bold uppercase tracking-wide mb-2">Pro ⭐ · R$ 4,90/mês</p>
            {[
              'Grupos ilimitados',
              'Membros ilimitados',
              'Avaliações ilimitadas',
              'Histórico completo',
              'Badge PRO no perfil',
            ].map((f) => (
              <p key={f} className="text-gray-700 text-xs flex items-center gap-1.5 mb-1.5 font-medium">
                <span className="text-verde-campo font-bold">✓</span> {f}
              </p>
            ))}
          </div>
        </div>

        {/* Google Play Billing (TWA) */}
        {emTWA && playBillingDisponivel ? (
          <>
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
                <p className="text-verde-campo font-bold">
                  R$ 4,90<span className="text-gray-400 font-normal text-xs">/mês</span>
                </p>
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
                <p className="text-verde-campo font-bold">
                  R$ 74,90<span className="text-gray-400 font-normal text-xs">/ano</span>
                </p>
              </button>
            </div>

            {status === 'success' ? (
              <div className="w-full bg-green-500 text-white font-bold py-4 rounded-xl text-base text-center">
                Pro ativado! ⭐
              </div>
            ) : (
              <button
                onClick={handleAssinarPlay}
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
          </>
        ) : (
          /* Asaas checkout (web / PWA) */
          <>
            <div className="border-2 border-verde-campo bg-verde-campo/5 rounded-xl p-3 text-center mb-4">
              <p className="font-bold text-gray-800 text-sm">Plano Mensal</p>
              <p className="text-verde-campo font-bold text-xl">
                R$ 4,90<span className="text-gray-400 font-normal text-sm">/mês</span>
              </p>
              <p className="text-gray-400 text-xs mt-0.5">PIX, cartão ou boleto</p>
            </div>

            {status === 'success' && (
              <div className="w-full bg-green-500 text-white font-bold py-4 rounded-xl text-base text-center flex items-center justify-center gap-2">
                <CheckCircle2 size={18} />
                Pro ativado! ⭐
              </div>
            )}

            {status === 'cpf' && (
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-semibold text-gray-700 block mb-1.5">
                    CPF para cobrança
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="000.000.000-00"
                    value={cpf}
                    onChange={(e) => setCpf(mascararCPF(e.target.value))}
                    className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-lg font-bold tracking-widest text-center focus:border-verde-campo focus:outline-none"
                    autoFocus
                  />
                  <p className="text-xs text-gray-400 mt-1.5 text-center">Necessário pelo Asaas para processar o pagamento</p>
                </div>
                <button
                  onClick={handleConfirmarCPF}
                  disabled={cpf.replace(/\D/g, '').length !== 11}
                  className="w-full bg-gradient-to-r from-verde-campo to-verde-escuro text-white font-bold py-4 rounded-xl text-base flex items-center justify-center gap-2 disabled:opacity-40"
                >
                  <ExternalLink size={18} />
                  Continuar para o checkout
                </button>
                <button
                  onClick={() => setStatus('idle')}
                  className="w-full text-gray-400 text-sm py-1"
                >
                  Voltar
                </button>
              </div>
            )}

            {status === 'aguardando_pagamento' && (
              <div className="space-y-3">
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-800">
                  Checkout aberto em nova aba. Após concluir o pagamento, clique em verificar.
                </div>
                <button
                  onClick={handleVerificarAtivacao}
                  className="w-full bg-gradient-to-r from-verde-campo to-verde-escuro text-white font-bold py-4 rounded-xl text-base flex items-center justify-center gap-2"
                >
                  <CheckCircle2 size={18} />
                  Verificar ativação
                </button>
                <button
                  onClick={() => window.open(checkoutUrl, '_blank', 'noopener,noreferrer')}
                  className="w-full border border-gray-200 text-gray-500 py-2.5 rounded-xl text-sm flex items-center justify-center gap-2"
                >
                  <ExternalLink size={14} />
                  Reabrir checkout
                </button>
              </div>
            )}

            {(status === 'idle' || status === 'error') && (
              <button
                onClick={handleAssinarWeb}
                className="w-full bg-gradient-to-r from-verde-campo to-verde-escuro text-white font-bold py-4 rounded-xl text-base flex items-center justify-center gap-2"
              >
                <ExternalLink size={18} />
                Assinar Pro — R$ 4,90/mês
              </button>
            )}

            {status === 'loading' && (
              <button
                disabled
                className="w-full bg-gradient-to-r from-verde-campo to-verde-escuro text-white font-bold py-4 rounded-xl text-base flex items-center justify-center gap-2 opacity-70"
              >
                <Loader2 size={18} className="animate-spin" />
                Gerando checkout...
              </button>
            )}
          </>
        )}

        {erro && (
          <p className="text-center text-red-500 text-xs mt-2">{erro}</p>
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
