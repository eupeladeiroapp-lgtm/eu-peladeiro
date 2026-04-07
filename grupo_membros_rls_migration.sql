-- Permite que admins do grupo removam outros membros
-- Execute este script no SQL Editor do Supabase

-- Política: admin pode deletar qualquer membro do grupo que ele admina
CREATE POLICY "Admins can remove group members" ON grupo_membros
  FOR DELETE USING (
    auth.uid() IN (
      SELECT profile_id FROM grupo_membros gm
      WHERE gm.grupo_id = grupo_membros.grupo_id
        AND gm.role = 'admin'
    )
  );

-- Política: membros podem remover a si mesmos (sair do grupo)
-- (provavelmente já existe, mas incluso para garantir)
CREATE POLICY "Members can leave group" ON grupo_membros
  FOR DELETE USING (auth.uid() = profile_id);
