# 🔌 API-FATURAS.MD

## 🎯 Especificação da API para Sistema de Faturas

---

## 📋 Visão Geral

Este documento especifica as APIs necessárias para implementar o sistema completo de faturas do CredCar, incluindo criação automática, pagamentos e antecipações.

---

## 🗄️ Estrutura de Dados

### **Invoice (Fatura)**
```typescript
interface Invoice {
  id: string;
  contract_id: string;
  installment_number: number;
  invoice_number: string; // FAT-000001
  amount: number;
  due_date: string; // YYYY-MM-DD
  payment_date?: string;
  payment_method?: 'PIX' | 'BOLETO' | 'TRANSFERENCIA';
  status: 'pending' | 'paid' | 'overdue' | 'cancelled';
  notes?: string;
  payment_link_pix?: string;
  payment_link_boleto?: string;
  created_at: string;
  updated_at: string;
}
```

### **Anticipation (Antecipação)**
```typescript
interface Anticipation {
  id: string;
  contract_id: string;
  anticipation_number: string; // ANT-000001
  requested_installments: number;
  requested_amount: number;
  approved_amount?: number;
  discount_percentage: number;
  status: 'pending' | 'approved' | 'rejected';
  request_date: string;
  approval_date?: string;
  approved_by?: string;
  notes?: string;
  created_at: string;
}
```

### **Payment (Pagamento)**
```typescript
interface Payment {
  id: string;
  invoice_id: string;
  amount: number;
  method: 'PIX' | 'BOLETO' | 'TRANSFERENCIA';
  status: 'pending' | 'paid' | 'failed' | 'cancelled';
  payment_id: string; // ID do gateway
  pix_code?: string;
  boleto_url?: string;
  paid_at?: string;
  created_at: string;
}
```

---

## 🔧 Serviços Backend

### **1. InvoiceService**

#### **1.1 Criar Faturas para Contrato**
```typescript
async createInvoicesForContract(
  contractId: string,
  installments: number,
  totalValue: number,
  startDate?: string
): Promise<Invoice[]>
```

**Parâmetros:**
- `contractId`: ID do contrato
- `installments`: Número de parcelas
- `totalValue`: Valor total do contrato
- `startDate`: Data de início (opcional, padrão: hoje + 30 dias)

**Retorno:**
- Array de faturas criadas

**Exemplo:**
```typescript
const invoices = await invoiceService.createInvoicesForContract(
  'contract-123',
  12,
  50000,
  '2025-02-01'
);
// Retorna 12 faturas de R$ 4.166,67 cada
```

#### **1.2 Buscar Faturas por Contrato**
```typescript
async getInvoicesByContract(contractId: string): Promise<Invoice[]>
```

#### **1.3 Atualizar Status da Fatura**
```typescript
async updateInvoiceStatus(
  invoiceId: string,
  status: InvoiceStatus,
  paymentData?: PaymentData
): Promise<Invoice>
```

#### **1.4 Marcar Fatura como Paga**
```typescript
async markInvoiceAsPaid(
  invoiceId: string,
  paymentMethod: PaymentMethod,
  paymentDate?: string
): Promise<Invoice>
```

#### **1.5 Gerar Próxima Fatura**
```typescript
async generateNextInvoice(contractId: string): Promise<Invoice>
```

---

### **2. PaymentService**

#### **2.1 Criar Pagamento PIX**
```typescript
async createPixPayment(
  invoiceId: string,
  amount: number
): Promise<{
  paymentId: string;
  pixCode: string;
  qrCode: string;
  expiresAt: string;
}>
```

#### **2.2 Criar Pagamento Boleto**
```typescript
async createBoletoPayment(
  invoiceId: string,
  amount: number
): Promise<{
  paymentId: string;
  boletoUrl: string;
  barcode: string;
  dueDate: string;
}>
```

#### **2.3 Verificar Status do Pagamento**
```typescript
async getPaymentStatus(paymentId: string): Promise<PaymentStatus>
```

