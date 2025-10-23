-- ====================================================================
-- Script de Limpeza de Documentos Duplicados
-- ====================================================================
-- Este script:
-- 1. Mantém apenas o registro mais recente de cada documento por representante
-- 2. Deleta registros antigos com file_url vazio
-- 3. Deleta registros duplicados mantendo o mais recente
-- ====================================================================

BEGIN;

-- ====================================================================
-- PASSO 1: Verificar registros duplicados ANTES da limpeza
-- ====================================================================
SELECT 
  representative_id,
  document_type,
  COUNT(*) as total_registros,
  MIN(uploaded_at) as primeiro_upload,
  MAX(uploaded_at) as ultimo_upload,
  STRING_AGG(
    'ID: ' || id::text || 
    ' | file_url: ' || COALESCE(NULLIF(file_url, ''), '(vazio)') || 
    ' | uploaded_at: ' || uploaded_at::text,
    E'\n  '
  ) as detalhes
FROM representative_documents
GROUP BY representative_id, document_type
HAVING COUNT(*) > 1
ORDER BY representative_id, document_type;

-- ====================================================================
-- PASSO 2: Criar tabela temporária com os IDs para MANTER
-- ====================================================================
CREATE TEMP TABLE docs_to_keep AS
WITH ranked_docs AS (
  SELECT 
    id,
    representative_id,
    document_type,
    file_url,
    status,
    uploaded_at,
    ROW_NUMBER() OVER (
      PARTITION BY representative_id, document_type 
      ORDER BY 
        uploaded_at DESC NULLS LAST,
        -- Priorizar registros com file_url preenchido
        CASE WHEN file_url IS NOT NULL AND file_url != '' THEN 0 ELSE 1 END,
        id DESC
    ) as rn
  FROM representative_documents
)
SELECT 
  id,
  representative_id,
  document_type,
  file_url,
  uploaded_at
FROM ranked_docs
WHERE rn = 1;

-- Verificar quantos registros serão mantidos
SELECT 
  COUNT(*) as total_registros_a_manter,
  COUNT(CASE WHEN file_url IS NOT NULL AND file_url != '' THEN 1 END) as com_arquivo,
  COUNT(CASE WHEN file_url IS NULL OR file_url = '' THEN 1 END) as sem_arquivo
FROM docs_to_keep;

-- ====================================================================
-- PASSO 3: Criar tabela temporária com os IDs para DELETAR
-- ====================================================================
CREATE TEMP TABLE docs_to_delete AS
SELECT 
  rd.id,
  rd.representative_id,
  rd.document_type,
  rd.file_url,
  rd.status,
  rd.uploaded_at,
  CASE 
    WHEN rd.file_url IS NULL OR rd.file_url = '' THEN 'Sem arquivo'
    WHEN rd.uploaded_at < (SELECT uploaded_at FROM docs_to_keep WHERE representative_id = rd.representative_id AND document_type = rd.document_type) THEN 'Mais antigo'
    ELSE 'Duplicado'
  END as motivo_exclusao
FROM representative_documents rd
WHERE rd.id NOT IN (SELECT id FROM docs_to_keep);

-- Verificar quantos registros serão deletados
SELECT 
  COUNT(*) as total_registros_a_deletar,
  COUNT(CASE WHEN file_url IS NOT NULL AND file_url != '' THEN 1 END) as com_arquivo,
  COUNT(CASE WHEN file_url IS NULL OR file_url = '' THEN 1 END) as sem_arquivo,
  COUNT(CASE WHEN motivo_exclusao = 'Sem arquivo' THEN 1 END) as sem_arquivo_motivo,
  COUNT(CASE WHEN motivo_exclusao = 'Mais antigo' THEN 1 END) as mais_antigo_motivo,
  COUNT(CASE WHEN motivo_exclusao = 'Duplicado' THEN 1 END) as duplicado_motivo
FROM docs_to_delete;

-- Listar detalhes dos registros que serão deletados
SELECT 
  id,
  representative_id,
  document_type,
  COALESCE(NULLIF(file_url, ''), '(vazio)') as file_url,
  status,
  uploaded_at,
  motivo_exclusao
FROM docs_to_delete
ORDER BY representative_id, document_type, uploaded_at DESC;

-- ====================================================================
-- PASSO 4: BACKUP - Criar tabela de backup antes de deletar
-- ====================================================================
CREATE TABLE IF NOT EXISTS representative_documents_backup_deleted (
  id INTEGER,
  representative_id UUID,
  document_type TEXT,
  file_url TEXT,
  status TEXT,
  uploaded_at TIMESTAMPTZ,
  motivo_exclusao TEXT,
  deleted_at TIMESTAMPTZ DEFAULT NOW()
);

-- Inserir registros que serão deletados no backup
INSERT INTO representative_documents_backup_deleted 
  (id, representative_id, document_type, file_url, status, uploaded_at, motivo_exclusao)
SELECT 
  id, 
  representative_id, 
  document_type, 
  file_url, 
  status, 
  uploaded_at,
  motivo_exclusao
FROM docs_to_delete;

-- Verificar backup
SELECT COUNT(*) as registros_no_backup FROM representative_documents_backup_deleted;

-- ====================================================================
-- PASSO 5: DELETAR registros duplicados
-- ====================================================================
-- ⚠️ ATENÇÃO: Esta operação é IRREVERSÍVEL (exceto pelo backup)
-- ⚠️ Remova os comentários abaixo para executar a exclusão

-- DELETE FROM representative_documents
-- WHERE id IN (SELECT id FROM docs_to_delete);

-- Verificar resultado após exclusão
-- SELECT 
--   COUNT(*) as total_registros_apos_limpeza,
--   COUNT(DISTINCT representative_id) as total_representantes,
--   COUNT(DISTINCT document_type) as tipos_documentos_distintos
-- FROM representative_documents;

-- Verificar se ainda existem duplicatas
-- SELECT 
--   representative_id,
--   document_type,
--   COUNT(*) as total_registros
-- FROM representative_documents
-- GROUP BY representative_id, document_type
-- HAVING COUNT(*) > 1;

-- ====================================================================
-- PASSO 6: Exportar lista de arquivos para deletar do sistema de arquivos
-- ====================================================================
-- Esta query gera uma lista de file_url que podem ser deletados
SELECT 
  DISTINCT file_url
FROM docs_to_delete
WHERE file_url IS NOT NULL 
  AND file_url != ''
ORDER BY file_url;

COMMIT;

-- ====================================================================
-- INSTRUÇÕES DE USO:
-- ====================================================================
-- 1. Execute este script PRIMEIRO SEM descomentar o DELETE
-- 2. Verifique os resultados das queries de verificação
-- 3. Revise a lista de registros que serão deletados
-- 4. Se estiver OK, descomente o DELETE e execute novamente
-- 5. Use o script Node.js para deletar os arquivos físicos
-- ====================================================================

