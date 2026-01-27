# Investigação: Erro no Login de Organizador sem Documentos Aprovados

## Data da Investigação
2025-01-28

## Problema Reportado
Ao tentar fazer login como organizador (representante), o sistema apresenta erro ao tentar criar contratos de exemplo. O erro ocorre porque o organizador possui status "Ativo" mas `documents_approved: false`.

## Logs do Erro

```
🔐 Attempting login for: abradock.consorcios@gmail.com
✅ Representative found: Odhara Mariano da Paz Status: Ativo
🔍 Documents Approved: false
No contracts found, creating sample data...
Error creating sample contracts: {
  code: '42804', 
  details: null, 
  hint: 'You will need to rewrite or cast the expression.', 
  message: 'column "status" is of type contract_status but expression is of type text'
}
```

## Análise dos Problemas Identificados

### Problema 1: Erro de Tipo na Função `create_sample_contracts_for_rep`

**Localização**: `supabase/migrations/20250125000001_create_sample_data.sql` (linhas 29-70)

**Código Problemático**:
```sql
CREATE OR REPLACE FUNCTION create_sample_contracts_for_rep(rep_id TEXT)
RETURNS void AS $
DECLARE
    contract_statuses TEXT[] := ARRAY['Ativo', 'Concluído', 'Pendente', 'Cancelado'];
    ...
BEGIN
    ...
    INSERT INTO contracts (
        ...
        status,
        ...
    ) VALUES (
        ...
        contract_statuses[((RANDOM() * 4)::INTEGER % 4) + 1],
        ...
    );
END;
```

**Problema**: 
- O campo `status` na tabela `contracts` é do tipo ENUM `contract_status`
- A função está usando um array `TEXT[]` e tentando inserir valores TEXT diretamente no campo ENUM
- PostgreSQL não permite conversão implícita de TEXT para ENUM, causando o erro `42804`

**Valores Válidos do ENUM `contract_status`**:
- "Ativo"
- "Concluído"
- "Faturado"
- "Cancelado"
- "Pendente"
- "Em Análise"
- "Em Atraso"
- "Aprovado"
- "Reprovado"

### Problema 2: Inconsistência de Estado do Representante

**Situação Identificada**:
- Representante: `Odhara Mariano da Paz` (ID: `9b182815-a769-49fa-a0f9-2547c0df0df9`)
- Status: `"Ativo"`
- `documents_approved`: `false`

**Impacto**:
1. O representante consegue fazer login porque o status é "Ativo"
2. O sistema tenta criar contratos de exemplo automaticamente quando não há contratos
3. A criação de contratos falha por dois motivos:
   - Erro de tipo na função SQL (Problema 1)
   - Lógica de negócio impede criação de contratos quando `documents_approved: false` (verificado em `ContractCreationFlow.tsx` linhas 187-191)

**Código que Verifica Documentos Aprovados**:
```typescript
// src/components/sales/ContractCreationFlow.tsx (linhas 187-191)
if (!freshRepresentative.documents_approved) {
  throw new Error(
    "Documentos não aprovados. Entre em contato com o administrador.",
  );
}
```

### Problema 3: Lógica de Criação Automática de Contratos de Exemplo

**Localização**: `src/lib/supabase.ts` (linhas 1706-1709)

**Código**:
```typescript
// If no contracts exist, create sample data for demo
if (!contracts || contracts.length === 0) {
  console.log("No contracts found, creating sample data...");
  await this.createSampleContractsForRep(representativeId);
  ...
}
```

**Problema**:
- O sistema tenta criar contratos de exemplo automaticamente sem verificar se o representante tem documentos aprovados
- Isso viola a regra de negócio que exige documentos aprovados para criar contratos
- O erro ocorre silenciosamente (apenas log), mas não há tratamento adequado

## Alternativas de Correção

### Alternativa 1: Corrigir a Função SQL (Recomendada)

**Ação**: Modificar a função `create_sample_contracts_for_rep` para fazer cast explícito dos valores TEXT para o tipo ENUM `contract_status`.

**Vantagens**:
- Resolve o erro de tipo imediatamente
- Mantém a funcionalidade de criar contratos de exemplo
- Não requer mudanças na lógica de negócio

**Desvantagens**:
- Ainda permite criar contratos para representantes sem documentos aprovados (se não houver validação adicional)

**Implementação**:
```sql
CREATE OR REPLACE FUNCTION create_sample_contracts_for_rep(rep_id TEXT)
RETURNS void AS $
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
            commission_table_ids[((i-1) % array_length(commission_table_ids, 1)) + 1],
            (RANDOM() * 50000 + 20000)::INTEGER,
            (RANDOM() * 30000 + 10000)::INTEGER,
            80,
            (RANDOM() * 20)::INTEGER,
            contract_statuses[((RANDOM() * 4)::INTEGER % 4) + 1],
            NOW() - (RANDOM() * INTERVAL '90 days')
        );
    END LOOP;
END;
$$ LANGUAGE plpgsql;
```

### Alternativa 2: Adicionar Validação de Documentos Aprovados

**Ação**: Modificar `getRepresentativeDashboardData` para verificar `documents_approved` antes de tentar criar contratos de exemplo.