#### **2.4 Processar Webhook**
```typescript
async processWebhook(webhookData: WebhookData): Promise<void>
```

---

### **3. AnticipationService**

#### **3.1 Solicitar Antecipação**
```typescript
async requestAnticipation(
  contractId: string,
  installments: number[],
  reason: string
): Promise<Anticipation>
```

#### **3.2 Aprovar Antecipação**
```typescript
async approveAnticipation(
  anticipationId: string,
  approvedAmount: number,
  discountPercentage: number,
  approvedBy: string
): Promise<Anticipation>
```

#### **3.3 Rejeitar Antecipação**
```typescript
async rejectAnticipation(
  anticipationId: string,
  reason: string,
  rejectedBy: string
): Promise<Anticipation>
```

#### **3.4 Calcular Desconto**
```typescript
async calculateDiscount(
  contractId: string,
  installments: number[]
): Promise<{
  originalAmount: number;
  discountAmount: number;
  finalAmount: number;
  discountPercentage: number;
}>
```

---

## 🌐 Endpoints da API

### **Faturas**

#### **GET /api/invoices/contract/:contractId**
Buscar faturas de um contrato
```json
{
  "success": true,
  "data": [
    {
      "id": "inv-123",
      "invoice_number": "FAT-000001",
      "amount": 4166.67,
      "due_date": "2025-02-01",
      "status": "pending"
    }
  ]
}
```

#### **POST /api/invoices/generate**
Gerar faturas para contrato
```json
{
  "contract_id": "contract-123",
  "installments": 12,
  "total_value": 50000,
  "start_date": "2025-02-01"
}
```

#### **PUT /api/invoices/:invoiceId/status**
Atualizar status da fatura
```json
{
  "status": "paid",
  "payment_method": "PIX",
  "payment_date": "2025-01-15"
}
```

### **Pagamentos**

#### **POST /api/payments/pix**
Criar pagamento PIX
```json
{
  "invoice_id": "inv-123",
  "amount": 4166.67
}
```

#### **POST /api/payments/boleto**
Criar pagamento Boleto
```json
{
  "invoice_id": "inv-123",
  "amount": 4166.67
}
```

#### **GET /api/payments/:paymentId/status**
Verificar status do pagamento

#### **POST /api/webhooks/payment**
Webhook de confirmação de pagamento
```json
{
  "payment_id": "pay-123",
  "status": "paid",
  "amount": 4166.67,
  "paid_at": "2025-01-15T10:30:00Z"
}
```

### **Antecipações**

#### **POST /api/anticipations/request**
Solicitar antecipação
```json
{
  "contract_id": "contract-123",
  "installments": [1, 2, 3],
  "reason": "Necessidade de capital de giro"
}
```

#### **PUT /api/anticipations/:anticipationId/approve**
Aprovar antecipação
```json
{
  "approved_amount": 12000,
  "discount_percentage": 5,
  "approved_by": "admin-123"
}
```

#### **PUT /api/anticipations/:anticipationId/reject**
Rejeitar antecipação
```json
{
  "reason": "Valor muito alto",
  "rejected_by": "admin-123"
}
```

---

## 🔐 Autenticação e Autorização

