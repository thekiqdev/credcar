-- Fix RLS policies for representative_documents table
-- This migration fixes the "new row violates row-level security policy" error

-- First, check if RLS is enabled
ALTER TABLE public.representative_documents ENABLE ROW LEVEL SECURITY;

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
