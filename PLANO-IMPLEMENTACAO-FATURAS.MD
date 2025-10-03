# 📋 PLANO-IMPLEMENTACAO-FATURAS.MD

## 🎯 Roadmap de Implementação - Sistema de Faturas CredCar

---

## 📊 Status Geral do Projeto

**Data de Início:** 02/10/2025  
**Status Atual:** 🔄 Planejamento  
**Próxima Etapa:** Configuração do Banco de Dados  

---

## 🔑 Configurações e Credenciais

### **API Key Asaas (Sandbox)**
```
$aact_hmlg_000MzkwODA2MWY2OGM3MWRlMDU2NWM3MzJlNzZmNGZhZGY6OmNhZWFkOGRhLThjYWQtNDcyMS04NTk3LTlkMDkxY2ZlNmI2ZDo6JGFhY2hfOWU3MjdlZDYtNTg5NC00OWYwLWJjMzgtNWUwZDZjZTdiMjM1
```

### **URLs Base**
- **Sandbox:** `https://api-sandbox.asaas.com/v3/`
- **Produção:** `https://api.asaas.com/v3/`

### **Armazenamento de Credenciais**
- ✅ **Decisão:** Criar tabela `system_config` no banco de dados
- ⏳ **Status:** Aguardando implementação
- 🎯 **Benefícios:** Configuração dinâmica, segurança, facilidade de manutenção

---

## 📝 Etapas de Implementação

### **🚀 ETAPA 1: CONFIGURAÇÃO BASE**
*Prioridade: ALTA - Base para todo sistema*

#### **1.1 Configuração do Banco de Dados**
- [ ] **Criar tabela `system_config`**
  - Campos: `id`, `key`, `value`, `description`, `category`, `is_active`, `created_at`, `updated_at`
  - Configurar: API Key Asaas, URLs, Webhook Secret
- [ ] **Implementar `SystemConfigService`**
  - Funções: `getConfig()`, `setConfig()`, `getAsaasConfig()`
  - Cache em memória para performance
- [ ] **Migrar configurações do .env**
  - Mover ASAAS_API_KEY para banco
  - Mover outras configs relacionadas
- [ ] **Testar acesso às configurações**

**Status:** ⏳ Aguardando OK  
**Estimativa:** 2-3 horas  
**Dependências:** Nenhuma  

---

#### **1.2 Estrutura Base do AsaasService**
- [ ] **Criar `AsaasService` básico**
  - Classe com métodos de conexão
  - Autenticação com API Key
  - Configuração de URLs (sandbox/prod)
- [ ] **Implementar `AsaasClient`**
  - Wrapper para requisições HTTP
  - Tratamento de erros padrão
  - Logs de requisições/respostas
- [ ] **Testar conexão básica**
  - Ping na API do Asaas
  - Validação de autenticação
  - Teste de rate limiting

**Status:** ⏳ Aguardando OK  
**Estimativa:** 3-4 horas  
**Dependências:** Etapa 1.1  

---

### **👥 ETAPA 2: GESTÃO DE CLIENTES**
*Prioridade: ALTA - Necessário para criar faturas*

#### **2.1 Implementar CRUD de Clientes**
- [ ] **`createCustomer()`**
  - Campos obrigatórios: name, cpfCnpj, email
  - Campos opcionais: phone, mobilePhone, address, etc.
  - Validação de CPF/CNPJ
  - Prevenção de duplicatas
- [ ] **`findCustomerByCpfCnpj()`**
  - Busca por CPF/CNPJ na API
  - Cache local para otimização
  - Retorno padronizado
- [ ] **`updateCustomer()`**
  - Atualização de dados básicos
  - Sincronização com banco local
  - Histórico de alterações
- [ ] **`deleteCustomer()`**
  - Verificação de dependências (faturas)
  - Soft delete recomendado
  - Validações de negócio

**Status:** ⏳ Aguardando OK  
**Estimativa:** 4-5 horas  
**Dependências:** Etapa 1  

---

#### **2.2 Integração com Sistema Existente**
- [ ] **Sincronizar com tabela `clients`**
  - Mapear dados CredCar ↔ Asaas
  - Campo `asaas_customer_id` na prática
  - Trigger de sincronização automática
- [ ] **Implementar busca inteligente**
  - Criar cliente no Asaas se não existir
  - Buscar por CPF/CNPJ antes de criar
  - Manter referências cruzadas
- [ ] **Interface de teste**
  - Modal para criar/buscar cliente
  - Validação de dados
  - Feedback visual de status

**Status:** ⏳ Aguardando OK  
**Estimativa:** 3-4 horas  
**Dependências:** Etapa 2.1  

