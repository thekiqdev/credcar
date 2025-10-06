# 📋 PLANO-IMPLEMENTACAO-FATURAS-AUTOMATICAS.MD

## 🎯 Implementação do Sistema de Faturas Automáticas - CredCar

**Branch:** `deploy-v1.3`  
**Data:** 06/10/2025  
**Objetivo:** Automatizar criação de faturas baseada no plano de comissão e faixas de crédito

---

## 🔍 ANÁLISE DA SITUAÇÃO ATUAL

### ✅ **O QUE JÁ EXISTE:**
- ✅ Tabela `invoices` no banco de dados
- ✅ Tabela `anticipations` no banco de dados  
- ✅ Sistema de planos de comissão com faixas de crédito
- ✅ Campos: `1ª parcela`, `parcelas personalizadas`, `parcelas restantes`
- ✅ Função para subtrair parcelas (1ª + personalizadas) do total
- ✅ Interface para visualizar faturas (dados mockados)
- ✅ Sistema ASAAS configurado e funcionando

### ❌ **O QUE FALTA:**
- ❌ Criação automática de faturas ao ativar contrato
- ❌ Integração com dados reais do plano de comissão
- ❌ Geração de faturas personalizadas vs padrão
- ❌ Sincronização com ASAAS para pagamentos

---

## 🎯 ESTRATÉGIA DE IMPLEMENTAÇÃO

### **ABORDAGEM ESCOLHIDA:**
**Criação Automática Baseada em Plano de Comissão**

**Vantagens:**
- ✅ Aproveita estrutura existente
- ✅ Dados já organizados por faixa de crédito
- ✅ Lógica de parcelas já implementada
- ✅ Menor complexidade de desenvolvimento

---

## 📋 ETAPAS DE IMPLEMENTAÇÃO

### **🚀 ETAPA 1: ANÁLISE E PREPARAÇÃO**
*Prioridade: ALTA - Base para todo desenvolvimento*

#### **1.1 Mapear Estrutura Atual**
- [ ] **Analisar tabela de planos de comissão**
  - [ ] Identificar campos relacionados a parcelas
  - [ ] Mapear relação contrato → plano → faixa de crédito
  - [ ] Documentar estrutura de dados existente
- [ ] **Verificar função de cálculo de parcelas**
  - [ ] Testar função existente de subtração
  - [ ] Validar cálculos de parcelas personalizadas
  - [ ] Documentar lógica de negócio
- [ ] **Analisar dados de exemplo**
  - [ ] Usar dados da imagem como referência
  - [ ] Validar cálculos: 1ª parcela + personalizadas + restantes
  - [ ] Confirmar total de parcelas (80 no exemplo)

**Estimativa:** 2-3 horas  
**Dependências:** Nenhuma

---

#### **1.2 Criar Serviço de Análise de Contratos**
- [ ] **Implementar `contractAnalysisService`**
  - [ ] `getContractPaymentPlan(contractId)` - Buscar plano de pagamento
  - [ ] `calculateInstallments(contractId)` - Calcular parcelas
  - [ ] `validateContractForInvoicing(contractId)` - Validar se pode gerar faturas
- [ ] **Criar tipos TypeScript**
  - [ ] `PaymentPlan` - Estrutura do plano de pagamento
  - [ ] `InstallmentData` - Dados de cada parcela
  - [ ] `InvoiceGenerationData` - Dados para gerar faturas
- [ ] **Testes unitários**
  - [ ] Testar cálculos com dados reais
  - [ ] Validar cenários edge cases
  - [ ] Confirmar precisão dos cálculos

**Estimativa:** 4-5 horas  
**Dependências:** Etapa 1.1

---

### **💰 ETAPA 2: SERVIÇO DE CRIAÇÃO DE FATURAS**
*Prioridade: ALTA - Core do sistema*

#### **2.1 Implementar `invoiceGenerationService`**
- [ ] **Função principal: `createInvoicesForContract(contractId)`**
  - [ ] Buscar dados do contrato e plano de pagamento
  - [ ] Calcular todas as parcelas (1ª + personalizadas + restantes)
  - [ ] Gerar datas de vencimento progressivas
  - [ ] Criar registros na tabela `invoices`
