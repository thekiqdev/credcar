-- Modelo de contrato padrão: permite marcar um único modelo como padrão,
-- que será carregado automaticamente na criação de novos contratos.

-- 1) Coluna is_default
ALTER TABLE contract_templates
  ADD COLUMN IF NOT EXISTS is_default BOOLEAN NOT NULL DEFAULT false;

-- 2) Garantir que apenas um modelo seja padrão (índice único parcial)
CREATE UNIQUE INDEX IF NOT EXISTS idx_contract_templates_single_default
  ON contract_templates (is_default)
  WHERE is_default = true;

-- 3) Função atômica para definir o modelo padrão (desmarca os demais)
CREATE OR REPLACE FUNCTION set_default_contract_template(template_id integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM contract_templates WHERE id = template_id) THEN
    RAISE EXCEPTION 'Modelo de contrato % não encontrado', template_id;
  END IF;

  UPDATE contract_templates SET is_default = false WHERE is_default = true AND id <> template_id;
  UPDATE contract_templates SET is_default = true, updated_at = NOW() WHERE id = template_id;
END;
$$;

GRANT EXECUTE ON FUNCTION set_default_contract_template(integer) TO anon, authenticated, service_role;
