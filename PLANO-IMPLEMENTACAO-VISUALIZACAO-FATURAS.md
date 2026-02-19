# Plano de Implementação: Visualização de Faturas

## Objetivo
Implementar visualização completa e profissional de faturas para Admin e Cliente, incluindo rota pública e geração de PDF.

---

## ETAPA 1: Criar Componente Reutilizável de Visualização

### 1.1 Criar `InvoiceView.tsx`
**Arquivo**: `src/components/sales/InvoiceView.tsx`

**Funcionalidades**:
- [ ] Componente de visualização profissional de fatura
- [ ] Layout similar ao `ContractViewOnly.tsx`
- [ ] Header com logo e informações da empresa
- [ ] Exibição completa dos dados da fatura
- [ ] Informações do contrato associado
- [ ] Informações do cliente
- [ ] Status visual (Pago/Pendente/Vencido)
- [ ] Links de pagamento (PIX/Boleto)
- [ ] Botão de download/impressão
- [ ] Estilos responsivos e para impressão

**Dependências**:
- `generalSettingsService` - Para logo e dados da empresa
- `invoiceService.getById()` - Para buscar dados completos
- Componentes UI: Card, Badge, Button, Separator

**Tempo Estimado**: 2-3 horas

---

## ETAPA 2: Implementar Visualização no AdminDashboard

### 2.1 Adicionar Estado e Handler
**Arquivo**: `src/components/dashboard/AdminDashboard.tsx`

**Tarefas**:
- [ ] Adicionar estado `selectedInvoice` e `isInvoiceViewOpen`
- [ ] Criar função `handleViewInvoice(invoiceId)`
- [ ] Buscar dados completos da fatura usando `invoiceService.getById()`
- [ ] Abrir modal/dialog com componente `InvoiceView`

**Código a Implementar**:
```typescript
const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
const [isInvoiceViewOpen, setIsInvoiceViewOpen] = useState(false);

const handleViewInvoice = async (invoiceId: string) => {
  try {
    const invoice = await invoiceService.getById(invoiceId);
    setSelectedInvoice(invoice);
    setIsInvoiceViewOpen(true);
  } catch (error) {
    console.error("Error loading invoice:", error);
    alert("Erro ao carregar fatura");
  }
};
```

**Tempo Estimado**: 1 hora

### 2.2 Conectar Botão de Visualizar
**Arquivo**: `src/components/dashboard/AdminDashboard.tsx` (linha ~5463)

**Tarefas**:
- [ ] Adicionar `onClick` handler ao botão Eye
- [ ] Passar `invoice.id` para `handleViewInvoice()`

**Código a Implementar**:
```typescript
<Button 
  variant="outline" 
  size="sm"
  onClick={() => handleViewInvoice(invoice.id.toString())}
>
  <Eye className="h-4 w-4" />
</Button>
```

**Tempo Estimado**: 15 minutos

### 2.3 Adicionar Modal/Dialog
**Arquivo**: `src/components/dashboard/AdminDashboard.tsx`

**Tarefas**:
- [ ] Importar `InvoiceView` component
- [ ] Adicionar Dialog/Modal com `InvoiceView`
- [ ] Passar dados da fatura como props

**Tempo Estimado**: 30 minutos

---

## ETAPA 3: Melhorar Visualização no ClientDashboard

### 3.1 Substituir Modal Básico por Componente Profissional
**Arquivo**: `src/components/dashboard/ClientDashboard.tsx`

**Tarefas**:
- [ ] Substituir modal atual por componente `InvoiceView`
- [ ] Manter funcionalidade de download
- [ ] Melhorar layout e apresentação

**Tempo Estimado**: 1 hora

---

## ETAPA 4: Criar Rota Pública para Visualização

### 4.1 Criar Rota no App.tsx
**Arquivo**: `src/App.tsx`

