# 🔌 ASAAS-API-INTEGRATION.MD

## 🎯 Integração com Asaas - Sistema de Faturas CredCar

---

## 📋 Visão Geral

Este documento especifica a integração com a API do Asaas para implementar o sistema completo de faturas, pagamentos e gestão de clientes do CredCar.

**Base URL:** `https://www.asaas.com/api/v3/`
**SandBox:** `https://api-sandbox.asaas.com/v3/`
**Ambiente:** Sandbox (desenvolvimento) / Produção

---

## 🔑 Autenticação

### **Headers Obrigatórios**
```http
access_token: <seu_token_asaas>
Content-Type: application/json
```

### **Variáveis de Ambiente**
```env
ASAAS_API_KEY=your_api_key_here
ASAAS_ENVIRONMENT=sandbox # ou production
ASAAS_WEBHOOK_SECRET=your_webhook_secret
```

---

## 📊 APIs Necessárias para Implementação

### **1. 👤 GESTÃO DE CLIENTES**

#### **1.1 Criar Cliente**
```http
POST /customers
```
**O que precisamos:**
- [ ] Nome completo do cliente
- [ ] CPF/CNPJ
- [ ] Email
- [ ] Telefone
- [ ] Endereço completo
- [ ] Data de nascimento (pessoas físicas)

**Comentário:** *Buscar na documentação oficial os campos obrigatórios e opcionais*

const url = 'https://api-sandbox.asaas.com/v3/customers';
const options = {
  method: 'POST',
  headers: {
    accept: 'application/json',
    'content-type': 'application/json',
    access_token: 'access_token'
  },
  body: JSON.stringify({
    name: 'nome',
    cpfCnpj: 'cpf',
    email: 'email',
    phone: 'phone',
    mobilePhone: 'mobile',
    address: 'address',
    addressNumber: 'addressnumber',
    complement: 'complemento',
    province: 'bairro',
    postalCode: 'cep'
  })
};

fetch(url, options)
  .then(res => res.json())
  .then(json => console.log(json))
  .catch(err => console.error(err));

#### **1.2 Buscar Cliente por CPF/CNPJ**

Filtrar por nome:

GET https://api.asaas.com/v3/customers?name=Marcelo

Filtrar por CPF ou CNPJ:

GET https://api.asaas.com/v3/customers?cpfCnpj=42885229519

```http
GET /customers?cpfCnpj={cpf_cnpj}
```
**O que precisamos:**
- [ ] Buscar cliente existente antes de criar
- [ ] Evitar duplicatas
- [ ] Retornar ID do cliente para usar em faturas

**Comentário:** *Verificar se existe filtro por CPF/CNPJ na API*

const url = 'https://api-sandbox.asaas.com/v3/customers';
const options = {
  method: 'GET',
  headers: {accept: 'application/json', access_token: 'access_token'}
};

fetch(url, options)
  .then(res => res.json())
  .then(json => console.log(json))
  .catch(err => console.error(err));


#### **1.3 Atualizar Cliente**
```http
PUT /customers/{id}
```
**O que precisamos:**
- [ ] Atualizar dados do cliente
- [ ] Sincronizar com nosso banco
- [ ] Manter histórico de alterações

**Comentário:** *Verificar quais campos podem ser atualizados*

const url = 'https://api-sandbox.asaas.com/v3/customers/id';
const options = {
  method: 'PUT',
  headers: {
    accept: 'application/json',
    'content-type': 'application/json',
    access_token: 'access_token'
  }
};

fetch(url, options)
  .then(res => res.json())
  .then(json => console.log(json))
  .catch(err => console.error(err));


#### **1.4 Deletar Cliente**
```http
DELETE /customers/{id}
```
**O que precisamos:**
- [ ] Deletar cliente quando necessário
- [ ] Verificar se tem faturas pendentes
- [ ] Soft delete vs hard delete

**Comentário:** *Verificar regras de exclusão e dependências*


const url = 'https://api-sandbox.asaas.com/v3/customers/id';
const options = {
  method: 'DELETE',
  headers: {accept: 'application/json', access_token: 'access_token'}
};

fetch(url, options)
  .then(res => res.json())
  .then(json => console.log(json))
  .catch(err => console.error(err));
---

### **2. 💰 GESTÃO DE FATURAS**

#### **2.1 Criar Fatura (Cobrança)**
```http
POST /payments
```
**O que precisamos:**
- [ ] ID do cliente (Asaas)
- [ ] Valor da fatura
- [ ] Data de vencimento
- [ ] Descrição da fatura
- [ ] Número da parcela (1/12, 2/12, etc.)
- [ ] Referência externa (nosso ID da fatura)
Allowed: UNDEFINED, BOLETO, REDIT_CARD, PIX

