-- Migration: Add extended client fields
-- Description: Add new fields for client identification, professional data, and personal references

-- Add identification fields
ALTER TABLE clients
ADD COLUMN rg TEXT,
ADD COLUMN birth_date DATE,
ADD COLUMN nationality TEXT,
ADD COLUMN marital_status TEXT,
ADD COLUMN spouse_name TEXT,
ADD COLUMN spouse_phone TEXT;

-- Add professional fields
ALTER TABLE clients
ADD COLUMN company TEXT,
ADD COLUMN salary DECIMAL(10,2),
ADD COLUMN position TEXT;

-- Add personal reference fields
ALTER TABLE clients
ADD COLUMN reference_name TEXT,
ADD COLUMN reference_address TEXT,
ADD COLUMN reference_phone TEXT;

-- Add comments for documentation
COMMENT ON COLUMN clients.rg IS 'Registro Geral do cliente';
COMMENT ON COLUMN clients.birth_date IS 'Data de nascimento do cliente';
COMMENT ON COLUMN clients.nationality IS 'Nacionalidade do cliente';
COMMENT ON COLUMN clients.marital_status IS 'Estado civil do cliente';
COMMENT ON COLUMN clients.spouse_name IS 'Nome do cônjuge';
COMMENT ON COLUMN clients.spouse_phone IS 'Telefone do cônjuge';
COMMENT ON COLUMN clients.company IS 'Empresa onde o cliente trabalha';
COMMENT ON COLUMN clients.salary IS 'Salário do cliente';
COMMENT ON COLUMN clients.position IS 'Cargo do cliente na empresa';
COMMENT ON COLUMN clients.reference_name IS 'Nome da pessoa de referência';
COMMENT ON COLUMN clients.reference_address IS 'Endereço da pessoa de referência';
COMMENT ON COLUMN clients.reference_phone IS 'Telefone da pessoa de referência';

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_clients_rg ON clients (rg);
CREATE INDEX IF NOT EXISTS idx_clients_birth_date ON clients (birth_date);
CREATE INDEX IF NOT EXISTS idx_clients_company ON clients (company);
CREATE INDEX IF NOT EXISTS idx_clients_reference_name ON clients (reference_name);