---

### **💰 ETAPA 3: GESTÃO DE FATURAS**
*Prioridade: ALTA - Core do sistema*

#### **3.1 Implementar CRUD de Faturas**
- [ ] **`createInvoice()`**
  - Dados obrigatórios: customer, billingType, value, dueDate
  - Dados opcionais: description, externalReference, installments
  - Validações de valor e data
- [ ] **`getInvoice()`**
  - Busca por ID da fatura
  - Dados completos incluindo status
  - Links de pagamento (PIX/Boleto)
- [ ] **`getCustomerInvoices()`**
  - Lista todas as faturas do cliente
  - Paginação para muitos dados
  - Filtros de status e período
- [ ] **`updateInvoice()`**
  - Campos editáveis: dueDate, description, value
  - Restrições baseadas no status
  - Validações de negócio

**Status:** ⏳ Aguardando OK  
**Estimativa:** 5-6 horas  
**Dependências:** Etapa 2  

---

#### **3.2 Criação Automática de Faturas**
- [ ] **Implementar `createInvoicesForContract()`**
  - Calcular parcelas baseadas no contrato
  - Criar múltiplas faturas automaticamente
  - Data de vencimento progressiva (mensal)
  - Referência externa com ID do contrato
- [ ] **Integrar com `contractService.updateStatus()`**
  - Trigger quando status = "Ativo"
  - Validação de dados do contrato
  - Logs de auditoria
- [ ] **Sincronizar com tabela `invoices`**
  - Salvar dados no banco local
  - Manter referência ao `asaas_payment_id`
  - Status sincronizado

**Status:** ⏳ Aguardando OK  
**Estimativa:** 4-5 horas  
**Dependências:** Etapa 3.1  

---

### **💳 ETAPA 4: SISTEMA DE PAGAMENTOS**
*Prioridade: ALTA - Essencial para recebimento*

#### **4.1 Geração de Links de Pagamento**
- [ ] **`generatePixPayment()`**
  - Gerar QR Code PIX dinâmico
  - Código PIX copia e cola
  - Tempo de expiração configurável
  - Atualização automática de status
- [ ] **`generateBoletoPayment()`**
  - Linha digitável do boleto
  - URL para download PDF
  - Código de barras
  - Data de vencimento
- [ ] **Interface de pagamento**
  - Modal com opções PIX/Boleto
  - QR Code visual para PIX
  - Botão de download para boleto
  - Código PIX copiável

**Status:** ⏳ Aguardando OK  
**Estimativa:** 4-5 horas  
**Dependências:** Etapa 3  

---

#### **4.2 Webhook de Confirmação**
- [ ] **Implementar endpoint `/api/webhooks/asaas`**
  - Validação de assinatura
  - Processamento assíncrono
  - Tratamento de erros
  - Logs detalhados
- [ ] **Processar eventos de pagamento**
  - payment.created
  - payment.received
  - payment.overdue
  - payment.cancelled
- [ ] **Atualização automática de status**
  - Marcar fatura como paga
  - Atualizar data de pagamento
  - Calcular comissão do representante
  - Enviar notificação ao cliente

**Status:** ⏳ Aguardando OK  
**Estimativa:** 3-4 horas  
**Dependências:** Etapa 4.1  

---

### **⚡ ETAPA 5: INTEGRAÇÃO COM INTERFACE**
*Prioridade: MÉDIA - Melhorar experiência usuário*

#### **5.1 Atualizar Dashboards**
- [ ] **Dashboard do Cliente**
  - Mostrar faturas reais (não mockadas)
  - Botões de pagamento funcionais
  - Status atualizado em tempo real
  - Histórico de pagamentos
- [ ] **Dashboard do Admin**
  - Gestão de faturas completa
  - Relatórios financeiros básicos
  - Aprovação de pagamentos manuais
  - Controle de inadimplência
- [ ] **Dashboard do Representante**
  - Comissões baseadas em pagamentos reais
  - Status das faturas dos clientes
  - Relatórios de performance

**Status:** ⏳ Aguardando OK  
**Estimativa:** 5-6 horas  
**Dependências:** Etapa 4  

---

#### **5.2 Notificações e Alertas**
- [ ] **Notificações de vencimento**
  - Email/SMS 7 dias antes
  - Alerta 1 dia antes
  - Notificação de inadimplência
- [ ] **Confirmações de pagamento**
  - Recibo de pagamento
  - Próxima parcela disponível
  - Atualização de saldo
- [ ] **Alertas administrativos**
  - Faturas vencidas para admin
  - Relatório semanal de inadimplência
  - Exceções de sistema

