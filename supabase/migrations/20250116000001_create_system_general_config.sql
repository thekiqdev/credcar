-- Migration: Create system_general_config table
-- Description: Create table to store general system configuration settings

-- Drop table if exists to ensure clean creation
DROP TABLE IF EXISTS system_general_config;

-- Create the system_general_config table
CREATE TABLE system_general_config (
  id SERIAL PRIMARY KEY,
  system_name TEXT DEFAULT 'CredCar',
  company_name TEXT DEFAULT 'CredCar Soluções Financeiras',
  company_address TEXT DEFAULT 'Rua das Empresas, 123 - Centro - São Paulo/SP',
  company_phone TEXT DEFAULT '(11) 3000-0000',
  company_email TEXT DEFAULT 'contato@credcar.com.br',
  company_cnpj TEXT DEFAULT '12.345.678/0001-90',
  logo_url TEXT DEFAULT '',
  logo_file_path TEXT DEFAULT '', -- Path to uploaded logo file
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create a trigger to automatically update the updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_system_general_config_updated_at 
    BEFORE UPDATE ON system_general_config 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Insert default configuration
INSERT INTO system_general_config (
  system_name,
  company_name,
  company_address,
  company_phone,
  company_email,
  company_cnpj,
  logo_url,
  logo_file_path
) VALUES (
  'CredCar',
  'CredCar Soluções Financeiras',
  'Rua das Empresas, 123 - Centro - São Paulo/SP',
  '(11) 3000-0000',
  'contato@credcar.com.br',
  '12.345.678/0001-90',
  '',
  ''
);

-- Add comments for documentation
COMMENT ON TABLE system_general_config IS 'Tabela para armazenar configurações gerais do sistema';
COMMENT ON COLUMN system_general_config.system_name IS 'Nome do sistema';
COMMENT ON COLUMN system_general_config.company_name IS 'Razão social da empresa';
COMMENT ON COLUMN system_general_config.company_address IS 'Endereço completo da empresa';
COMMENT ON COLUMN system_general_config.company_phone IS 'Telefone da empresa';
COMMENT ON COLUMN system_general_config.company_email IS 'Email corporativo da empresa';
COMMENT ON COLUMN system_general_config.company_cnpj IS 'CNPJ da empresa';
COMMENT ON COLUMN system_general_config.logo_url IS 'URL do logo (para compatibilidade)';
COMMENT ON COLUMN system_general_config.logo_file_path IS 'Caminho do arquivo do logo no servidor';

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_system_general_config_id ON system_general_config (id);