- [ ] **Funções auxiliares:**
  - [ ] `generateFirstInstallment()` - Gerar 1ª parcela
  - [ ] `generateCustomInstallments()` - Gerar parcelas personalizadas
  - [ ] `generateRemainingInstallments()` - Gerar parcelas restantes
  - [ ] `calculateDueDates()` - Calcular datas de vencimento
- [ ] **Validações de negócio:**
  - [ ] Verificar se contrato está ativo
  - [ ] Verificar se já existem faturas
  - [ ] Validar dados do plano de pagamento
  - [ ] Confirmar cálculos antes de salvar

**Estimativa:** 6-7 horas  
**Dependências:** Etapa 1

---

#### **2.2 Integração com Trigger de Ativação**
- [ ] **Modificar `contractService.updateStatus()`**
  - [ ] Adicionar chamada para criação de faturas quando status = "Ativo"
  - [ ] Tratar erros na criação de faturas
  - [ ] Log de auditoria para criação de faturas
- [ ] **Implementar rollback em caso de erro**
  - [ ] Se criação de faturas falhar, reverter status do contrato
  - [ ] Log detalhado de erros
  - [ ] Notificação para admin em caso de falha
- [ ] **Interface para criação manual (admin)**
  - [ ] Botão "Gerar Faturas" no dashboard admin
  - [ ] Modal de confirmação com preview
  - [ ] Feedback visual de sucesso/erro

**Estimativa:** 3-4 horas  
**Dependências:** Etapa 2.1

---

### **🔄 ETAPA 3: INTEGRAÇÃO COM ASAAS**
*Prioridade: ALTA - Para pagamentos reais*

#### **3.1 Criar Faturas no ASAAS**
- [ ] **Implementar `asaasInvoiceService`**
  - [ ] `createAsaasInvoice(invoiceData)` - Criar fatura no ASAAS
  - [ ] `syncInvoiceWithAsaas(localInvoiceId)` - Sincronizar fatura local
  - [ ] `getAsaasInvoiceStatus(asaasId)` - Buscar status no ASAAS
- [ ] **Integrar com `invoiceGenerationService`**
  - [ ] Após criar fatura local, criar no ASAAS
  - [ ] Salvar `asaas_payment_id` na tabela local
  - [ ] Tratar erros de sincronização
- [ ] **Validações ASAAS:**
  - [ ] Verificar se cliente existe no ASAAS
  - [ ] Criar cliente se necessário
  - [ ] Validar dados antes de enviar

**Estimativa:** 5-6 horas  
**Dependências:** Etapa 2

---

#### **3.2 Geração de Links de Pagamento**
- [ ] **Implementar geração de PIX/Boleto**
  - [ ] `generatePixPayment(invoiceId)` - Gerar PIX
  - [ ] `generateBoletoPayment(invoiceId)` - Gerar Boleto
  - [ ] `getPaymentLinks(invoiceId)` - Buscar links existentes
- [ ] **Atualizar interface do cliente**
  - [ ] Botões "Pagar via PIX" e "Pagar via Boleto"
  - [ ] Modal com QR Code PIX
  - [ ] Link para download do boleto
- [ ] **Salvar links na tabela local**
  - [ ] Campos: `payment_link_pix`, `payment_link_boleto`
  - [ ] Atualizar quando links são gerados

**Estimativa:** 4-5 horas  
**Dependências:** Etapa 3.1

---

### **📊 ETAPA 4: INTERFACE E TESTES**
*Prioridade: MÉDIA - Melhorar experiência*

#### **4.1 Atualizar Dashboards**
- [ ] **Dashboard do Cliente**
  - [ ] Mostrar faturas reais (não mockadas)
  - [ ] Status atualizado em tempo real
  - [ ] Botões de pagamento funcionais
  - [ ] Histórico de pagamentos
- [ ] **Dashboard do Admin**
  - [ ] Lista de faturas geradas
  - [ ] Status de sincronização com ASAAS
  - [ ] Botão para re-sincronizar faturas
  - [ ] Relatório de faturas por período
- [ ] **Dashboard do Representante**
  - [ ] Faturas dos clientes do representante
  - [ ] Status de pagamento
  - [ ] Comissões baseadas em pagamentos reais

**Estimativa:** 5-6 horas  
**Dependências:** Etapa 3

---

#### **4.2 Testes e Validação**
- [ ] **Testes com dados reais**
  - [ ] Criar contrato de teste com plano de comissão
  - [ ] Ativar contrato e verificar criação de faturas
  - [ ] Validar cálculos de parcelas
  - [ ] Testar integração com ASAAS
