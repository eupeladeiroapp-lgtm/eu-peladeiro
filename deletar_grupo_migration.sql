-- Execute este script no SQL Editor do Supabase
-- Cria uma função RPC com SECURITY DEFINER para excluir um grupo e todos os seus dados

CREATE OR REPLACE FUNCTION deletar_grupo(p_grupo_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_jogo_ids uuid[];
  v_time_ids uuid[];
BEGIN
  -- Verifica se quem está chamando é admin do grupo
  IF NOT EXISTS (
    SELECT 1 FROM grupo_membros
    WHERE grupo_id = p_grupo_id
      AND profile_id = auth.uid()
      AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Não autorizado: apenas admins podem excluir grupos';
  END IF;

  -- Coleta IDs dos jogos do grupo
  SELECT ARRAY_AGG(id) INTO v_jogo_ids FROM jogos WHERE grupo_id = p_grupo_id;

  IF v_jogo_ids IS NOT NULL THEN
    -- Coleta IDs dos times (para deletar time_jogadores)
    SELECT ARRAY_AGG(id) INTO v_time_ids FROM times WHERE jogo_id = ANY(v_jogo_ids);

    IF v_time_ids IS NOT NULL THEN
      DELETE FROM time_jogadores WHERE time_id = ANY(v_time_ids);
    END IF;

    DELETE FROM times       WHERE jogo_id = ANY(v_jogo_ids);
    DELETE FROM partidas    WHERE jogo_id = ANY(v_jogo_ids);
    DELETE FROM estatisticas WHERE jogo_id = ANY(v_jogo_ids);
    DELETE FROM confirmacoes WHERE jogo_id = ANY(v_jogo_ids);
    DELETE FROM notificacoes WHERE jogo_id = ANY(v_jogo_ids);
  END IF;

  DELETE FROM jogos        WHERE grupo_id = p_grupo_id;
  DELETE FROM avaliacoes   WHERE grupo_id = p_grupo_id;
  DELETE FROM grupo_membros WHERE grupo_id = p_grupo_id;
  DELETE FROM grupos       WHERE id = p_grupo_id;
END;
$$;
