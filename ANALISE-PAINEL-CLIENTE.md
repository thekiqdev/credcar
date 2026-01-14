# Análise do Painel de Cliente - CredCar

## 📋 Resumo Executivo

O painel de cliente (`ClientDashboard`) está parcialmente implementado com interface visual completa, mas **não está funcional** pois utiliza dados mockados (hardcoded) ao invés de buscar informações reais do banco de dados. A autenticação de cliente existe mas é simplificada e não integrada adequadamente.

---

## 🔍 Estado Atual

### ✅ O que já existe:

1. **Componente Principal**: `src/components/dashboard/ClientDashboard.tsx`
   - Interface visual completa com 3 abas principais:
     - Resumo do Consórcio
     - Faturas
     - Antecipações
   - Layout responsivo e moderno
   - Componentes UI funcionais (cards, tabelas, dialogs)

2. **Autenticação**: `src/components/auth/ClientLogin.tsx`
   - Formulário de login com CPF e senha
   - Validação de CPF com máscara
   - Interface visual completa

3. **Serviço de Cliente**: `src/lib/supabase.ts` - `clientService`
   - `authenticateWithCpf()` - Autenticação básica
   - `getById()` - Buscar cliente por ID
   - `getByRepresentative()` - Buscar clientes por representante
   - `updatePassword()` - Atualizar senha (armazenada em localStorage)

4. **Rota Configurada**: `src/App.tsx`
   - Rota `/cliente` protegida com `ProtectedRoute`
   - Acesso restrito a usuários com role "Cliente"

### ❌ O que está faltando:

1. **Dados Mockados**: O componente usa dados estáticos ao invés de buscar do banco
   - `clientData` com valores fixos
   - `invoices` com array hardcoded
   - `anticipationRequests` com array hardcoded

2. **Integração com Banco de Dados**:
   - Não busca contratos do cliente logado
   - Não busca faturas reais do banco
   - Não busca solicitações de antecipação
   - Não calcula valores pagos/pendentes dinamicamente

3. **Serviços Faltantes**:
   - Não existe `getContractsByClientId()` no `contractService`
   - Não existe `getInvoicesByClientId()` no `invoiceService`
   - Não existe serviço de antecipações (`anticipationService`)
   - Não existe cálculo de progresso de pagamento

4. **Autenticação Incompleta**:
   - Login usa autenticação mockada (cria usuário fake)
   - Não valida senha real do banco de dados
   - Não há campo `password` na tabela `clients`
   - Senha armazenada em localStorage (inseguro)

5. **Funcionalidades Não Implementadas**:
   - Visualizar detalhes de faturas
   - Download de faturas em PDF
   - Filtros de faturas (por status, data, etc.)
   - Exportação de dados
   - Solicitação de antecipação (apenas mostra alert)
   - Visualização de detalhes de antecipação
   - Notificações (botão existe mas não funciona)
   - Cálculo automático de valores de antecipação

---

## 🛠️ O que precisa ser implementado

### 1. Autenticação de Cliente (Prioridade: ALTA)

**Problema**: A autenticação atual cria um usuário mockado e não valida credenciais reais.

**Solução**:
- Adicionar campo `password_hash` na tabela `clients` no Supabase
- Implementar hash de senha (bcrypt ou similar)
- Modificar `ClientLogin.tsx` para usar `clientService.authenticateWithCpf()` corretamente
- Criar usuário no sistema de autenticação do Supabase ou usar sessão customizada
- Armazenar sessão do cliente de forma segura

**Arquivos a modificar**:
- `src/components/auth/ClientLogin.tsx` (linhas 48-98)
- `src/lib/supabase.ts` - `clientService.authenticateWithCpf()` (linhas 3239-3285)
- Criar migration SQL para adicionar campo `password_hash` na tabela `clients`

---

### 2. Buscar Contratos do Cliente (Prioridade: ALTA)

**Problema**: Não existe método para buscar contratos de um cliente específico.

**Solução**: Adicionar método no `contractService`:

```typescript
// Adicionar em src/lib/supabase.ts - contractService
async getByClientId(clientId: number) {
  try {
    const { data, error } = await supabase
      .from("contracts")
      .select(`
        *,
        clients!inner (
          id,
          full_name,
          name,
          email,
          cpf_cnpj
        ),
        planos!inner (
          id,
          nome,
          descricao
        ),
        profiles!inner (
          id,
          full_name,
          commission_code
        ),
        invoices (
          id,
          invoice_code,
          value,
          due_date,
          status,
          paid_at
        )
      `)
      .eq("client_id", clientId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching contracts by client:", error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error("Error in contractService.getByClientId:", error);
    throw error;
  }
}
```

**Arquivos a modificar**:
- `src/lib/supabase.ts` - Adicionar método `getByClientId()` no `contractService` (após linha 1553)

---

### 3. Buscar Faturas do Cliente (Prioridade: ALTA)

**Problema**: Não existe método para buscar faturas de um cliente (através dos contratos).

**Solução**: Criar serviço de faturas ou adicionar método no `contractService`:

```typescript
// Adicionar em src/lib/supabase.ts - criar invoiceService ou adicionar em contractService
async getInvoicesByClientId(clientId: number) {
  try {
    // Buscar todos os contratos do cliente primeiro
    const contracts = await this.getByClientId(clientId);
    const contractIds = contracts.map(c => c.id);

    if (contractIds.length === 0) {
      return [];
    }

    // Buscar todas as faturas dos contratos do cliente
    const { data, error } = await supabase
      .from("invoices")
      .select(`
        *,
        contracts!inner (
          id,
          contract_number,
          client_id
        )
      `)
      .in("contract_id", contractIds)
      .order("due_date", { ascending: true });

    if (error) {
      console.error("Error fetching invoices by client:", error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error("Error in getInvoicesByClientId:", error);
    throw error;
  }
}
```

**Arquivos a modificar**:
- `src/lib/supabase.ts` - Criar `invoiceService` ou adicionar método no `contractService`

---

### 4. Carregar Dados Reais no ClientDashboard (Prioridade: ALTA)

**Problema**: Componente usa dados mockados.

**Solução**: Modificar `useEffect` para carregar dados reais:

```typescript
// Modificar src/components/dashboard/ClientDashboard.tsx
useEffect(() => {
  const loadClientData = async () => {
    if (!isAuthenticated) return;

    const user = authService.getCurrentUser();
    if (!user || user.role !== "Cliente") return;

    try {
      setIsLoading(true);

      // 1. Buscar dados do cliente
      const clientId = user.id; // ou buscar pelo CPF
      const client = await clientService.getById(parseInt(clientId));
      
      if (client) {
        setClientName(client.full_name || client.name || "Cliente");
      }

      // 2. Buscar contratos do cliente
      const contracts = await contractService.getByClientId(parseInt(clientId));
      
      if (contracts && contracts.length > 0) {
        // Usar o primeiro contrato ativo ou o mais recente
        const activeContract = contracts.find(c => c.status === "Ativo") || contracts[0];
        
        // Calcular valores do contrato
        const totalValue = parseFloat(activeContract.total_value || activeContract.credit_amount || "0");
        const invoices = activeContract.invoices || [];
        
        const paidInvoices = invoices.filter(inv => inv.status === "Pago");
        const paidValue = paidInvoices.reduce((sum, inv) => sum + parseFloat(inv.value || "0"), 0);
        const remainingValue = totalValue - paidValue;
        
        // Encontrar próxima fatura pendente
        const pendingInvoices = invoices.filter(inv => inv.status === "Pendente");
        const nextInvoice = pendingInvoices.sort((a, b) => 
          new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
        )[0];

        setClientData({
          contractNumber: activeContract.contract_number || `CT-${activeContract.id}`,
          totalValue,
          paidValue,
          remainingValue,
          nextDueDate: nextInvoice ? new Date(nextInvoice.due_date).toLocaleDateString("pt-BR") : "N/A",
          status: activeContract.status || "Ativo"
        });

        // 3. Formatar faturas para exibição
        const formattedInvoices = invoices.map(inv => ({
          id: inv.id.toString(),
          invoiceNumber: inv.invoice_code || `FAT-${inv.id}`,
          dueDate: new Date(inv.due_date).toLocaleDateString("pt-BR"),
          value: parseFloat(inv.value || "0"),
          status: inv.status === "Pago" ? "paid" : 
                  new Date(inv.due_date) < new Date() && inv.status !== "Pago" ? "overdue" : "pending",
          paymentMethod: inv.payment_method || undefined
        }));

        setInvoices(formattedInvoices);
      }

      // 4. Buscar solicitações de antecipação (quando serviço existir)
      // const anticipations = await anticipationService.getByClientId(clientId);
      // setAnticipationRequests(anticipations);

    } catch (error) {
      console.error("Error loading client data:", error);
      setError("Erro ao carregar dados. Tente novamente.");
    } finally {
      setIsLoading(false);
    }
  };

  loadClientData();
}, [isAuthenticated]);
```

