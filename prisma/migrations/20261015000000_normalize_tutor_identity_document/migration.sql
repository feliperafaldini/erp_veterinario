-- Normalização e unicidade global de TutorIdentity.documentNumber.
--
-- Decisão de domínio: documentNumber é armazenado somente com dígitos e é
-- único globalmente (docs/business-rules.md, docs/domain-model.md,
-- docs/architecture.md). A validação de dígito verificador NÃO faz parte
-- desta regra.
--
-- ---------------------------------------------------------------------------
-- Desenho de segurança desta migration
-- ---------------------------------------------------------------------------
-- 1. NADA é escrito antes da verificação de integridade. As duas consultas de
--    pré-cheque abaixo apenas LEEM.
-- 2. Qualquer problema detectado levanta exceção via RAISE EXCEPTION, o que
--    interrompe a migration. O Prisma executa cada migration em uma única
--    transação no PostgreSQL, portanto a interrupção é atômica: nem a
--    normalização nem a constraint são aplicadas.
-- 3. NÃO há deduplicação, exclusão ou fusão automática de registros. Colisões
--    devem ser resolvidas manualmente por um humano com conhecimento do
--    domínio — dois CPFs distintos que colidem podem ser duas pessoas.
-- 4. A constraint global só é criada no final, depois de a base estar
--    comprovadamente livre de colisões.
-- 5. Ambientes com dados não são presumidos vazios: o pré-cheque cobre
--    qualquer volume de registros.

-- ---------------------------------------------------------------------------
-- Pré-cheque 1 — registros cujo documentNumber normalizaria para VAZIO.
-- Um documento sem nenhum dígito perderia o conteúdo inteiro ao ser
-- normalizado. Isso é perda de dados, então interrompe.
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  empty_after_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO empty_after_count
  FROM "TutorIdentity"
  WHERE "documentNumber" <> ''
    AND regexp_replace("documentNumber", '\D', '', 'g') = '';

  IF empty_after_count > 0 THEN
    RAISE EXCEPTION
      'Interrupção segura: % registro(s) de "TutorIdentity" possuem "documentNumber" sem nenhum dígito e ficariam VAZIOS após a normalização. Nenhum dado foi alterado. Corrija esses registros manualmente e reaplique a migration.',
      empty_after_count;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- Pré-cheque 2 — colisões após a normalização.
-- Detecta grupos que compartilhariam o mesmo "documentNumber" uma vez
-- normalizados, cobrindo os dois vetores possíveis:
--   a) mesmos dígitos sob grafias diferentes ('12345678901' vs '123.456.789-01');
--   b) mesmos dígitos sob documentType diferentes (CPF vs CNPJ).
-- Ambos violariam a nova unicidade global. Interrompe sem deduplicar.
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  collision_group_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO collision_group_count
  FROM (
    SELECT regexp_replace("documentNumber", '\D', '', 'g') AS normalized
    FROM "TutorIdentity"
    GROUP BY normalized
    HAVING COUNT(*) > 1
  ) AS colliding;

  IF collision_group_count > 0 THEN
    RAISE EXCEPTION
      'Interrupção segura: % grupo(s) de "TutorIdentity" colidiriam após normalizar "documentNumber" para somente dígitos. Nenhum dado foi alterado e NENHUM registro foi deduplicado ou excluído. Resolva cada caso manualmente (podem ser pessoas distintas) e reaplique a migration.',
      collision_group_count;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- Passo 1 — normalização dos registros existentes.
-- Só altera linhas cujo valor difere do normalizado. Nenhuma linha é
-- excluída; o número original é preservado apenas nesta transação, que será
-- revertida integralmente se o passo seguinte falhar.
-- ---------------------------------------------------------------------------
UPDATE "TutorIdentity"
SET "documentNumber" = regexp_replace("documentNumber", '\D', '', 'g')
WHERE "documentNumber" <> regexp_replace("documentNumber", '\D', '', 'g');

-- ---------------------------------------------------------------------------
-- Passo 2 — unicidade global.
-- Nome do índice gerado pelo próprio Prisma (verificado via
-- `prisma migrate diff --script`), para que schema e migrations permaneçam
-- equivalentes.
-- ---------------------------------------------------------------------------
CREATE UNIQUE INDEX "TutorIdentity_documentNumber_key" ON "TutorIdentity"("documentNumber");
