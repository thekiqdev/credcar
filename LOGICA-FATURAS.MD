# 📋 LOGICA-FATURAS.MD

## 🎯 Visão Geral do Sistema de Faturas

O sistema de faturas do CredCar funciona de forma **automática** quando um contrato é criado e aprovado. Atualmente, o sistema possui uma estrutura básica que precisa ser expandida para funcionalidade completa.

---

## 🔄 Fluxo Atual de Funcionamento

### 1. **Criação do Contrato**
- Representante cria contrato através do `ContractCreationFlow`
- Contrato é salvo com status inicial (geralmente "Pendente" ou "Em Análise")

### 2. **Aprovação do Contrato**
- Admin aprova o contrato, mudando status para "Ativo"
- **AUTOMATICAMENTE** o sistema deveria gerar as faturas

### 3. **Geração Automática de Faturas**
- Quando status = "Ativo", sistema cria faturas baseadas em:
  - Valor total do contrato
  - Número de parcelas definidas
  - Data de vencimento (padrão: 30 dias)

### 4. **Visualização das Faturas**
- Cliente acessa dashboard e vê lista de contratos aprovados
- Ao selecionar contrato, abre lista de faturas
- Mostra status: Pago, Pendente, Vencido

---

## 🗄️ Estrutura do Banco de Dados

### Tabela `invoices`
```sql
CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID REFERENCES contracts(id) ON DELETE CASCADE,
  installment_number INTEGER NOT NULL DEFAULT 1,
  invoice_number VARCHAR(50) UNIQUE, -- FAT-000001
  amount DECIMAL(15,2) NOT NULL DEFAULT 0,
  due_date DATE NOT NULL DEFAULT CURRENT_DATE + INTERVAL '30 days',
  payment_date DATE,
  payment_method VARCHAR(50),
  status VARCHAR(20) DEFAULT 'pending', -- pending, paid, overdue
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Tabela `anticipations` (Antecipações)
```sql
CREATE TABLE anticipations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID REFERENCES contracts(id) ON DELETE CASCADE,
  anticipation_number VARCHAR(50) UNIQUE, -- ANT-000001
  requested_installments INTEGER NOT NULL,
  requested_amount DECIMAL(15,2) NOT NULL,
  approved_amount DECIMAL(15,2),
  status VARCHAR(20) DEFAULT 'pending', -- pending, approved, rejected
  request_date DATE DEFAULT CURRENT_DATE,
  approval_date DATE,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## 🔧 Funções do Banco de Dados

### 1. **Geração Automática de Números**
```sql
-- Função para gerar número da fatura
CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS TEXT AS $$
DECLARE
  next_number INTEGER;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(i.invoice_number FROM 5) AS INTEGER)), 0) + 1
  INTO next_number
  FROM invoices i
  WHERE i.invoice_number ~ '^FAT-[0-9]+$';
  
  RETURN 'FAT-' || LPAD(next_number::TEXT, 6, '0');
END;
$$ LANGUAGE plpgsql;
```

### 2. **Trigger para Auto-numeração**
```sql
-- Trigger que executa automaticamente ao inserir fatura
CREATE TRIGGER trigger_set_invoice_number
  BEFORE INSERT ON invoices
  FOR EACH ROW
  EXECUTE FUNCTION set_invoice_number();
```

---

## 🎨 Interface do Usuário

### 1. **Dashboard do Cliente** (`ClientDashboard.tsx`)
- **Seção "Contratos Aprovados"**
  - Lista contratos com status "Ativo"
  - Mostra: ID do contrato, Representante, Valor total
  - Resumo financeiro: Pago vs Restante
  - Botão para ver faturas

- **Seção "Faturas"**
  - Tabela com: Número, Vencimento, Valor, Status, Pagamento
  - Status com cores: Verde (Pago), Laranja (Pendente), Vermelho (Vencido)
  - Ações: Visualizar, Baixar, Pagar

### 2. **Dashboard do Admin** (`AdminDashboard.tsx`)
- **Gestão de Faturas**
  - Lista todas as faturas do sistema
  - Filtros por status, data, contrato
  - Ações: Aprovar pagamento, Gerar nova fatura, Cancelar

