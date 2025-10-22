-- Script para aplicar a migração de regras de geração de faturas
-- Execute este script no Supabase Dashboard ou via CLI

-- Adicionar configurações para regras de geração de faturas
INSERT INTO system_config (key, value, description, category, is_active) VALUES
-- Dia fixo do mês para vencimento de faturas (1-31)
('payment.invoice.generation.fixed.day', '20', 'Dia fixo do mês para vencimento de faturas (1-31)', 'payment', true)

ON CONFLICT (key) DO UPDATE SET 
  value = EXCLUDED.value,
  description = EXCLUDED.description,
  updated_at = NOW();

-- Verificar se as configurações foram criadas
SELECT key, value, description 
FROM system_config 
WHERE category = 'payment' 
AND key LIKE '%invoice.generation%'
ORDER BY key;