const url = 'https://api-sandbox.asaas.com/v3/payments';
const options = {
  method: 'POST',
  headers: {
    accept: 'application/json',
    'content-type': 'application/json',
    access_token: 'access_token'
  },
  body: JSON.stringify({billingType: 'UNDEFINED', customer: 'id'})
};

fetch(url, options)
  .then(res => res.json())
  .then(json => console.log(json))
  .catch(err => console.error(err));

**Comentário:** *Buscar todos os campos obrigatórios e opcionais*

#### **2.2 Buscar Faturas do Cliente**

Listar cobranças de um cliente específico: GET https://api.asaas.com/v3/payments?customer={customer_id}

```http
GET /payments?customer={customer_id}
```
**O que precisamos:**
- [ ] Listar todas as faturas de um cliente
- [ ] Filtrar por status (pending, received, overdue)
- [ ] Ordenar por data de vencimento
- [ ] Paginação para muitos resultados

**Comentário:** *Verificar filtros disponíveis e estrutura de resposta*

#### **2.3 Buscar Fatura Específica**
```http
GET /payments/{id}
```
**O que precisamos:**
- [ ] Detalhes completos da fatura
- [ ] Status atual do pagamento
- [ ] Links de pagamento (PIX, Boleto)
- [ ] Histórico de tentativas de pagamento


const url = 'https://api-sandbox.asaas.com/v3/payments';
const options = {
  method: 'GET',
  headers: {accept: 'application/json', access_token: 'access_token'}
};

fetch(url, options)
  .then(res => res.json())
  .then(json => console.log(json))
  .catch(err => console.error(err));


**Comentário:** *Verificar todos os campos retornados*

#### **2.4 Atualizar Fatura**
```http
PUT /payments/{id}
```
**O que precisamos:**
- [ ] Alterar data de vencimento
- [ ] Alterar valor (com restrições)
- [ ] Adicionar observações
- [ ] Cancelar fatura

billingType / required 

value / required

dueDate / required

const url = 'https://api-sandbox.asaas.com/v3/payments/id';
const options = {
  method: 'PUT',
  headers: {
    accept: 'application/json',
    'content-type': 'application/json',
    access_token: 'access_token'
  },
  body: JSON.stringify({billingType: 'UNDEFINED'})
};

fetch(url, options)
  .then(res => res.json())
  .then(json => console.log(json))
  .catch(err => console.error(err));


**Comentário:** *Verificar quais campos podem ser alterados*

#### **2.5 Deletar Fatura**
```http
DELETE /payments/{id}
```
**O que precisamos:**
- [ ] Deletar fatura não paga
- [ ] Verificar regras de exclusão
- [ ] Sincronizar com nosso banco

const url = 'https://api-sandbox.asaas.com/v3/payments/id';
const options = {
  method: 'DELETE',
  headers: {accept: 'application/json', access_token: 'access_token'}
};

fetch(url, options)
  .then(res => res.json())
  .then(json => console.log(json))
  .catch(err => console.error(err));

**Comentário:** *Verificar regras de exclusão e status permitidos*

---

### **3. 💳 GESTÃO DE PAGAMENTOS**

#### **3.1 Gerar Link PIX**
```http
POST /payments/{id}/pixQrCode
```
**O que precisamos:**
- [ ] Gerar QR Code PIX
- [ ] Código PIX copia e cola
- [ ] Tempo de expiração
- [ ] Atualizar status automaticamente

**Comentário:** *Verificar se é endpoint separado ou campo da fatura*

#### **3.2 Gerar Boleto**
```http
GET /payments/{id}/identificationField
```
**O que precisamos:**
- [ ] Linha digitável do boleto
- [ ] URL para download do PDF
- [ ] Código de barras
- [ ] Data de vencimento

**Comentário:** *Verificar endpoints corretos para boleto*

#### **3.3 Verificar Status do Pagamento**
```http
GET /payments/{id}
```
**O que precisamos:**
- [ ] Status atual (pending, received, overdue, cancelled)
- [ ] Data do pagamento
- [ ] Método de pagamento usado
- [ ] Valor pago

**Comentário:** *Verificar todos os status possíveis*

---

### **4. 🔔 WEBHOOKS E NOTIFICAÇÕES**

#### **4.1 Configurar Webhook**
```http
POST /webhooks
```
**O que precisamos:**
- [ ] URL do nosso endpoint
- [ ] Eventos para escutar (payment.created, payment.received, etc.)
- [ ] Validação de assinatura
- [ ] Retry em caso de falha

**Comentário:** *Verificar todos os eventos disponíveis*

#### **4.2 Processar Webhook**
```http
POST /api/webhooks/asaas
```
**O que precisamos:**
- [ ] Validar assinatura do webhook
- [ ] Processar evento de pagamento
- [ ] Atualizar status da fatura
- [ ] Enviar notificação ao cliente
- [ ] Calcular comissão do representante

**Comentário:** *Verificar estrutura dos dados do webhook*

---

