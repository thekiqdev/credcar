-- Script para corrigir quota_id nos contratos existentes
-- Arquivo: fix-contract-quota-id.sql

-- 1. Verificar contratos com quota_id como string
SELECT 
    id,
    quota_id,
    contract_code,
    status,
    created_at
FROM contracts 
WHERE quota_id IS NOT NULL 
AND quota_id::text ~ '^[0-9]+$' -- Verificar se é numérico
ORDER BY id;

-- 2. Verificar se há contratos com quota_id inválido
SELECT 
    COUNT(*) as total_contracts,
    COUNT(CASE WHEN quota_id IS NOT NULL THEN 1 END) as contracts_with_quota,
    COUNT(CASE WHEN quota_id IS NULL THEN 1 END) as contracts_without_quota
FROM contracts;

-- 3. Verificar quotas disponíveis para associar
SELECT 
    q.id as quota_id,
    q.quota_number,
    q.status,
    g.name as group_name,
    g.description as group_description
FROM quotas q
INNER JOIN groups g ON q.group_id = g.id
WHERE q.status = 'Disponível'
ORDER BY g.name, q.quota_number
LIMIT 10;

-- 4. Script para corrigir quota_id (descomente se necessário)
-- UPDATE contracts 
-- SET quota_id = quota_id::integer 
-- WHERE quota_id IS NOT NULL 
-- AND quota_id::text ~ '^[0-9]+$';

-- 5. Verificar se a correção funcionou
-- SELECT 
--     c.id as contract_id,
--     c.quota_id,
--     c.contract_code,
--     q.quota_number,
--     g.name as group_name
-- FROM contracts c
-- LEFT JOIN quotas q ON c.quota_id = q.id
-- LEFT JOIN groups g ON q.group_id = g.id
-- WHERE c.quota_id IS NOT NULL
-- ORDER BY c.id
-- LIMIT 10;
