-- Script para aplicar/verificar configurações de geração de faturas
-- Execute este script no Supabase Dashboard SQL Editor

-- 1. Verificar configurações atuais
SELECT key, value, description, category, is_active, created_at, updated_at 
FROM system_config 
WHERE key LIKE '%invoice%' OR key LIKE '%payment%'
ORDER BY key;

-- 2. Inserir/atualizar configuração do dia fixo
INSERT INTO system_config (key, value, description, category, is_active) VALUES
('payment.invoice.generation.fixed.day', '20', 'Dia fixo do mês para vencimento de faturas (1-31)', 'payment', true)
ON CONFLICT (key) DO UPDATE SET 
  value = EXCLUDED.value,
  description = EXCLUDED.description,
  updated_at = NOW();

-- 3. Inserir/atualizar configuração de dias de antecedência
INSERT INTO system_config (key, value, description, category, is_active) VALUES
('payment.invoice.generation.days.advance', '7', 'Dias de antecedência para gerar faturas antes do vencimento', 'payment', true)
ON CONFLICT (key) DO UPDATE SET 
  value = EXCLUDED.value,
  description = EXCLUDED.description,
  updated_at = NOW();

-- 4. Verificar configurações após atualização
SELECT key, value, description, category, is_active, created_at, updated_at 
FROM system_config 
WHERE key IN (
  'payment.invoice.generation.fixed.day',
  'payment.invoice.generation.days.advance'
)
ORDER BY key;

-- 5. Verificar faturas recentes para debug
SELECT 
  id, 
  contract_id, 
  installment_number, 
  due_date, 
  next_invoice_date, 
  status,
  created_at
FROM invoices 
ORDER BY id DESC 
LIMIT 10;

-- 6. Verificar se há faturas com vencimento no dia 23
SELECT 
  id, 
  contract_id, 
  installment_number, 
  due_date, 
  next_invoice_date, 
  status
FROM invoices 
WHERE due_date LIKE '%23%'
ORDER BY id DESC 
LIMIT 5;
