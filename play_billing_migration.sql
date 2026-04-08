-- Migração: colunas de assinatura Play Billing na tabela profiles
-- Rodar no Supabase Dashboard → SQL Editor

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS pro_expires_at  timestamptz DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS pro_sku         text        DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS pro_purchase_token text      DEFAULT NULL;

-- Índice para facilitar limpeza de assinaturas expiradas no futuro
CREATE INDEX IF NOT EXISTS idx_profiles_pro_expires ON profiles(pro_expires_at)
  WHERE is_pro = true;
