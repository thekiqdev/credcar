-- Script para corrigir a sequência da tabela contracts
-- Arquivo: fix-contracts-id-sequence.sql

-- Execute este script no Supabase SQL Editor

-- 1. Verificar se a sequência existe
SELECT 
    sequence_name,
    last_value,
    start_value,
    increment_by
FROM information_schema.sequences 
WHERE sequence_name LIKE '%contracts%';

-- 2. Se a sequência não existir, criar uma nova
DO $$ 
BEGIN
    -- Verificar se a sequência contracts_id_seq existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.sequences 
        WHERE sequence_name = 'contracts_id_seq'
    ) THEN
        -- Criar nova sequência
        CREATE SEQUENCE public.contracts_id_seq
        START WITH 1
        INCREMENT BY 1
        NO MINVALUE
        NO MAXVALUE
        CACHE 1;
        
        -- Definir como padrão para a coluna id
        ALTER TABLE public.contracts 
        ALTER COLUMN id SET DEFAULT nextval('public.contracts_id_seq'::regclass);
        
        -- Definir o proprietário da sequência
        ALTER SEQUENCE public.contracts_id_seq OWNED BY public.contracts.id;
        
        RAISE NOTICE 'Sequência contracts_id_seq criada com sucesso';
    ELSE
        RAISE NOTICE 'Sequência contracts_id_seq já existe';
    END IF;
END $$;

-- 3. Verificar o próximo ID disponível
SELECT MAX(id) as max_id FROM public.contracts;

-- 4. Ajustar a sequência para o próximo ID disponível
SELECT setval('public.contracts_id_seq', COALESCE((SELECT MAX(id) FROM public.contracts), 0) + 1, false);

-- 5. Verificar se a sequência está funcionando
SELECT nextval('public.contracts_id_seq') as next_id;

-- 6. Testar inserção de um contrato de teste
INSERT INTO public.contracts (
    contract_code,
    representative_id,
    client_id,
    commission_table_id,
    credit_amount,
    total_value,
    remaining_value,
    total_installments,
    first_payment,
    remaining_payments,
    paid_installments,
    status,
    contract_content
) VALUES (
    'TEST-SEQUENCE-' || EXTRACT(EPOCH FROM NOW()),
    'test-rep-id',
    1,
    1,
    '1000',
    '1000',
    '980',
    1,
    '1000',
    '0',
    0,
    'Pendente',
    'Teste de sequência ID'
) RETURNING id, contract_code;

-- 7. Limpar o contrato de teste
DELETE FROM public.contracts WHERE contract_code LIKE 'TEST-SEQUENCE-%';

-- 8. Verificar se tudo está funcionando
SELECT 
    'Sequência corrigida com sucesso!' as status,
    (SELECT MAX(id) FROM public.contracts) as ultimo_id,
    (SELECT last_value FROM contracts_id_seq) as proximo_id;