### **Headers Obrigatórios**
```http
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

### **Permissões por Role**

#### **Admin**
- ✅ Criar/editar/deletar faturas
- ✅ Aprovar/rejeitar antecipações
- ✅ Marcar faturas como pagas
- ✅ Acessar todos os dados

#### **Representante**
- ✅ Visualizar faturas dos seus contratos
- ✅ Solicitar antecipações para clientes
- ✅ Acessar relatórios de comissão

#### **Cliente**
- ✅ Visualizar suas faturas
- ✅ Pagar faturas
- ✅ Solicitar antecipações
- ✅ Baixar comprovantes

---

## 📊 Códigos de Resposta

### **Sucesso**
- `200 OK` - Operação realizada com sucesso
- `201 Created` - Recurso criado com sucesso
- `204 No Content` - Operação realizada sem retorno

### **Erro do Cliente**
- `400 Bad Request` - Dados inválidos
- `401 Unauthorized` - Token inválido/expirado
- `403 Forbidden` - Sem permissão
- `404 Not Found` - Recurso não encontrado
- `409 Conflict` - Conflito (ex: fatura já paga)

### **Erro do Servidor**
- `500 Internal Server Error` - Erro interno
- `502 Bad Gateway` - Erro no gateway de pagamento
- `503 Service Unavailable` - Serviço indisponível

---

## 🧪 Exemplos de Uso

### **Fluxo Completo: Criação de Faturas**

1. **Aprovar Contrato**
```typescript
// Admin aprova contrato
await contractService.updateStatus('contract-123', 'Ativo');

// Sistema automaticamente cria faturas
const invoices = await invoiceService.createInvoicesForContract(
  'contract-123',
  12,
  50000
);
```

2. **Cliente Visualiza Faturas**
```typescript
// Cliente acessa suas faturas
const invoices = await invoiceService.getInvoicesByContract('contract-123');
```

3. **Cliente Paga Fatura**
```typescript
// Cliente escolhe pagar via PIX
const payment = await paymentService.createPixPayment('inv-123', 4166.67);

// Sistema gera QR Code
console.log(payment.qrCode); // Base64 do QR Code
```

4. **Confirmação Automática**
```typescript
// Webhook confirma pagamento
await paymentService.processWebhook({
  payment_id: 'pay-123',
  status: 'paid',
  amount: 4166.67
});

// Fatura é marcada como paga automaticamente
await invoiceService.markInvoiceAsPaid('inv-123', 'PIX');
```

### **Fluxo de Antecipação**

1. **Cliente Solicita Antecipação**
```typescript
const anticipation = await anticipationService.requestAnticipation(
  'contract-123',
  [1, 2, 3], // Parcelas 1, 2 e 3
  'Necessidade de capital de giro'
);
```

2. **Admin Aprova**
```typescript
const approved = await anticipationService.approveAnticipation(
  'ant-123',
  12000, // Valor aprovado
  5, // 5% de desconto
  'admin-123'
);
```

3. **Sistema Gera Nova Fatura**
```typescript
// Sistema automaticamente:
// 1. Cancela parcelas originais
// 2. Cria nova fatura com valor antecipado
// 3. Calcula comissão do representante
```

---

## 🔧 Configurações Necessárias

### **Variáveis de Ambiente**
```env
# Gateway de Pagamento
MERCADO_PAGO_ACCESS_TOKEN=your_access_token
MERCADO_PAGO_PUBLIC_KEY=your_public_key
MERCADO_PAGO_WEBHOOK_SECRET=your_webhook_secret

# Banco de Dados
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_KEY=your_service_key

# Notificações
SENDGRID_API_KEY=your_sendgrid_key
TWILIO_ACCOUNT_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_token
```

### **Configurações do Gateway**
```typescript
const paymentConfig = {
  mercadoPago: {
    accessToken: process.env.MERCADO_PAGO_ACCESS_TOKEN,
    publicKey: process.env.MERCADO_PAGO_PUBLIC_KEY,
    webhookSecret: process.env.MERCADO_PAGO_WEBHOOK_SECRET,
    sandbox: process.env.NODE_ENV !== 'production'
  }
};
```

---

## 📝 Notas de Implementação

1. **Idempotência**: Todas as operações devem ser idempotentes
2. **Transações**: Usar transações para operações críticas
3. **Logs**: Registrar todas as operações importantes
4. **Validações**: Validar dados antes de processar
5. **Rate Limiting**: Implementar limite de requisições
6. **Cache**: Cachear consultas frequentes
7. **Monitoramento**: Implementar métricas e alertas

---

*Documento criado em: 02/10/2025*
*Última atualização: 02/10/2025*

