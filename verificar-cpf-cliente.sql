-- Script para verificar CPF do cliente no banco de dados
-- Execute no SQL Editor do Supabase

-- 1. Buscar cliente pelo CPF exato (sem formatação)
SELECT 
    id,
    full_name,
    cpf_cnpj,
    email,
    phone,
    password_hash IS NOT NULL as has_password,
    created_at
FROM clients
WHERE cpf_cnpj = '42813108863';

-- 2. Buscar cliente pelo CPF com formatação (se houver)
SELECT 
    id,
    full_name,
    cpf_cnpj,
    email,
    phone,
    password_hash IS NOT NULL as has_password,
    created_at
FROM clients
WHERE cpf_cnpj LIKE '%42813108863%';

-- 3. Buscar cliente removendo formatação do banco
SELECT 
    id,
    full_name,
    cpf_cnpj,
    REPLACE(REPLACE(REPLACE(REPLACE(cpf_cnpj, '.', ''), '-', ''), '/', ''), ' ', '') as cpf_limpo,
    email,
    phone,
    password_hash IS NOT NULL as has_password,
    created_at
FROM clients
WHERE REPLACE(REPLACE(REPLACE(REPLACE(cpf_cnpj, '.', ''), '-', ''), '/', ''), ' ') = '42813108863';

-- 4. Listar alguns clientes para ver o formato dos CPFs
SELECT 
    id,
    full_name,
    cpf_cnpj,
    LENGTH(cpf_cnpj) as cpf_length,
    password_hash IS NOT NULL as has_password
FROM clients
ORDER BY created_at DESC
LIMIT 10;

-- 5. Verificar se há clientes sem CPF
SELECT COUNT(*) as clientes_sem_cpf
FROM clients
WHERE cpf_cnpj IS NULL OR cpf_cnpj = '';

-- 6. Verificar políticas RLS na tabela clients
SELECT 
    policyname,
    cmd,
    roles,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'clients';
