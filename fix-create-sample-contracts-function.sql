-- Correção da função create_sample_contracts_for_rep
-- Resolve o erro de tipo: column "status" is of type contract_status but expression is of type text
-- Aplicar este script no Supabase SQL Editor

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
