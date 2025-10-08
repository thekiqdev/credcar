-- Migration: Adicionar coluna next_invoice_date para controle de geração automática
-- Data: 2025-01-06
-- Descrição: Adiciona campo para controlar quando a próxima fatura deve ser criada automaticamente

-- Adicionar coluna next_invoice_date para controle de geração automática
ALTER TABLE invoices 
ADD COLUMN next_invoice_date DATE;

-- Criar índice para melhorar performance do cronjob
CREATE INDEX idx_invoices_next_invoice_date 
ON invoices(next_invoice_date) 
WHERE next_invoice_date IS NOT NULL;

-- Adicionar comentário
COMMENT ON COLUMN invoices.next_invoice_date IS 
'Data em que a próxima fatura deve ser criada (15 dias antes do vencimento)';

-- Adicionar comentário na tabela para documentação
COMMENT ON TABLE invoices IS 
'Tabela de faturas com controle automático de geração via campo next_invoice_date';

-- Adicionar configuração inicial para dias de antecedência
INSERT INTO system_config (key, value, description, category, is_active)
VALUES ('payment.invoice.generation.days.advance', '15', 'Dias de antecedência para geração automática de faturas', 'payment', true)
ON CONFLICT (key) DO UPDATE SET 
  value = EXCLUDED.value,
  description = EXCLUDED.description,
  updated_at = NOW();