**Status:** ⏳ Aguardando OK  
**Estimativa:** 3-4 horas  
**Dependências:** Etapa 5.1  

---

### **📊 ETAPA 6: RELATÓRIOS E ANÁLISES**
*Prioridade: BAIXA - Melhoria contínua*

#### **6.1 Relatórios Financeiros**
- [ ] **Relatório de recebimentos**
  - Total recebido por período
  - Métodos de pagamento mais usados
  - Taxa de inadimplência
  - Projeção de recebimentos
- [ ] **Relatório de comissões**
  - Comissões por representante
  - Comissões pagas vs pendentes
  - Ranking de performance
  - Projeção de pagamentos
- [ ] **Relatório de inadimplência**
  - Clientes em atraso
  - Valor total em atraso
  - Tempo médio de atraso
  - Planos de ação

**Status:** ⏳ Aguardando OK  
**Estimativa:** 4-5 horas  
**Dependências:** Etapa 5  

---

#### **6.2 Dashboard Analytics**
- [ ] **Métricas principais**
  - Total faturado vs recebido
  - Taxa de conversão de pagamentos
  - Crescimento mensal
  - Índice de satisfação
- [ ] **Gráficos e visualizações**
  - Evolução de recebimentos
  - Distribuição por status
  - Performance por representante
  - Análise de tendências
- [ ] **Exportação de dados**
  - PDF para impressão
  - Excel para análise
  - CSV para importação
  - Agendamento automático

**Status:** ⏳ Aguardando OK  
**Estimativa:** 3-4 horas  
**Dependências:** Etapa 6.1  

---

## 🎯 Critérios de Sucesso por Etapa

### **Etapa 1 - Concluída quando:**
- ✅ Credenciais armazenadas no banco
- ✅ AsaasService faz ping na API
- ✅ Configurações são carregadas dinamicamente

### **Etapa 2 - Concluída quando:**
- ✅ Cliente pode ser criado no Asaas
- ✅ Busca por CPF/CNPJ funciona
- ✅ Sincronização com banco local funciona

### **Etapa 3 - Concluída quando:**
- ✅ Faturas são criadas automaticamente ao aprovar contrato
- ✅ Admin pode ver todas as faturas
- ✅ Cliente vê suas faturas no dashboard

### **Etapa 4 - Concluída quando:**
- ✅ Cliente pode pagar via PIX
- ✅ Cliente pode pagar via Boleto
- ✅ Pagamento é confirmado automaticamente
- ✅ Fatura é marcada como paga

### **Etapa 5 - Concluída quando:**
- ✅ Dashboards mostram dados reais
- ✅ Notificações são enviadas
- ✅ Experiência do usuário é fluida

### **Etapa 6 - Concluída quando:**
- ✅ Relatórios são gerados automaticamente
- ✅ Métricas são precisas
- ✅ Dados são exportados corretamente

---

## 🚨 Pontos de Atenção

### **Segurança**
- 🔐 Validação de webhook signature do Asaas
- 🔐 Criptografia de dados sensíveis no banco
- 🔐 Logs de auditoria para todas as operações
- 🔐 Controle de acesso por role

### **Performance**
- ⚡ Cache de configurações em memória
- ⚡ Cache de clientes do Asaas
- ⚡ Processamento assíncrono de webhooks
- ⚡ Paginação para grandes volumes de dados

### **Confiabilidade**
- 🛡️ Retry automático em caso de falha
- 🛡️ Fallback para operações críticas
- 🛡️ Monitoramento de APIs externas
- 🛡️ Backup automático de dados importantes

### **Manutenibilidade**
- 📝 Documentação técnica atualizada
- 📝 Código bem comentado
- 📝 Testes unitários para funções críticas
- 📝 Logs estruturados para debugging

---

## 📅 Cronograma Estimado

**Total:** 35-45 horas de desenvolvimento

- **Semana 1:** Etapas 1 e 2 (Configuração + Clientes)
- **Semana 2:** Etapa 3 (Faturas)
- **Semana 3:** Etapa 4 (Pagamentos)
- **Semana 4:** Etapas 5 e 6 (Interface + Relatórios)

---

## 🔄 Próximas Ações

1. **Aguardar confirmação** para iniciar Etapa 1
2. **Configurar ambiente** de desenvolvimento
3. **Implementar** sistema de configurações
4. **Testar** cada funcionalidade antes de avançar
5. **Documentar** cada etapa concluída

---

*Documento criado em: 02/10/2025*  
*Última atualização: 02/10/2025*  
*Status: Aguardando confirmação para início*