**Vantagens**:
- Respeita a regra de negócio
- Previne criação de contratos para representantes sem documentos aprovados
- Mantém consistência com a lógica em `ContractCreationFlow`

**Desvantagens**:
- Representantes sem documentos aprovados não terão dados de exemplo no dashboard
- Requer verificação adicional no banco de dados

**Implementação**:
```typescript
// src/lib/supabase.ts - getRepresentativeDashboardData
async getRepresentativeDashboardData(representativeId: string) {
  try {
    // ... código existente ...
    
    // Verificar se o representante tem documentos aprovados antes de criar contratos de exemplo
    const { data: representative } = await supabase
      .from("profiles")
      .select("documents_approved, status")
      .eq("id", representativeId)
      .single();
    
    // If no contracts exist, create sample data for demo (only if documents are approved)
    if ((!contracts || contracts.length === 0) && 
        representative?.documents_approved === true) {
      console.log("No contracts found, creating sample data...");
      await this.createSampleContractsForRep(representativeId);
      // ... resto do código ...
    }
  }
}
```

### Alternativa 3: Corrigir Inconsistência de Estado (Recomendada para Resolver o Caso Específico)

**Ação**: Atualizar o status do representante para refletir o estado real dos documentos.

**Opções**:
- **Opção A**: Se os documentos estão realmente pendentes, alterar status para "Documentos Pendentes"
- **Opção B**: Se os documentos estão aprovados mas o campo não foi atualizado, atualizar `documents_approved: true` e registrar `documents_approved_at` e `documents_approved_by`

**Vantagens**:
- Resolve a inconsistência de dados
- Previne problemas futuros
- Mantém integridade referencial

**Desvantagens**:
- Requer investigação manual para determinar o estado correto
- Pode afetar outros representantes com o mesmo problema

**Implementação**:
```sql
-- Opção A: Se documentos estão pendentes
UPDATE profiles 
SET status = 'Documentos Pendentes'::user_status
WHERE id = '9b182815-a769-49fa-a0f9-2547c0df0df9' 
  AND documents_approved = false 
  AND status = 'Ativo';

-- Opção B: Se documentos estão aprovados (requer verificação manual)
UPDATE profiles 
SET 
  documents_approved = true,
  documents_approved_at = NOW(),
  documents_approved_by = '<ID_DO_ADMIN_QUE_APROVOU>'
WHERE id = '9b182815-a769-49fa-a0f9-2547c0df0df9' 
  AND documents_approved = false 
  AND status = 'Ativo';
```

### Alternativa 4: Combinação das Alternativas 1, 2 e 3 (Recomendada)

**Ação**: 
1. Corrigir a função SQL (Alternativa 1)
2. Adicionar validação de documentos aprovados (Alternativa 2)
3. Investigar e corrigir inconsistências de estado (Alternativa 3)

**Vantagens**:
- Resolve todos os problemas identificados
- Previne problemas futuros
- Mantém consistência de dados e regras de negócio

**Desvantagens**:
- Requer mais trabalho de implementação
- Requer investigação manual para corrigir estados inconsistentes

## Recomendações

### Imediatas (Corrigir Erro Atual)
1. **Aplicar Alternativa 1**: Corrigir a função SQL para fazer cast explícito do ENUM
2. **Aplicar Alternativa 2**: Adicionar validação antes de criar contratos de exemplo

### Médio Prazo (Prevenir Problemas Futuros)
1. **Aplicar Alternativa 3**: Criar script para identificar e corrigir inconsistências de estado
2. **Adicionar Constraint no Banco**: Criar trigger ou constraint para garantir que `status = 'Ativo'` só seja permitido quando `documents_approved = true`
3. **Melhorar Logging**: Adicionar logs mais detalhados quando a criação de contratos de exemplo falhar

### Longo Prazo (Melhorias Arquiteturais)
1. **Revisar Fluxo de Aprovação**: Garantir que o status seja atualizado automaticamente quando documentos são aprovados/reprovados
2. **Adicionar Testes**: Criar testes unitários e de integração para validar essas regras de negócio
3. **Documentação**: Documentar claramente as regras de negócio relacionadas a documentos e status de representantes

## Scripts de Verificação

### Verificar Representantes com Inconsistência de Estado
```sql
SELECT 
  id,
  full_name,
  email,
  status,
  documents_approved,
  documents_approved_at,
  documents_approved_by
FROM profiles
WHERE status = 'Ativo' 
  AND documents_approved = false;
```

### Verificar Documentos do Representante Específico
```sql
SELECT 
  rd.document_type,
  rd.status as document_status,
  rd.uploaded_at,
  rd.reviewed_at,
  rd.reviewed_by
FROM representative_documents rd
WHERE rd.representative_id = '9b182815-a769-49fa-a0f9-2547c0df0df9'
ORDER BY rd.document_type;
```

## Conclusão

O erro ocorre devido a uma combinação de fatores:
1. **Erro técnico**: Função SQL tentando inserir TEXT em campo ENUM sem cast
2. **Inconsistência de dados**: Representante com status "Ativo" mas documentos não aprovados
3. **Falta de validação**: Sistema não verifica documentos aprovados antes de criar contratos de exemplo

A solução recomendada é aplicar a **Alternativa 4** (combinação das três primeiras alternativas) para resolver o problema atual e prevenir problemas futuros.
