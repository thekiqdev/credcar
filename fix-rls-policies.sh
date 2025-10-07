#!/bin/bash

# Script para corrigir políticas RLS da tabela representative_documents
# Execute este script na Hostinger VPS

echo "🔧 Corrigindo políticas RLS da tabela representative_documents..."

# 1. Conectar ao banco de dados PostgreSQL
echo "📊 Conectando ao banco de dados..."

# Executar SQL diretamente no banco
psql -h localhost -U postgres -d postgres << 'EOF'

-- Fix RLS policies for representative_documents table
-- This migration fixes the "new row violates row-level security policy" error

-- First, check if RLS is enabled
ALTER TABLE public.representative_documents ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can insert their own documents" ON public.representative_documents;
DROP POLICY IF EXISTS "Users can view their own documents" ON public.representative_documents;
DROP POLICY IF EXISTS "Users can update their own documents" ON public.representative_documents;
DROP POLICY IF EXISTS "Service role has full access" ON public.representative_documents;
DROP POLICY IF EXISTS "Anon users can insert documents" ON public.representative_documents;

-- Create policy for authenticated users to insert their own documents
CREATE POLICY "Users can insert their own documents" ON public.representative_documents
    FOR INSERT 
    TO authenticated
    WITH CHECK (
        representative_id = auth.uid()
    );

-- Create policy for authenticated users to view their own documents
CREATE POLICY "Users can view their own documents" ON public.representative_documents
    FOR SELECT 
    TO authenticated
    USING (
        representative_id = auth.uid()
    );

-- Create policy for authenticated users to update their own documents
CREATE POLICY "Users can update their own documents" ON public.representative_documents
    FOR UPDATE 
    TO authenticated
    USING (
        representative_id = auth.uid()
    )
    WITH CHECK (
        representative_id = auth.uid()
    );

-- Create policy for service_role to have full access (for admin operations)
CREATE POLICY "Service role has full access" ON public.representative_documents
    FOR ALL 
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Create policy for anon users to insert documents (for public uploads)
CREATE POLICY "Anon users can insert documents" ON public.representative_documents
    FOR INSERT 
    TO anon
    WITH CHECK (true);

-- Grant necessary permissions
GRANT ALL ON public.representative_documents TO anon;
GRANT ALL ON public.representative_documents TO authenticated;
GRANT ALL ON public.representative_documents TO service_role;

-- Log migration completion
INSERT INTO public.migration_log (migration_name, applied_at) 
VALUES ('fix_representative_documents_rls', NOW())
ON CONFLICT DO NOTHING;

-- Verify policies were created
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'representative_documents';

EOF

if [ $? -eq 0 ]; then
    echo "✅ Políticas RLS corrigidas com sucesso!"
    echo "🧪 Teste o upload novamente no frontend"
else
    echo "❌ Erro ao aplicar correções RLS!"
    echo "🔍 Verifique os logs do PostgreSQL"
fi