**Arquivos a modificar**:
- `src/components/dashboard/ClientDashboard.tsx` (linhas 160-194 e adicionar novo useEffect)

---

### 5. Serviço de Antecipações (Prioridade: MÉDIA)

**Problema**: Não existe serviço para gerenciar solicitações de antecipação.

**Solução**: Criar serviço completo:

```typescript
// Criar src/lib/anticipation.service.ts ou adicionar em supabase.ts
export const anticipationService = {
  // Criar solicitação de antecipação
  async createRequest(clientId: number, contractId: number, data: {
    quotas: number;
    reason: string;
    requestedValue?: number;
  }) {
    try {
      const { data: result, error } = await supabase
        .from("anticipation_requests")
        .insert({
          client_id: clientId,
          contract_id: contractId,
          quotas: data.quotas,
          reason: data.reason,
          requested_value: data.requestedValue,
          status: "pending",
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;
      return result;
    } catch (error) {
      console.error("Error creating anticipation request:", error);
      throw error;
    }
  },

  // Buscar solicitações por cliente
  async getByClientId(clientId: number) {
    try {
      const { data, error } = await supabase
        .from("anticipation_requests")
        .select(`
          *,
          contracts!inner (
            id,
            contract_number
          )
        `)
        .eq("client_id", clientId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error("Error fetching anticipation requests:", error);
      throw error;
    }
  }
};
```

**Arquivos a criar/modificar**:
- Criar `src/lib/anticipation.service.ts` OU adicionar em `src/lib/supabase.ts`
- Criar migration SQL para tabela `anticipation_requests` no Supabase

---

### 6. Funcionalidades de Faturas (Prioridade: MÉDIA)

**Problema**: Botões de visualizar e download não funcionam.

**Solução**:
- Implementar visualização de fatura em modal/dialog
- Implementar download de fatura (gerar PDF ou buscar PDF existente)
- Implementar filtros de faturas
- Implementar exportação (CSV/Excel)

**Arquivos a modificar**:
- `src/components/dashboard/ClientDashboard.tsx` (linhas 558-564)

---

### 7. Cálculo de Valores de Antecipação (Prioridade: BAIXA)

**Problema**: Valor de antecipação é fixo (600 por cota).

**Solução**: Buscar valor real da cota do contrato e calcular com base nas regras de negócio.

**Arquivos a modificar**:
- `src/components/dashboard/ClientDashboard.tsx` (linhas 628-642)

---

### 8. Notificações (Prioridade: BAIXA)

**Problema**: Botão de notificações não funciona.

**Solução**: Implementar sistema de notificações ou remover botão temporariamente.

**Arquivos a modificar**:
- `src/components/dashboard/ClientDashboard.tsx` (linhas 271-274)

---

## 📊 Estrutura de Banco de Dados Necessária

### Tabelas que precisam ser verificadas/criadas:

1. **`clients`** - Já existe
   - ✅ Campos básicos existem
   - ❌ Falta `password_hash` (ou campo similar)
   - ❌ Verificar se `cpf_cnpj` está indexado para busca rápida

