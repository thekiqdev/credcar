-- Migration: Create partners table for representatives
-- Description: Create table to store partners/sócios for each representative

-- Create the partners table
CREATE TABLE IF NOT EXISTS public.partners (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  representative_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  cpf text NOT NULL,
  email text,
  phone text,
  address text,
  birth_date date,
  nationality text DEFAULT 'Brasileira',
  marital_status text,
  spouse_name text,
  spouse_phone text,
  position text DEFAULT 'Sócio', -- Cargo na empresa
  participation_percentage numeric(5,2) DEFAULT 0.00, -- Percentual de participação
  status text DEFAULT 'Ativo' CHECK (status IN ('Ativo', 'Inativo', 'Pendente de Aprovação', 'Documentos Pendentes')),
  documents_approved boolean DEFAULT FALSE,
  documents_approved_at timestamp with time zone,
  documents_approved_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create partner_documents table
CREATE TABLE IF NOT EXISTS public.partner_documents (
  id serial PRIMARY KEY,
  partner_id uuid NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  document_type text NOT NULL,
  file_url text NOT NULL,
  status text DEFAULT 'Pendente' CHECK (status IN ('Pendente', 'Aprovado', 'Reprovado')),
  uploaded_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  reviewed_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  reviewed_at timestamp with time zone,
  rejection_reason text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers to automatically update updated_at
CREATE TRIGGER update_partners_updated_at BEFORE UPDATE ON public.partners
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable realtime for both tables
ALTER PUBLICATION supabase_realtime ADD TABLE partners;
ALTER PUBLICATION supabase_realtime ADD TABLE partner_documents;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_partners_representative_id ON public.partners(representative_id);
CREATE INDEX IF NOT EXISTS idx_partners_cpf ON public.partners(cpf);
CREATE INDEX IF NOT EXISTS idx_partners_status ON public.partners(status);
CREATE INDEX IF NOT EXISTS idx_partners_documents_approved ON public.partners(documents_approved);

CREATE INDEX IF NOT EXISTS idx_partner_documents_partner_id ON public.partner_documents(partner_id);
CREATE INDEX IF NOT EXISTS idx_partner_documents_status ON public.partner_documents(status);
CREATE INDEX IF NOT EXISTS idx_partner_documents_type ON public.partner_documents(document_type);

-- Grant necessary permissions
GRANT ALL ON partners TO anon;
GRANT ALL ON partners TO authenticated;
GRANT ALL ON partners TO service_role;

GRANT ALL ON partner_documents TO anon;
GRANT ALL ON partner_documents TO authenticated;
GRANT ALL ON partner_documents TO service_role;

-- Add comments for documentation
COMMENT ON TABLE partners IS 'Tabela para armazenar sócios/parceiros de representantes';
COMMENT ON COLUMN partners.representative_id IS 'ID do representante proprietário';
COMMENT ON COLUMN partners.name IS 'Nome completo do sócio';
COMMENT ON COLUMN partners.cpf IS 'CPF do sócio';
COMMENT ON COLUMN partners.email IS 'Email do sócio';
COMMENT ON COLUMN partners.phone IS 'Telefone do sócio';
COMMENT ON COLUMN partners.address IS 'Endereço completo do sócio';
COMMENT ON COLUMN partners.birth_date IS 'Data de nascimento do sócio';
COMMENT ON COLUMN partners.nationality IS 'Nacionalidade do sócio';
COMMENT ON COLUMN partners.marital_status IS 'Estado civil do sócio';
COMMENT ON COLUMN partners.spouse_name IS 'Nome do cônjuge';
COMMENT ON COLUMN partners.spouse_phone IS 'Telefone do cônjuge';
COMMENT ON COLUMN partners.position IS 'Cargo/posição do sócio na empresa';
COMMENT ON COLUMN partners.participation_percentage IS 'Percentual de participação na empresa';
COMMENT ON COLUMN partners.status IS 'Status do sócio';
COMMENT ON COLUMN partners.documents_approved IS 'Flag indicando se documentos foram aprovados';
COMMENT ON COLUMN partners.documents_approved_at IS 'Data de aprovação dos documentos';
COMMENT ON COLUMN partners.documents_approved_by IS 'ID de quem aprovou os documentos';

COMMENT ON TABLE partner_documents IS 'Tabela para armazenar documentos dos sócios';
COMMENT ON COLUMN partner_documents.partner_id IS 'ID do sócio proprietário do documento';
COMMENT ON COLUMN partner_documents.document_type IS 'Tipo do documento';
COMMENT ON COLUMN partner_documents.file_url IS 'URL/caminho do arquivo';
COMMENT ON COLUMN partner_documents.status IS 'Status do documento (Pendente/Aprovado/Reprovado)';
COMMENT ON COLUMN partner_documents.uploaded_at IS 'Data de upload do documento';
COMMENT ON COLUMN partner_documents.reviewed_by IS 'ID de quem revisou o documento';
COMMENT ON COLUMN partner_documents.reviewed_at IS 'Data da revisão';
COMMENT ON COLUMN partner_documents.rejection_reason IS 'Motivo da rejeição (se aplicável)';
