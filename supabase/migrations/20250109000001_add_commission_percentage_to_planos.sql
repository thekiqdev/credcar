-- Migration: Adicionar coluna commission-percentage à tabela planos
-- Data: 2025-01-09
-- Descrição: Adiciona campo para armazenar a porcentagem de comissão de cada plano

-- Adicionar coluna commission-percentage à tabela planos
ALTER TABLE planos 
ADD COLUMN IF NOT EXISTS "commission-percentage" DECIMAL(5,2) DEFAULT 4.00;

-- Adicionar comentário na coluna
COMMENT ON COLUMN planos."commission-percentage" IS 'Porcentagem de comissão do plano (padrão: 4%)';

-- Atualizar registros existentes com valor padrão de 4%
UPDATE planos 
SET "commission-percentage" = 4.00 
WHERE "commission-percentage" IS NULL;

-- Adicionar constraint para garantir valores válidos (0 a 100)
ALTER TABLE planos 
ADD CONSTRAINT planos_commission_percentage_check 
CHECK ("commission-percentage" >= 0 AND "commission-percentage" <= 100);

-- Criar índice para melhorar performance
CREATE INDEX IF NOT EXISTS idx_planos_commission_percentage 
ON planos("commission-percentage");

-- Atualizar tipos TypeScript (será feito automaticamente pelo Supabase CLI)
-- A coluna será incluída na próxima geração de tipos