2. **`contracts`** - Já existe
   - ✅ Relacionamento com `clients` existe (`client_id`)
   - ✅ Relacionamento com `invoices` existe
   - ✅ Campos necessários existem

3. **`invoices`** - Já existe
   - ✅ Relacionamento com `contracts` existe (`contract_id`)
   - ✅ Campos `status`, `due_date`, `value` existem
   - ⚠️ Verificar campos `payment_method`, `payment_link_pix`, `payment_link_boleto`

4. **`anticipation_requests`** - Precisa ser criada
   ```sql
   CREATE TABLE anticipation_requests (
     id SERIAL PRIMARY KEY,
     client_id INTEGER NOT NULL REFERENCES clients(id),
     contract_id INTEGER NOT NULL REFERENCES contracts(id),
     quotas INTEGER NOT NULL,
     requested_value DECIMAL(10,2),
     reason TEXT,
     status VARCHAR(20) DEFAULT 'pending', -- pending, approved, rejected
     created_at TIMESTAMP DEFAULT NOW(),
     updated_at TIMESTAMP DEFAULT NOW(),
     reviewed_at TIMESTAMP,
     reviewed_by UUID REFERENCES profiles(id)
   );
   ```

---

## 🎯 Plano de Implementação Sugerido

### Fase 1: Autenticação e Dados Básicos (1-2 dias)
1. ✅ Adicionar campo `password_hash` na tabela `clients`
2. ✅ Implementar autenticação real de cliente
3. ✅ Criar método `getByClientId()` no `contractService`
4. ✅ Carregar dados básicos do cliente no dashboard

### Fase 2: Faturas (2-3 dias)
1. ✅ Criar método `getInvoicesByClientId()` 
2. ✅ Carregar faturas reais no dashboard
3. ✅ Implementar visualização de fatura
4. ✅ Implementar download de fatura

### Fase 3: Antecipações (2-3 dias)
1. ✅ Criar tabela `anticipation_requests`
2. ✅ Criar serviço de antecipações
3. ✅ Implementar criação de solicitação
4. ✅ Carregar histórico de solicitações

### Fase 4: Melhorias e Polimento (1-2 dias)
1. ✅ Implementar filtros de faturas
2. ✅ Implementar exportação de dados
3. ✅ Melhorar cálculos de valores
4. ✅ Adicionar tratamento de erros
5. ✅ Adicionar loading states

**Total estimado**: 6-10 dias de desenvolvimento

---

## 🔐 Considerações de Segurança

1. **Senhas**: Implementar hash seguro (bcrypt) ao invés de armazenar em texto plano
2. **Sessões**: Usar sistema de autenticação do Supabase ou JWT tokens
3. **RLS (Row Level Security)**: Configurar políticas RLS no Supabase para garantir que clientes só vejam seus próprios dados
4. **Validação**: Validar todos os inputs do cliente
5. **Rate Limiting**: Implementar rate limiting no login para prevenir brute force

---

## 📝 Notas Adicionais

- O componente `ClientDashboard` está bem estruturado e só precisa de integração com dados reais
- A interface visual está completa e não precisa de mudanças significativas
- O sistema de faturas já existe no backend, só precisa ser integrado ao painel de cliente
- O sistema de contratos já existe e está funcional, só precisa adicionar método de busca por cliente

---

## ✅ Checklist de Implementação

- [ ] Adicionar campo `password_hash` na tabela `clients`
- [ ] Implementar autenticação real de cliente
- [ ] Criar método `contractService.getByClientId()`
- [ ] Criar método `getInvoicesByClientId()` (ou adicionar em serviço existente)
- [ ] Criar tabela `anticipation_requests`
- [ ] Criar serviço `anticipationService`
- [ ] Modificar `ClientDashboard` para carregar dados reais
- [ ] Implementar visualização de fatura
- [ ] Implementar download de fatura
- [ ] Implementar criação de solicitação de antecipação
- [ ] Implementar filtros de faturas
- [ ] Configurar RLS no Supabase
- [ ] Testes de integração
- [ ] Documentação de uso

---

**Data da Análise**: Janeiro 2025  
**Versão do Documento**: 1.0
