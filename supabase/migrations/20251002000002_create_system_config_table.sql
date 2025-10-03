-- Migration: Create system_config table for storing system configurations
-- Date: 02/10/2025
-- Purpose: Centralized configuration storage for Asaas integration and general system settings

-- Create system_config table
CREATE TABLE IF NOT EXISTS public.system_config (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    key VARCHAR(255) NOT NULL UNIQUE,
    value TEXT NOT NULL,
    description TEXT,
    category VARCHAR(100) DEFAULT 'general',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_system_config_key ON public.system_config(key);
CREATE INDEX IF NOT EXISTS idx_system_config_category ON public.system_config(category);
CREATE INDEX IF NOT EXISTS idx_system_config_active ON public.system_config(is_active);

-- Enable Row Level Security
ALTER TABLE public.system_config ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Admin users can read all configurations
CREATE POLICY "Admin users can read system config"
    ON public.system_config
    FOR SELECT
    USING (
        auth.uid() IN (
            SELECT user_id 
            FROM public.profiles 
            WHERE role = 'Admin' AND status = 'Ativo'
        )
    );

-- Admin users can insert configurations
CREATE POLICY "Admin users can insert system config"
    ON public.system_config
    FOR INSERT
    WITH CHECK (
        auth.uid() IN (
            SELECT user_id 
            FROM public.profiles 
            WHERE role = 'Admin' AND status = 'Ativo'
        )
    );

-- Admin users can update configurations
CREATE POLICY "Admin users can update system config"
    ON public.system_config
    FOR UPDATE
    USING (
        auth.uid() IN (
            SELECT user_id 
            FROM public.profiles 
            WHERE role = 'Admin' AND status = 'Ativo'
        )
    )
    WITH CHECK (
        auth.uid() IN (
            SELECT user_id 
            FROM public.profiles 
            WHERE role = 'Admin' AND status = 'Ativo'
        )
    );

-- Admin users can delete configurations
CREATE POLICY "Admin users can delete system config"
    ON public.system_config
    FOR DELETE
    USING (
        auth.uid() IN (
            SELECT user_id 
            FROM public.profiles 
            WHERE role = 'Admin' AND status = 'Ativo'
        )
    );

-- Create function to automatically update updated_at
CREATE OR REPLACE FUNCTION update_system_config_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER trigger_system_config_updated_at
    BEFORE UPDATE ON public.system_config
    FOR EACH ROW
    EXECUTE FUNCTION update_system_config_updated_at();

-- Insert default Asaas configurations
INSERT INTO public.system_config (key, value, description, category) VALUES
-- Asaas API Configuration
('asaas.api.key', '', 'Chave API do Asaas para autenticação', 'asaas'),
('asaas.environment', 'sandbox', 'Ambiente do Asaas: sandbox ou production', 'asaas'),
('asaas.base.url', 'https://www.asaas.com/api/v3', 'URL base da API do Asaas', 'asaas'),
('asaas.webhook.secret', '', 'Chave secreta para validar webhooks do Asaas', 'asaas'),
('asaas.webhook.url', '', 'URL para receber webhooks do Asaas', 'asaas'),

-- Payment Methods Configuration
('payment.default.method', 'PIX', 'Método de pagamento padrão', 'payment'),
('payment.enable.pix', 'true', 'Habilitar pagamento via PIX', 'payment'),
('payment.enable.boleto', 'true', 'Habilitar pagamento via Boleto Bancário', 'payment'),
('payment.enable.credit.card', 'false', 'Habilitar pagamento via Cartão de Crédito', 'payment'),
('payment.default.due.days', '30', 'Dias padrão para vencimento de faturas', 'payment'),
('payment.max.installments', '12', 'Máximo de parcelas permitidas', 'payment'),
('payment.auto.generate.boletos', 'true', 'Gerar boletos automaticamente ao aprovar contrato', 'payment'),

-- Notification Configuration
('notification.send.payment.confirmed', 'true', 'Enviar notificações de pagamento confirmado', 'notification'),
('notification.send.overdue', 'true', 'Enviar notificações de inadimplência', 'notification'),
('notification.days.before.due', '7', 'Dias antes do vencimento para enviar lembrete', 'notification'),

-- System Configuration
('system.name', 'CredCar Finance', 'Nome do sistema', 'system'),
('system.version', '1.1.0', 'Versão atual do sistema', 'system'),
('system.maintenance', 'false', 'Modo de manutenção ativo', 'system')
ON CONFLICT (key) DO NOTHING;

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.system_config TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;

-- Comments for documentation
COMMENT ON TABLE public.system_config IS 'Centralized configuration storage for the CredCar Finance system';
COMMENT ON COLUMN public.system_config.key IS 'Unique configuration key identifier';
COMMENT ON COLUMN public.system_config.value IS 'Configuration value (stored as text)';
COMMENT ON COLUMN public.system_config.description IS 'Human-readable description of the configuration';
COMMENT ON COLUMN public.system_config.category IS 'Configuration category for organization (asaas, payment, notification, system)';
COMMENT ON COLUMN public.system_config.is_active IS 'Whether this configuration is currently active';
