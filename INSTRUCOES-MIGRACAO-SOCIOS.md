# INSTRUÇÕES - Aplicar Migração para Tabelas de Sócios

## 📋 Descrição
Esta migração cria as tabelas necessárias para o sistema de gerenciamento de sócios:
- `partners` - Tabela principal para armazenar informações dos sócios
- `partner_documents` - Tabela para armazenar documentos dos sócios

## 🚀 Como Aplicar

### Opção 1: Via Supabase Dashboard (Recomendado)
1. Acesse o Supabase Dashboard
2. Vá para **SQL Editor**
3. Copie e cole o conteúdo do arquivo `MIGRACAO-SOCIOS-SIMPLIFICADA.sql`
4. Execute a query

### Opção 2: Via CLI do Supabase
```bash
# Se você tem o Supabase CLI instalado
supabase db push
```

## 📊 Estrutura das Tabelas (Simplificada)

### Tabela `partners`
- `id` - UUID (chave primária)
- `representative_id` - UUID (FK para profiles)
- `name` - Nome completo do sócio
- `cpf` - CPF do sócio
- `email` - Email do sócio
- `phone` - Telefone do sócio
- `status` - Status do sócio
- `documents_approved` - Flag de aprovação de documentos
- `created_at` - Data de criação
- `updated_at` - Data de atualização

### Tabela `partner_documents`
- `id` - Serial (chave primária)
- `partner_id` - UUID (FK para partners)
- `document_type` - Tipo do documento
- `file_url` - URL do arquivo
- `status` - Status do documento
- `uploaded_at` - Data de upload
- `reviewed_by` - Quem revisou
- `reviewed_at` - Data da revisão
- `rejection_reason` - Motivo da rejeição

## ⚠️ Importante
- A migração inclui índices para performance
- Realtime está habilitado para ambas as tabelas
- Permissões são concedidas para anon, authenticated e service_role
- Triggers automáticos para updated_at
- **Versão simplificada** - removidos campos não utilizados

## 🔍 Verificação
Após aplicar a migração, verifique se as tabelas foram criadas:
```sql
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('partners', 'partner_documents');
```

## 🚨 Solução de Problemas
Se houver erro na migração:
1. Verifique se não há conflitos de nomes
2. Confirme se as permissões estão corretas
3. Verifique se o Supabase está acessível
4. Tente executar a migração em partes menores

## 📝 Arquivo de Migração
Use o arquivo `MIGRACAO-SOCIOS-SIMPLIFICADA.sql` que contém apenas os campos essenciais.