### 3. **Dashboard do Representante** (`RepresentativeDashboard.tsx`)
- **Visão das Faturas dos Clientes**
  - Lista faturas dos contratos do representante
  - Status de pagamento
  - Comissões pendentes

---

## ⚙️ Serviços e APIs

### 1. **Serviços Existentes**
- `contractService.getById()` - Busca contrato com faturas relacionadas
- `dashboardService.getRepresentativeDashboardData()` - Dados do dashboard

### 2. **Serviços Faltando** ❌
- `invoiceService.createInvoicesForContract()` - Criar faturas automaticamente
- `invoiceService.updatePaymentStatus()` - Marcar fatura como paga
- `invoiceService.generatePaymentLink()` - Gerar link de pagamento PIX/Boleto
- `anticipationService.requestAnticipation()` - Solicitar antecipação
- `anticipationService.approveAnticipation()` - Aprovar antecipação

---

## 🚨 Problemas Identificados

### 1. **Geração Automática de Faturas** ❌
- **PROBLEMA**: Não há serviço que cria faturas quando contrato fica ativo
- **IMPACTO**: Faturas não são geradas automaticamente
- **SOLUÇÃO**: Implementar `invoiceService.createInvoicesForContract()`

### 2. **Integração com Gateway de Pagamento** ❌
- **PROBLEMA**: Não há integração com PIX/Boleto
- **IMPACTO**: Clientes não podem pagar online
- **SOLUÇÃO**: Integrar com Mercado Pago, PagSeguro ou similar

### 3. **Gestão de Antecipações** ❌
- **PROBLEMA**: Sistema de antecipação não está funcional
- **IMPACTO**: Clientes não podem antecipar parcelas
- **SOLUÇÃO**: Implementar fluxo completo de antecipação

### 4. **Notificações de Vencimento** ❌
- **PROBLEMA**: Não há alertas de faturas vencidas
- **IMPACTO**: Clientes podem esquecer de pagar
- **SOLUÇÃO**: Sistema de notificações por email/SMS

---

## 📊 Status Atual dos Componentes

| Componente | Status | Funcionalidade |
|------------|--------|----------------|
| **Visualização de Faturas** | ✅ | Funciona - mostra faturas existentes |
| **Criação Automática** | ❌ | Não implementado |
| **Pagamento Online** | ❌ | Não implementado |
| **Antecipação** | ❌ | Não implementado |
| **Notificações** | ❌ | Não implementado |
| **Relatórios** | ❌ | Não implementado |

---

## 🎯 Próximos Passos Identificados

### **FASE 1: Funcionalidade Básica**
1. Implementar criação automática de faturas
2. Criar serviço de gestão de faturas
3. Implementar marcar fatura como paga
4. Adicionar validações de negócio

### **FASE 2: Pagamentos**
1. Integrar gateway de pagamento
2. Gerar links PIX/Boleto
3. Webhook para confirmação de pagamento
4. Histórico de transações

### **FASE 3: Antecipações**
1. Interface para solicitar antecipação
2. Aprovação pelo admin
3. Cálculo de desconto
4. Geração de nova fatura

### **FASE 4: Automação**
1. Notificações de vencimento
2. Cobrança automática
3. Relatórios financeiros
4. Dashboard analytics

---

## 🔗 Arquivos Relacionados

### **Frontend**
- `src/components/dashboard/ClientDashboard.tsx` - Interface do cliente
- `src/components/dashboard/AdminDashboard.tsx` - Interface do admin
- `src/components/dashboard/RepresentativeDashboard.tsx` - Interface do representante

### **Backend**
- `src/lib/supabase.ts` - Serviços existentes
- `supabase/migrations/20250204000001_create_invoices_and_anticipations_tables.sql` - Estrutura do banco

### **Tipos**
- `src/types/supabase.ts` - Tipos TypeScript

---

## 📝 Observações Importantes

1. **Dados de Demonstração**: O sistema atual usa dados mockados para demonstração
2. **Estrutura Preparada**: O banco já tem a estrutura necessária
3. **Interface Pronta**: As telas já estão criadas, precisam apenas da lógica
4. **Integração Necessária**: Falta conectar frontend com backend para operações reais

---

*Documento criado em: 02/10/2025*
*Última atualização: 02/10/2025*