**Tarefas**:
- [ ] Adicionar rota `/invoice/:id`
- [ ] Criar componente `InvoiceViewOnly` (similar ao `ContractViewOnly`)
- [ ] Implementar validação de acesso (cliente só vê suas próprias faturas)

**Código a Implementar**:
```typescript
<Route path="/invoice/:id" element={<InvoiceViewOnly />} />
```

**Tempo Estimado**: 1 hora

### 4.2 Criar Componente InvoiceViewOnly
**Arquivo**: `src/components/sales/InvoiceViewOnly.tsx`

**Funcionalidades**:
- [ ] Componente público para visualização de fatura
- [ ] Validação de acesso (verificar se fatura pertence ao cliente)
- [ ] Layout profissional similar ao `ContractViewOnly`
- [ ] Suporte a impressão
- [ ] Links de pagamento funcionais

**Validação de Acesso**:
```typescript
// Verificar se fatura pertence ao cliente logado
const invoice = await invoiceService.getById(invoiceId);
const clientId = invoice.contracts?.client_id;
const currentClientId = getCurrentClientId(); // via localStorage ou auth

if (clientId !== currentClientId) {
  // Redirecionar ou mostrar erro de acesso negado
}
```

**Tempo Estimado**: 2-3 horas

### 4.3 Adicionar Links de Acesso Direto
**Tarefas**:
- [ ] Adicionar botão "Ver Fatura" que gera link público
- [ ] Gerar link único para cada fatura (pode usar hash/token)
- [ ] Adicionar campo `public_view_token` na tabela `invoices` (opcional)

**Tempo Estimado**: 1-2 horas

---

## ETAPA 5: Implementar Geração de PDF

### 5.1 Criar Serviço de Geração de PDF
**Arquivo**: `src/lib/invoice-pdf.service.ts`

**Funcionalidades**:
- [ ] Gerar PDF profissional da fatura
- [ ] Usar biblioteca como `jsPDF` ou `react-pdf`
- [ ] Layout formatado com logo da empresa
- [ ] Incluir todos os dados da fatura
- [ ] Código de barras ou QR Code (opcional)
- [ ] Formatação para impressão

**Bibliotecas Sugeridas**:
- `jspdf` - Geração de PDF
- `html2canvas` - Converter HTML para imagem (se necessário)
- `qrcode` - Gerar QR Code para pagamento

**Tempo Estimado**: 3-4 horas

### 5.2 Integrar Geração de PDF nos Componentes
**Tarefas**:
- [ ] Adicionar botão "Download PDF" em `InvoiceView`
- [ ] Adicionar botão "Download PDF" em `InvoiceViewOnly`
- [ ] Chamar serviço de geração de PDF
- [ ] Fazer download do arquivo gerado

**Tempo Estimado**: 1 hora

---

## ETAPA 6: Melhorias e Polimento

### 6.1 Adicionar Estilos de Impressão
**Tarefas**:
- [ ] CSS específico para `@media print`
- [ ] Ocultar elementos desnecessários na impressão
- [ ] Ajustar layout para papel A4
- [ ] Adicionar quebras de página quando necessário

**Tempo Estimado**: 1 hora

### 6.2 Adicionar Validações e Tratamento de Erros
**Tarefas**:
- [ ] Validação de fatura existente
- [ ] Tratamento de erros de carregamento
- [ ] Mensagens de erro amigáveis
- [ ] Loading states durante carregamento

**Tempo Estimado**: 1 hora

### 6.3 Adicionar Funcionalidades Extras (Opcional)
**Tarefas**:
- [ ] Histórico de pagamentos da fatura
- [ ] Notificações de vencimento
- [ ] Compartilhamento de fatura (email/whatsapp)
- [ ] QR Code para pagamento rápido

**Tempo Estimado**: 2-3 horas

---

## Cronograma de Implementação