- [ ] **Testes de cenários edge cases**
  - [ ] Contrato sem plano de comissão
  - [ ] Plano com parcelas personalizadas complexas
  - [ ] Erro na sincronização com ASAAS
  - [ ] Rollback em caso de falha
- [ ] **Validação de performance**
  - [ ] Tempo de criação de múltiplas faturas
  - [ ] Impacto na performance do sistema
  - [ ] Otimizações necessárias

**Estimativa:** 4-5 horas  
**Dependências:** Etapa 4.1

---

## 🎯 EXEMPLO PRÁTICO DE IMPLEMENTAÇÃO

### **Cenário da Imagem:**
```
Faixa de Crédito: R$ 20.000,00
1ª Parcela: R$ 883,00
Total de Parcelas: 80
Parcelas Personalizadas: 3 (2ª, 3ª = R$ 883,00 cada)
Parcelas Restantes: 77 × R$ 350,00
```

### **Fluxo de Criação:**
1. **Contrato ativado** → Status = "Ativo"
2. **Sistema busca plano de comissão** → Faixa de crédito R$ 20.000
3. **Calcula parcelas:**
   - 1ª parcela: R$ 883,00 (vencimento: +30 dias)
   - 2ª parcela: R$ 883,00 (vencimento: +60 dias)
   - 3ª parcela: R$ 883,00 (vencimento: +90 dias)
   - 4ª-80ª parcelas: R$ 350,00 (vencimento: +120, +150, ..., +2400 dias)
4. **Cria 80 faturas** na tabela `invoices`
5. **Sincroniza com ASAAS** → Cria 80 faturas no ASAAS
6. **Gera links de pagamento** → PIX/Boleto para cada fatura

---

## 📅 CRONOGRAMA ESTIMADO

### **Semana 1: Etapas 1 e 2**
- Análise e preparação (2-3 dias)
- Serviço de criação de faturas (2-3 dias)
- **Total:** 10-12 horas

### **Semana 2: Etapa 3**
- Integração com ASAAS (3-4 dias)
- Geração de links de pagamento (1-2 dias)
- **Total:** 9-11 horas

### **Semana 3: Etapa 4**
- Atualização de interfaces (2-3 dias)
- Testes e validação (2-3 dias)
- **Total:** 9-11 horas

**TOTAL GERAL:** 28-34 horas

---

## 🎯 CRITÉRIOS DE SUCESSO

### **Etapa 1 - Concluída quando:**
- [ ] Sistema identifica corretamente plano de comissão do contrato
- [ ] Cálculos de parcelas estão precisos
- [ ] Validações de negócio funcionam

### **Etapa 2 - Concluída quando:**
- [ ] Faturas são criadas automaticamente ao ativar contrato
- [ ] 1ª parcela, personalizadas e restantes são geradas corretamente
- [ ] Datas de vencimento são calculadas progressivamente

### **Etapa 3 - Concluída quando:**
- [ ] Faturas são sincronizadas com ASAAS
- [ ] Links de pagamento PIX/Boleto são gerados
- [ ] Cliente pode pagar online

### **Etapa 4 - Concluída quando:**
- [ ] Dashboards mostram dados reais
- [ ] Sistema funciona com dados de produção
- [ ] Performance é adequada

---

## 🚨 PONTOS DE ATENÇÃO

### **Segurança:**
- 🔐 Validar dados antes de criar faturas
- 🔐 Log de auditoria para todas as operações
- 🔐 Rollback em caso de falha

### **Performance:**
- ⚡ Criar faturas em lote para contratos com muitas parcelas
- ⚡ Processar sincronização ASAAS de forma assíncrona
- ⚡ Cache de dados do plano de comissão

### **Confiabilidade:**
- 🛡️ Validação de dados antes de salvar
- 🛡️ Retry automático para sincronização ASAAS
- 🛡️ Monitoramento de erros

---

## 🔄 PRÓXIMAS AÇÕES

1. **Confirmar plano** com o usuário
2. **Iniciar Etapa 1** - Análise e preparação
3. **Implementar** serviço de análise de contratos
4. **Testar** com dados reais
5. **Documentar** cada etapa concluída

---

*Documento criado em: 06/10/2025*  
*Branch: deploy-v1.3*  
*Status: Aguardando confirmação para início*
