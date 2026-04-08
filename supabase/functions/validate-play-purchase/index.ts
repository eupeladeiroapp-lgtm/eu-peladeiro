import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Variáveis de ambiente necessárias no Supabase Dashboard → Edge Functions → Secrets:
//   SUPABASE_URL           → gerada automaticamente
//   SUPABASE_SERVICE_KEY   → Settings → API → service_role key
//   GOOGLE_SA_KEY_JSON     → JSON da Service Account do Google Cloud (ver README)
//   GOOGLE_PACKAGE_NAME    → com.eupeladeiro.app

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { purchaseToken, sku, userId } = await req.json()

    if (!purchaseToken || !sku || !userId) {
      return new Response(
        JSON.stringify({ error: 'Parâmetros inválidos' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 1. Obter access token da Google Service Account
    const googleToken = await getGoogleAccessToken()

    // 2. Validar o purchaseToken na Google Play Developer API
    const packageName = Deno.env.get('GOOGLE_PACKAGE_NAME') ?? 'com.eupeladeiro.app'
    const subscriptionId = sku // 'pro_mensal' ou 'pro_anual'

    const validationUrl =
      `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${packageName}/purchases/subscriptionsv2/tokens/${purchaseToken}`

    const googleResp = await fetch(validationUrl, {
      headers: { Authorization: `Bearer ${googleToken}` },
    })

    if (!googleResp.ok) {
      const err = await googleResp.text()
      console.error('[PlayBilling] Google API error:', err)
      return new Response(
        JSON.stringify({ error: 'Token de compra inválido' }),
        { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const purchase = await googleResp.json()

    // subscriptionState: SUBSCRIPTION_STATE_ACTIVE ou SUBSCRIPTION_STATE_IN_GRACE_PERIOD
    const activeStates = [
      'SUBSCRIPTION_STATE_ACTIVE',
      'SUBSCRIPTION_STATE_IN_GRACE_PERIOD',
    ]

    if (!activeStates.includes(purchase.subscriptionState)) {
      return new Response(
        JSON.stringify({ error: 'Assinatura não está ativa' }),
        { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 3. Ativar is_pro no perfil do usuário
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_KEY')!
    )

    const expiryTime = purchase.lineItems?.[0]?.expiryTime ?? null

    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        is_pro: true,
        pro_expires_at: expiryTime,
        pro_sku: subscriptionId,
        pro_purchase_token: purchaseToken,
      })
      .eq('id', userId)

    if (updateError) {
      console.error('[PlayBilling] Supabase update error:', updateError)
      return new Response(
        JSON.stringify({ error: 'Erro ao ativar Pro' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ success: true, subscriptionState: purchase.subscriptionState }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error('[validate-play-purchase] erro:', err)
    return new Response(
      JSON.stringify({ error: 'Erro interno' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

// Gera um access token JWT para a Service Account do Google
async function getGoogleAccessToken(): Promise<string> {
  const saKeyJson = Deno.env.get('GOOGLE_SA_KEY_JSON')
  if (!saKeyJson) throw new Error('GOOGLE_SA_KEY_JSON não configurado')

  const sa = JSON.parse(saKeyJson)
  const scope = 'https://www.googleapis.com/auth/androidpublisher'
  const now = Math.floor(Date.now() / 1000)

  const header = { alg: 'RS256', typ: 'JWT' }
  const payload = {
    iss: sa.client_email,
    scope,
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  }

  const encode = (obj: object) =>
    btoa(JSON.stringify(obj)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')

  const signingInput = `${encode(header)}.${encode(payload)}`

  // Importar chave privada RSA
  const privateKey = sa.private_key as string
  const pemBody = privateKey.replace(/-----[^-]+-----/g, '').replace(/\s/g, '')
  const binaryKey = Uint8Array.from(atob(pemBody), (c) => c.charCodeAt(0))

  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    binaryKey,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  )

  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    new TextEncoder().encode(signingInput)
  )

  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')

  const jwt = `${signingInput}.${sigB64}`

  // Trocar JWT por access token
  const tokenResp = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  })

  const tokenData = await tokenResp.json()
  if (!tokenData.access_token) {
    throw new Error(`Falha ao obter token Google: ${JSON.stringify(tokenData)}`)
  }
  return tokenData.access_token
}