### Fase 1: Funcionalidade Básica (Prioridade ALTA)
**Duração**: 4-5 horas
- ✅ Etapa 1: Criar componente `InvoiceView.tsx`
- ✅ Etapa 2: Implementar no AdminDashboard
- ✅ Etapa 3: Melhorar ClientDashboard

**Resultado**: Admin e Cliente conseguem visualizar faturas profissionalmente

### Fase 2: Acesso Público (Prioridade MÉDIA)
**Duração**: 3-4 horas
- ✅ Etapa 4: Criar rota pública e componente `InvoiceViewOnly`

**Resultado**: Cliente pode acessar fatura via link direto

### Fase 3: Geração de PDF (Prioridade MÉDIA)
**Duração**: 4-5 horas
- ✅ Etapa 5: Implementar geração de PDF profissional

**Resultado**: Download de PDF formatado disponível

### Fase 4: Polimento (Prioridade BAIXA)
**Duração**: 2-3 horas
- ✅ Etapa 6: Melhorias e ajustes finais

**Resultado**: Sistema completo e polido

---

## Ordem de Implementação Recomendada

1. **Etapa 1** → Criar componente base `InvoiceView.tsx`
2. **Etapa 2** → Implementar no AdminDashboard (corrigir botão quebrado)
3. **Etapa 3** → Melhorar ClientDashboard (usar componente reutilizável)
4. **Etapa 4** → Criar rota pública (acesso direto)
5. **Etapa 5** → Implementar geração de PDF
6. **Etapa 6** → Polimento e melhorias

---

## Dependências e Requisitos

### Bibliotecas Necessárias:
- ✅ Componentes UI já existentes (Card, Badge, Button, etc.)
- ⚠️ Biblioteca de PDF (instalar se necessário):
  ```bash
  npm install jspdf html2canvas
  ```

### Dados Necessários:
- ✅ Dados da fatura (já disponíveis via `invoiceService`)
- ✅ Dados do contrato (relacionamento já existe)
- ✅ Dados do cliente (relacionamento já existe)
- ✅ Configurações gerais da empresa (já disponível via `generalSettingsService`)

### Permissões:
- ✅ Admin: Pode ver todas as faturas
- ✅ Cliente: Pode ver apenas suas próprias faturas
- ⚠️ Rota pública: Precisa validação de acesso

---

## Testes Necessários

### Testes Funcionais:
- [ ] Admin consegue visualizar qualquer fatura
- [ ] Cliente consegue visualizar apenas suas faturas
- [ ] Rota pública funciona corretamente
- [ ] Validação de acesso funciona
- [ ] Download de PDF funciona
- [ ] Links de pagamento funcionam
- [ ] Layout responsivo funciona em mobile
- [ ] Impressão funciona corretamente

### Testes de Segurança:
- [ ] Cliente não consegue acessar faturas de outros clientes
- [ ] Rota pública valida acesso corretamente
- [ ] Dados sensíveis não são expostos

---

## Notas de Implementação

### Considerações Importantes:
1. **Reutilização**: Criar componente `InvoiceView` reutilizável para evitar duplicação
2. **Layout**: Seguir padrão do `ContractViewOnly` para consistência
3. **Performance**: Lazy load do componente de PDF se necessário
4. **Acessibilidade**: Garantir que componentes sejam acessíveis
5. **Mobile**: Garantir responsividade em dispositivos móveis

### Decisões Técnicas:
- Usar Dialog/Modal para visualização no dashboard
- Usar página completa para rota pública (`/invoice/:id`)
- Gerar PDF no cliente (browser) para evitar carga no servidor
- Usar token/hash para links públicos (opcional, mas recomendado)

---

## Estimativa Total

**Tempo Total**: 13-17 horas
- Fase 1 (Básico): 4-5 horas
- Fase 2 (Público): 3-4 horas
- Fase 3 (PDF): 4-5 horas
- Fase 4 (Polimento): 2-3 horas

**Prioridade**: ALTA (funcionalidade essencial que está quebrada)
