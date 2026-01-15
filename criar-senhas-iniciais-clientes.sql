-- ============================================
-- Script para criar senhas iniciais para clientes existentes
-- Execute APÓS aplicar a migração password_hash
-- ============================================

-- IMPORTANTE: Este script cria senha padrão "123456" para todos os clientes sem senha
-- Os clientes devem alterar a senha após o primeiro login

-- Função para criar hash SHA-256 (simulação - use função do Supabase ou Edge Function)
-- Hash de "123456" em SHA-256: 8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92

-- Atualizar clientes sem password_hash com senha padrão "123456"
UPDATE clients
SET password_hash = '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92',
    updated_at = NOW()
WHERE password_hash IS NULL;

-- Verificar quantos clientes foram atualizados
SELECT 
    COUNT(*) as total_clientes,
    COUNT(password_hash) as clientes_com_senha,
    COUNT(*) - COUNT(password_hash) as clientes_sem_senha
FROM clients;

-- Listar clientes que receberam senha padrão
SELECT 
    id,
    full_name,
    cpf_cnpj,
    email,
    CASE 
        WHEN password_hash = '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92' 
        THEN 'Senha padrão (123456) - ALTERAR APÓS PRIMEIRO LOGIN'
        ELSE 'Senha personalizada'
    END as status_senha
FROM clients
WHERE password_hash IS NOT NULL
ORDER BY id;
