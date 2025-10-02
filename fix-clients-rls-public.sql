-- ==========================================
-- CORREÇÃO FINAL - POLÍTICAS RLS PARA CLIENTS
-- CredCar Finance - Fix Clients RLS (PUBLIC ACCESS)
-- ==========================================
-- Execute este script no SQL Editor do Supabase
-- Dashboard: https://supabase.com/dashboard/project/cgystsylstnkgfgbqoel
-- ==========================================

-- 1. Verificar estado atual
SELECT 'Verificando estado atual das políticas...' as status;

-- 2. Listar políticas existentes
SELECT 
    policyname,
    cmd,
    roles,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'clients'
ORDER BY policyname;

-- 3. Habilitar RLS na tabela clients
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

-- 4. Remover TODAS as políticas existentes
DROP POLICY IF EXISTS "Admins can read all clients" ON public.clients;
DROP POLICY IF EXISTS "Authenticated users can read clients" ON public.clients;
DROP POLICY IF EXISTS "Authenticated users can insert clients" ON public.clients;
DROP POLICY IF EXISTS "Authenticated users can update clients" ON public.clients;
DROP POLICY IF EXISTS "Authenticated users can delete clients" ON public.clients;
DROP POLICY IF EXISTS "Representatives can read their clients" ON public.clients;
DROP POLICY IF EXISTS "Representatives can manage their clients" ON public.clients;
DROP POLICY IF EXISTS "Allow authenticated users to read clients" ON public.clients;
DROP POLICY IF EXISTS "Allow authenticated users to insert clients" ON public.clients;
DROP POLICY IF EXISTS "Allow authenticated users to update clients" ON public.clients;
DROP POLICY IF EXISTS "Allow authenticated users to delete clients" ON public.clients;
DROP POLICY IF EXISTS "Public can read clients" ON public.clients;
DROP POLICY IF EXISTS "Public can insert clients" ON public.clients;
DROP POLICY IF EXISTS "Public can update clients" ON public.clients;
DROP POLICY IF EXISTS "Public can delete clients" ON public.clients;

-- 5. Criar políticas que permitem acesso público (temporário)

-- 5.1. SELECT - Qualquer pessoa pode ler clientes
CREATE POLICY "Public can read clients" 
    ON public.clients FOR SELECT 
    USING (true);

-- 5.2. INSERT - Qualquer pessoa pode inserir clientes
CREATE POLICY "Public can insert clients" 
    ON public.clients FOR INSERT 
    WITH CHECK (true);

-- 5.3. UPDATE - Qualquer pessoa pode atualizar clientes
CREATE POLICY "Public can update clients" 
    ON public.clients FOR UPDATE 
    USING (true);

-- 5.4. DELETE - Qualquer pessoa pode deletar clientes
CREATE POLICY "Public can delete clients" 
    ON public.clients FOR DELETE 
    USING (true);

-- 6. Verificar se as políticas foram criadas
SELECT 'Políticas criadas. Verificando...' as status;

SELECT 
    policyname,
    cmd,
    roles,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'clients' AND schemaname = 'public'
ORDER BY policyname;

-- 7. Teste de inserção (simulação)
SELECT 'Testando inserção...' as status;

-- Tentar inserir um cliente de teste
INSERT INTO public.clients (full_name, email, phone, cpf_cnpj, address)
VALUES ('Teste RLS Public', 'teste-rls-public@exemplo.com', '(11) 99999-9999', '123.456.789-01', 'Rua Teste Public, 123')
RETURNING id, full_name, email;

-- Limpar o cliente de teste
DELETE FROM public.clients WHERE email = 'teste-rls-public@exemplo.com';

-- 8. Mensagem final
SELECT 'Políticas RLS públicas para clients criadas e testadas com sucesso!' as status;
