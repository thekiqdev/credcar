-- Create sample clients (only if they don't exist)
INSERT INTO clients (full_name, email, phone, cpf_cnpj, address) 
SELECT * FROM (
  VALUES 
    ('Carlos Oliveira', 'carlos@email.com', '(11) 99999-1111', '123.456.789-01', 'Rua das Flores, 123'),
    ('Maria Santos', 'maria@email.com', '(11) 99999-2222', '987.654.321-02', 'Av. Paulista, 456'),
    ('Pedro Costa', 'pedro@email.com', '(11) 99999-3333', '456.789.123-03', 'Rua Augusta, 789'),
    ('Ana Pereira', 'ana@email.com', '(11) 99999-4444', '789.123.456-04', 'Rua Oscar Freire, 321'),
    ('Roberto Silva', 'roberto@email.com', '(11) 99999-5555', '321.654.987-05', 'Av. Faria Lima, 654')
) AS v(full_name, email, phone, cpf_cnpj, address)
WHERE NOT EXISTS (
  SELECT 1 FROM clients WHERE clients.email = v.email
);

-- Create commission tables (only if they don't exist)
INSERT INTO commission_tables (name, commission_percentage, payment_installments, description)
SELECT * FROM (
  VALUES 
    ('Tabela A', 4.0, 80, 'Tabela padrão de comissão'),
    ('Tabela B', 3.5, 80, 'Tabela reduzida de comissão'),
    ('Tabela C', 5.0, 80, 'Tabela premium de comissão'),
    ('Tabela D', 2.5, 80, 'Tabela mínima de comissão')
) AS v(name, commission_percentage, payment_installments, description)
WHERE NOT EXISTS (
  SELECT 1 FROM commission_tables WHERE commission_tables.name = v.name
);

-- Function to create sample contracts for a representative
CREATE OR REPLACE FUNCTION create_sample_contracts_for_rep(rep_id TEXT)
RETURNS void AS $$
DECLARE
    client_ids INTEGER[];
    commission_table_ids INTEGER[];
    contract_statuses contract_status[] := ARRAY['Ativo'::contract_status, 'Concluído'::contract_status, 'Pendente'::contract_status, 'Cancelado'::contract_status];
    i INTEGER;
BEGIN
    -- Get client IDs
    SELECT ARRAY(SELECT id FROM clients LIMIT 5) INTO client_ids;
    
    -- Get commission table IDs
    SELECT ARRAY(SELECT id FROM commission_tables) INTO commission_table_ids;
    
    -- Create sample contracts with different commission tables
    FOR i IN 1..5 LOOP
        INSERT INTO contracts (
            contract_code,
            client_id,
            representative_id,
            commission_table_id,
            total_value,
            remaining_value,
            total_installments,
            paid_installments,
            status,
            created_at
        ) VALUES (
            'CT-2025-' || LPAD(i::text, 3, '0'),
            client_ids[i],
            rep_id::UUID,
            commission_table_ids[((i-1) % array_length(commission_table_ids, 1)) + 1], -- Cycle through commission tables
            (RANDOM() * 50000 + 20000)::INTEGER, -- Random value between 20k-70k
            (RANDOM() * 30000 + 10000)::INTEGER, -- Random remaining value
            80,
            (RANDOM() * 20)::INTEGER, -- Random paid installments
            contract_statuses[((RANDOM() * 4)::INTEGER % 4) + 1],
            NOW() - (RANDOM() * INTERVAL '90 days') -- Random date in last 90 days
        );
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Enable realtime for new tables (only if not already added)
DO $$
BEGIN
    -- Add clients table to realtime if not already added
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'clients'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE clients;
    END IF;
    
    -- Add contracts table to realtime if not already added
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'contracts'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE contracts;
    END IF;
    
    -- Add commission_tables table to realtime if not already added
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'commission_tables'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE commission_tables;
    END IF;
    
    -- Add withdrawal_requests table to realtime if not already added
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'withdrawal_requests'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE withdrawal_requests;
    END IF;
END $$;