### **5. 📊 RELATÓRIOS E CONSULTAS**

#### **5.1 Relatório de Faturas**
```http
GET /payments?status={status}&dateCreated[ge]={date}&dateCreated[le]={date}
```
**O que precisamos:**
- [ ] Filtrar por período
- [ ] Filtrar por status
- [ ] Filtrar por cliente
- [ ] Exportar dados para relatório

**Comentário:** *Verificar todos os filtros disponíveis*

#### **5.2 Relatório de Recebimentos**
```http
GET /payments?status=received&dateCreated[ge]={date}&dateCreated[le]={date}
```
**O que precisamos:**
- [ ] Total recebido no período
- [ ] Quantidade de pagamentos
- [ ] Métodos de pagamento mais usados
- [ ] Taxa de inadimplência

**Comentário:** *Verificar métricas disponíveis*

---

## 🔧 Implementação no CredCar

### **Serviços a Criar:**

#### **1. AsaasService**
```typescript
class AsaasService {
  // Clientes
  async createCustomer(customerData: CustomerData): Promise<Customer>
  async findCustomerByCpfCnpj(cpfCnpj: string): Promise<Customer | null>
  async updateCustomer(customerId: string, data: Partial<CustomerData>): Promise<Customer>
  async deleteCustomer(customerId: string): Promise<boolean>
  
  // Faturas
  async createInvoice(invoiceData: InvoiceData): Promise<Invoice>
  async getCustomerInvoices(customerId: string): Promise<Invoice[]>
  async getInvoice(invoiceId: string): Promise<Invoice>
  async updateInvoice(invoiceId: string, data: Partial<InvoiceData>): Promise<Invoice>
  async deleteInvoice(invoiceId: string): Promise<boolean>
  
  // Pagamentos
  async generatePixPayment(invoiceId: string): Promise<PixData>
  async generateBoletoPayment(invoiceId: string): Promise<BoletoData>
  async getPaymentStatus(invoiceId: string): Promise<PaymentStatus>
  
  // Webhooks
  async processWebhook(webhookData: WebhookData): Promise<void>
}
```

#### **2. InvoiceService (Integrado com Asaas)**
```typescript
class InvoiceService {
  async createInvoicesForContract(contractId: string): Promise<Invoice[]>
  async syncWithAsaas(invoiceId: string): Promise<void>
  async markAsPaid(invoiceId: string, paymentData: PaymentData): Promise<void>
  async cancelInvoice(invoiceId: string, reason: string): Promise<void>
}
```

---

## 📝 Checklist de Implementação

### **FASE 1: Configuração Básica**
- [ ] Criar conta no Asaas (sandbox)
- [ ] Obter API Key
- [ ] Configurar webhook URL
- [ ] Testar autenticação
- [ ] Implementar AsaasService básico

### **FASE 2: Gestão de Clientes**
- [ ] Implementar criação de cliente
- [ ] Implementar busca por CPF/CNPJ
- [ ] Implementar atualização de cliente
- [ ] Testar sincronização com nosso banco

### **FASE 3: Gestão de Faturas**
- [ ] Implementar criação de fatura
- [ ] Implementar busca de faturas
- [ ] Implementar atualização de fatura
- [ ] Testar criação automática

### **FASE 4: Pagamentos**
- [ ] Implementar geração PIX
- [ ] Implementar geração Boleto
- [ ] Implementar verificação de status
- [ ] Testar fluxo completo de pagamento

### **FASE 5: Webhooks**
- [ ] Implementar endpoint de webhook
- [ ] Implementar validação de assinatura
- [ ] Implementar processamento de eventos
- [ ] Testar confirmação automática

### **FASE 6: Relatórios**
- [ ] Implementar relatórios básicos
- [ ] Implementar filtros por período
- [ ] Implementar exportação de dados
- [ ] Testar performance com muitos dados

---

## 🚨 Pontos de Atenção

### **Limitações da API**
- [ ] Rate limiting (quantas requisições por minuto?)
- [ ] Tamanho máximo de payload
- [ ] Timeout de requisições
- [ ] Disponibilidade da API

### **Segurança**
- [ ] Validação de webhook signature
- [ ] Criptografia de dados sensíveis
- [ ] Logs de auditoria
- [ ] Controle de acesso

### **Performance**
- [ ] Cache de dados frequentes
- [ ] Processamento assíncrono
- [ ] Retry em caso de falha
- [ ] Monitoramento de performance

---

## 📚 Próximos Passos

1. **Estudar documentação oficial** do Asaas
2. **Comentar este arquivo** com detalhes específicos
3. **Implementar AsaasService** básico
4. **Testar integração** em ambiente sandbox
5. **Implementar webhook** de confirmação
6. **Migrar para produção** após testes

---

*Documento criado em: 02/10/2025*
*Última atualização: 02/10/2025*
*Status: Aguardando comentários da documentação oficial*

