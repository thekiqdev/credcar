-- Numeração de contrato: 6 dígitos numéricos a partir de 101100
-- Aplica-se apenas a novos contratos (registros antigos AA0000/CONT-* permanecem inalterados)

-- 1) Garantir sequência e reiniciar a partir de 101100
CREATE SEQUENCE IF NOT EXISTS contract_number_seq START WITH 101100;

-- Se a sequência já existia (formato AA0000 antigo), reposiciona o próximo valor
ALTER SEQUENCE contract_number_seq RESTART WITH 101100;

-- 2) Função RPC: próximo número com 6 dígitos (101100, 101101, ...)
CREATE OR REPLACE FUNCTION generate_contract_number()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  seq_val bigint;
BEGIN
  seq_val := nextval('contract_number_seq');

  IF seq_val > 999999 THEN
    RAISE EXCEPTION 'Limite de números de contrato esgotado (999999)';
  END IF;

  RETURN lpad(seq_val::text, 6, '0');
END;
$$;

GRANT EXECUTE ON FUNCTION generate_contract_number() TO anon, authenticated, service_role;
