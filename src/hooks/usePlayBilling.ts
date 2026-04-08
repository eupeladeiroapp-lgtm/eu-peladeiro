import { supabase } from '../lib/supabase'

export type ProSku = 'pro_mensal' | 'pro_anual'

// Detecta se o app está rodando dentro do TWA (Trusted Web Activity)
export function isTWA(): boolean {
  return (
    typeof window !== 'undefined' &&
    'getDigitalGoodsService' in window &&
    window.matchMedia('(display-mode: standalone)').matches
  )
}

// Detecta se o Google Play Billing está disponível
async function getPlayBillingService(): Promise<unknown | null> {
  if (!isTWA()) return null
  try {
    const service = await (window as any).getDigitalGoodsService(
      'https://play.google.com/billing'
    )
    return service
  } catch {
    return null
  }
}

export async function isPlayBillingAvailable(): Promise<boolean> {
  const service = await getPlayBillingService()
  return service !== null
}

// Inicia a compra de uma assinatura Pro via Google Play Billing
// Retorna 'success' | 'cancelled' | 'error'
export async function purchaseProSubscription(
  sku: ProSku,
  userId: string,
  onSuccess: () => void
): Promise<'success' | 'cancelled' | 'error'> {
  const service = await getPlayBillingService()
  if (!service) return 'error'

  try {
    const paymentRequest = new PaymentRequest(
      [
        {
          supportedMethods: 'https://play.google.com/billing',
          data: { sku },
        },
      ],
      {
        total: {
          label: sku === 'pro_mensal' ? 'Eu Peladeiro Pro Mensal' : 'Eu Peladeiro Pro Anual',
          amount: { currency: 'BRL', value: '0' }, // valor real vem do Play Console
        },
      }
    )

    const canMakePayment = await paymentRequest.canMakePayment()
    if (!canMakePayment) return 'error'

    const response = await paymentRequest.show()
    const purchaseToken = (response.details as any).purchaseToken

    // Valida o token no backend e ativa is_pro
    const { error } = await supabase.functions.invoke('validate-play-purchase', {
      body: { purchaseToken, sku, userId },
    })

    if (error) {
      await response.complete('fail')
      return 'error'
    }

    await response.complete('success')
    onSuccess()
    return 'success'
  } catch (err: any) {
    // AbortError = usuário cancelou
    if (err?.name === 'AbortError') return 'cancelled'
    console.error('[PlayBilling] erro:', err)
    return 'error'
  }
}
