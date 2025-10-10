-- Script para verificar dados de quota nos contratos
-- Arquivo: debug-contract-quota.sql

-- 1. Verificar contratos e suas quotas
SELECT 
    c.id as contract_id,
    c.quota_id,
    c.status as contract_status,
    q.id as quota_id_from_quotas,
    q.quota_number,
    q.status as quota_status,
    g.id as group_id,
    g.name as group_name,
    g.description as group_description
FROM contracts c
LEFT JOIN quotas q ON c.quota_id = q.id
LEFT JOIN groups g ON q.group_id = g.id
ORDER BY c.id
LIMIT 10;

-- 2. Verificar quantos contratos têm quota_id definido
SELECT 
    COUNT(*) as total_contracts,
    COUNT(quota_id) as contracts_with_quota,
    COUNT(*) - COUNT(quota_id) as contracts_without_quota
FROM contracts;

-- 3. Verificar quotas disponíveis
SELECT 
    g.name as group_name,
    COUNT(q.id) as total_quotas,
    COUNT(CASE WHEN q.status = 'Disponível' THEN 1 END) as available_quotas,
    COUNT(CASE WHEN q.status = 'Ocupada' THEN 1 END) as occupied_quotas
FROM groups g
LEFT JOIN quotas q ON g.id = q.group_id
GROUP BY g.id, g.name
ORDER BY g.name;

-- 4. Verificar se há dados de teste nas tabelas
SELECT 'groups' as table_name, COUNT(*) as count FROM groups
UNION ALL
SELECT 'quotas' as table_name, COUNT(*) as count FROM quotas
UNION ALL
SELECT 'contracts' as table_name, COUNT(*) as count FROM contracts;
