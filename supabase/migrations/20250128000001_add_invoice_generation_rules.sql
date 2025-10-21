-- Migration: Adicionar regras de geração de faturas
-- Data: 2025-01-28
-- Descrição: Adiciona configurações para regras de geração automática de faturas

-- Adicionar configurações para regras de geração de faturas
INSERT INTO system_config (key, value, description, category, is_active) VALUES
-- Dia fixo do mês para vencimento de faturas (1-31)
('payment.invoice.generation.fixed.day', '20', 'Dia fixo do mês para vencimento de faturas (1-31)', 'payment', true)

ON CONFLICT (key) DO UPDATE SET 
  value = EXCLUDED.value,
  description = EXCLUDED.description,
  updated_at = NOW();

-- Comentários para documentação
COMMENT ON TABLE system_config IS 'Configurações do sistema incluindo regras de geração automática de faturas';
