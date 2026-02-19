# Investigação: Visualização de Faturas

## Data da Investigação
2025-01-27

## Problema Reportado
A ação de visualizar fatura na gestão de faturas não está gerando nenhuma visualização.

## Análise do Código Atual

### 1. ClientDashboard (`src/components/dashboard/ClientDashboard.tsx`)

**Status**: ✅ **PARCIALMENTE IMPLEMENTADO**

**Funcionalidades Existentes**:
- ✅ Handler `handleViewInvoice()` (linhas 215-254)
- ✅ Modal de visualização implementado (linhas 1736-1848)
- ✅ Exibe informações básicas da fatura
- ✅ Botões de pagamento (PIX/Boleto)
- ✅ Download básico (arquivo .txt)

**Limitações Identificadas**:
- ❌ Modal simples, sem layout profissional
- ❌ Não gera PDF da fatura
- ❌ Não tem rota pública para acesso direto
- ❌ Visualização limitada a informações básicas

### 2. AdminDashboard (`src/components/dashboard/AdminDashboard.tsx`)

**Status**: ❌ **NÃO IMPLEMENTADO**

**Problema Identificado**:
- ❌ Botão de visualizar existe mas **não tem onClick handler** (linha 5463-5465)
- ❌ Não há modal ou componente de visualização
- ❌ Não há função `handleViewInvoice` no AdminDashboard

**Código Problemático**:
```typescript
// Linha 5463-5465
<Button variant="outline" size="sm">
  <Eye className="h-4 w-4" />
</Button>
// ❌ Sem onClick handler - não faz nada quando clicado
```

### 3. Rotas Públicas (`src/App.tsx`)

**Status**: ❌ **NÃO EXISTE**

**Rotas Existentes**:
- ✅ `/view/:id` - Visualização pública de contrato
- ❌ `/invoice/:id` - **NÃO EXISTE** - Visualização pública de fatura

### 4. Componentes de Visualização

**Status**: ❌ **NÃO EXISTE COMPONENTE REUTILIZÁVEL**

**Componentes Existentes**:
- ✅ `ContractViewOnly.tsx` - Visualização profissional de contratos
- ❌ `InvoiceView.tsx` - **NÃO EXISTE** - Visualização de faturas

### 5. Geração de PDF

**Status**: ❌ **NÃO IMPLEMENTADO**

**Funcionalidades Existentes**:
- ✅ Download básico de texto (.txt) no ClientDashboard
- ❌ Geração de PDF profissional da fatura
- ❌ Layout formatado para impressão

### 6. Permissões e Segurança

**Status**: ⚠️ **PARCIALMENTE IMPLEMENTADO**

**Funcionalidades Existentes**:
- ✅ Cliente só vê suas próprias faturas (via `invoiceService.getByClientId`)
- ⚠️ Admin pode ver todas as faturas mas não há visualização implementada
- ❌ Não há validação de acesso em rota pública (se criada)

## Estrutura de Dados da Fatura

### Campos Disponíveis na Tabela `invoices`:
- `id` - ID da fatura
- `invoice_code` - Código da fatura (ex: FAT-000001)
- `contract_id` - ID do contrato associado
- `installment_number` - Número da parcela
- `amount` - Valor da fatura
- `due_date` - Data de vencimento
- `status` - Status (pending, paid, overdue)
- `paid_at` - Data de pagamento
- `payment_method` - Método de pagamento
- `payment_link_pix` - Link de pagamento PIX
- `payment_link_boleto` - Link de pagamento Boleto
- `asaas_invoice_id` - ID da fatura no ASAAS
- `created_at` - Data de criação
- `updated_at` - Data de atualização

### Relacionamentos:
- `contracts` - Contrato associado
- `contracts.clients` - Cliente do contrato
- `contracts.profiles` - Representante do contrato

## Serviços Disponíveis

### `invoiceService` (`src/lib/supabase.ts`):
- ✅ `getByClientId(clientId)` - Buscar faturas por cliente
- ✅ `getById(invoiceId)` - Buscar fatura por ID com detalhes completos

### `invoiceGenerationService` (`src/lib/invoice-generation.service.ts`):
- ✅ Criação de faturas
- ✅ Validações de negócio
- ❌ Não tem função de geração de PDF

## Conclusão

### Problemas Identificados:
1. ❌ **AdminDashboard**: Botão de visualizar sem ação implementada
2. ❌ **Componente Reutilizável**: Não existe componente de visualização profissional
3. ❌ **Rota Pública**: Não existe rota para acesso direto à fatura
4. ❌ **Geração de PDF**: Não há geração de PDF profissional
5. ⚠️ **Layout**: Modal atual é básico, pode ser melhorado

### Funcionalidades que Funcionam:
- ✅ Cliente consegue visualizar faturas em modal básico
- ✅ Download básico de texto funciona
- ✅ Links de pagamento funcionam
- ✅ Busca de dados funciona corretamente

## Próximos Passos

Ver plano detalhado em: `PLANO-IMPLEMENTACAO-VISUALIZACAO-FATURAS.md`
