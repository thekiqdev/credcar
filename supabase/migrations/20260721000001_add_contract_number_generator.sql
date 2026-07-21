-- Geraùùo de nùmero de contrato no formato AA0000 (2 letras + 4 dùgitos)
-- Sequùncia atùmica: AA0001..AA9999, AB0001..AB9999, ..., ZZ9999 (~6,75 milhùes)

-- 1) Sequùncia dedicada
CREATE SEQUENCE IF NOT EXISTS contract_number_seq START WITH 1;

-- 2) Funùùo RPC para gerar o prùximo nùmero (atùmica; sem colisùo em chamadas concorrentes)
CREATE OR REPLACE FUNCTION generate_contract_number()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  seq_val bigint;
  block int;
  num int;
  letter1 char(1);
  letter2 char(1);
BEGIN
  seq_val := nextval('contract_number_seq');

  -- Cada bloco de letras comporta 9999 nùmeros (0001..9999)
  block := ((seq_val - 1) / 9999)::int;
  num := ((seq_val - 1) % 9999)::int + 1;

  IF block >= 676 THEN
    RAISE EXCEPTION 'Limite de nùmeros de contrato esgotado (ZZ9999)';
  END IF;

  letter1 := chr(65 + (block / 26));
  letter2 := chr(65 + (block % 26));

  RETURN letter1 || letter2 || lpad(num::text, 4, '0');
END;
$$;

-- 3) Permitir chamada pelo frontend (anon/authenticated)
GRANT EXECUTE ON FUNCTION generate_contract_number() TO anon, authenticated, service_role;

-- 4) Garantir unicidade de contract_number (ignora se jù existir)
DO $$
BEGIN
  ALTER TABLE contracts ADD CONSTRAINT contracts_contract_number_unique UNIQUE (contract_number);
EXCEPTION
  WHEN duplicate_table THEN NULL;
  WHEN duplicate_object THEN NULL;
  WHEN unique_violation THEN
    RAISE NOTICE 'contract_number possui duplicados em dados antigos; constraint n„o criada';
END $$;
