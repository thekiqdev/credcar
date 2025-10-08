-- Migration: Criar tabela para logs de execução do cronjob
-- Data: 2025-01-06
-- Descrição: Tabela para registrar execuções do cronjob de geração automática de faturas

CREATE TABLE public.cron_execution_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    execution_date TIMESTAMP WITH TIME ZONE NOT NULL,
    duration_ms INTEGER NOT NULL,
    invoices_processed INTEGER NOT NULL DEFAULT 0,
    invoices_created INTEGER NOT NULL DEFAULT 0,
    invoices_failed INTEGER NOT NULL DEFAULT 0,
    errors JSONB DEFAULT '[]'::jsonb,
    details JSONB DEFAULT '[]'::jsonb,
    status TEXT NOT NULL CHECK (status IN ('success', 'partial_success', 'failed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar índices para melhorar performance
CREATE INDEX idx_cron_execution_logs_date ON public.cron_execution_logs(execution_date DESC);
CREATE INDEX idx_cron_execution_logs_status ON public.cron_execution_logs(status);

-- Habilitar RLS
ALTER TABLE public.cron_execution_logs ENABLE ROW LEVEL SECURITY;

-- Políticas de segurança
CREATE POLICY "Enable read access for authenticated users" ON public.cron_execution_logs
FOR SELECT TO authenticated USING (true);

CREATE POLICY "Enable insert for service role only" ON public.cron_execution_logs
FOR INSERT TO service_role WITH CHECK (true);

-- Permissões
GRANT ALL ON public.cron_execution_logs TO postgres;
GRANT SELECT ON public.cron_execution_logs TO authenticated;
GRANT INSERT ON public.cron_execution_logs TO service_role;

-- Comentários
COMMENT ON TABLE public.cron_execution_logs IS 'Logs de execução do cronjob de geração automática de faturas';
COMMENT ON COLUMN public.cron_execution_logs.execution_date IS 'Data e hora da execução do cronjob';
COMMENT ON COLUMN public.cron_execution_logs.duration_ms IS 'Duração da execução em milissegundos';
COMMENT ON COLUMN public.cron_execution_logs.invoices_processed IS 'Número de faturas processadas';
COMMENT ON COLUMN public.cron_execution_logs.invoices_created IS 'Número de faturas criadas com sucesso';
COMMENT ON COLUMN public.cron_execution_logs.invoices_failed IS 'Número de faturas que falharam';
COMMENT ON COLUMN public.cron_execution_logs.errors IS 'Lista de erros encontrados (JSON)';
COMMENT ON COLUMN public.cron_execution_logs.details IS 'Detalhes de cada fatura processada (JSON)';
COMMENT ON COLUMN public.cron_execution_logs.status IS 'Status geral da execução: success, partial_success, failed';
