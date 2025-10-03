# 📋 TAREFAS-FATURAS.MD

## 🎯 Roadmap para Implementação Completa do Sistema de Faturas

---

## 🚀 FASE 1: FUNCIONALIDADE BÁSICA
*Prioridade: ALTA - Base para todo o sistema*

### ✅ **TAREFA 1.1: Implementar Serviço de Faturas**
- [ ] **1.1.1** Criar `invoiceService` em `src/lib/supabase.ts`
  - [ ] `createInvoicesForContract(contractId, installments, totalValue)`
  - [ ] `getInvoicesByContract(contractId)`
  - [ ] `updateInvoiceStatus(invoiceId, status, paymentData)`
  - [ ] `deleteInvoice(invoiceId)`
- [ ] **1.1.2** Implementar validações de negócio
  - [ ] Verificar se contrato está ativo
  - [ ] Calcular valor das parcelas
  - [ ] Validar datas de vencimento
- [ ] **1.1.3** Testes unitários para o serviço

### ✅ **TAREFA 1.2: Criação Automática de Faturas**
- [ ] **1.2.1** Implementar trigger automático
  - [ ] Função que executa quando contrato fica "Ativo"
  - [ ] Criar todas as parcelas de uma vez
  - [ ] Gerar números sequenciais (FAT-000001, FAT-000002...)
- [ ] **1.2.2** Integrar com `contractService.updateStatus()`
  - [ ] Chamar criação de faturas após aprovação
  - [ ] Tratar erros na criação
  - [ ] Log de auditoria
- [ ] **1.2.3** Interface para criação manual (admin)
  - [ ] Botão "Gerar Faturas" no dashboard admin
  - [ ] Modal de confirmação
  - [ ] Feedback visual

### ✅ **TAREFA 1.3: Gestão de Status de Faturas**
- [ ] **1.3.1** Implementar mudança de status
  - [ ] Pendente → Pago
  - [ ] Pendente → Vencido (automático)
  - [ ] Pago → Estornado (admin)
- [ ] **1.3.2** Validações de status
  - [ ] Não permitir pagar fatura já paga
  - [ ] Não permitir estornar fatura vencida
  - [ ] Verificar permissões do usuário
- [ ] **1.3.3** Atualização automática de status
  - [ ] Job diário para marcar faturas vencidas
  - [ ] Notificação quando fatura vence

---

## 💳 FASE 2: SISTEMA DE PAGAMENTOS
*Prioridade: ALTA - Essencial para recebimento*

### ✅ **TAREFA 2.1: Integração com Gateway de Pagamento**
- [ ] **2.1.1** Escolher e configurar gateway
  - [ ] Mercado Pago (recomendado)
  - [ ] PagSeguro
  - [ ] Asaas
  - [ ] Configurar credenciais de produção/sandbox
- [ ] **2.1.2** Implementar serviço de pagamento
  - [ ] `paymentService.createPixPayment(invoiceId, amount)`
  - [ ] `paymentService.createBoletoPayment(invoiceId, amount)`
  - [ ] `paymentService.getPaymentStatus(paymentId)`
  - [ ] `paymentService.processWebhook(webhookData)`

### ✅ **TAREFA 2.2: Geração de Links de Pagamento**
- [ ] **2.2.1** Interface para gerar pagamento
  - [ ] Botão "Pagar" na fatura
  - [ ] Modal com opções: PIX, Boleto
  - [ ] QR Code para PIX
  - [ ] Link para boleto
- [ ] **2.2.2** Implementar QR Code PIX
  - [ ] Gerar código PIX dinâmico
  - [ ] Mostrar QR Code na tela
  - [ ] Copiar código PIX
- [ ] **2.2.3** Implementar Boleto
  - [ ] Gerar boleto bancário
  - [ ] Download do PDF
  - [ ] Código de barras

### ✅ **TAREFA 2.3: Confirmação Automática de Pagamento**
- [ ] **2.3.1** Implementar webhook
  - [ ] Endpoint para receber confirmações
  - [ ] Validação de assinatura
  - [ ] Processamento assíncrono
- [ ] **2.3.2** Atualização automática de status
  - [ ] Marcar fatura como paga
  - [ ] Atualizar data de pagamento
  - [ ] Enviar notificação
- [ ] **2.3.3** Tratamento de erros
  - [ ] Log de webhooks falhados
  - [ ] Reprocessamento manual
  - [ ] Alertas para admin

---

## ⚡ FASE 3: SISTEMA DE ANTECIPAÇÕES
*Prioridade: MÉDIA - Funcionalidade diferenciada*

### ✅ **TAREFA 3.1: Interface de Solicitação de Antecipação**
- [ ] **3.1.1** Modal de solicitação
  - [ ] Seleção de parcelas para antecipar
  - [ ] Cálculo de desconto
  - [ ] Campo para motivo
  - [ ] Preview do valor final
- [ ] **3.1.2** Validações de negócio
  - [ ] Verificar se parcelas estão pendentes
  - [ ] Calcular desconto baseado em regras
  - [ ] Verificar limite de antecipação
- [ ] **3.1.3** Histórico de solicitações
  - [ ] Lista de antecipações solicitadas
  - [ ] Status: Pendente, Aprovada, Rejeitada
  - [ ] Detalhes de cada solicitação

### ✅ **TAREFA 3.2: Aprovação pelo Admin**
- [ ] **3.2.1** Interface de aprovação
  - [ ] Lista de solicitações pendentes
  - [ ] Detalhes da solicitação
  - [ ] Botões: Aprovar, Rejeitar
  - [ ] Campo para observações
- [ ] **3.2.2** Processamento da aprovação
  - [ ] Gerar nova fatura com valor antecipado
  - [ ] Cancelar parcelas originais
  - [ ] Calcular comissão do representante
  - [ ] Enviar notificação ao cliente
- [ ] **3.2.3** Relatório de antecipações
  - [ ] Dashboard com métricas
  - [ ] Relatório mensal
  - [ ] Análise de tendências

---

## 🔔 FASE 4: AUTOMAÇÃO E NOTIFICAÇÕES
*Prioridade: MÉDIA - Melhoria da experiência*

### ✅ **TAREFA 4.1: Sistema de Notificações**
- [ ] **4.1.1** Notificações de vencimento
  - [ ] Email 7 dias antes do vencimento
  - [ ] Email 1 dia antes do vencimento
  - [ ] SMS para vencimentos críticos
- [ ] **4.1.2** Notificações de pagamento
  - [ ] Confirmação de pagamento
  - [ ] Recibo de pagamento
  - [ ] Próxima parcela disponível
- [ ] **4.1.3** Notificações administrativas
  - [ ] Faturas vencidas para admin
  - [ ] Relatório semanal de inadimplência
  - [ ] Alertas de valores altos

### ✅ **TAREFA 4.2: Jobs Automatizados**
- [ ] **4.2.1** Job de vencimento
  - [ ] Executar diariamente às 6h
  - [ ] Marcar faturas como vencidas
  - [ ] Enviar notificações
- [ ] **4.2.2** Job de cobrança
  - [ ] Executar semanalmente
  - [ ] Gerar relatório de inadimplência
  - [ ] Enviar cobrança por email
- [ ] **4.2.3** Job de limpeza
  - [ ] Limpar logs antigos
  - [ ] Arquivar faturas antigas
  - [ ] Backup de dados críticos

---

## 📊 FASE 5: RELATÓRIOS E ANALYTICS
*Prioridade: BAIXA - Melhoria contínua*

### ✅ **TAREFA 5.1: Dashboard Financeiro**
- [ ] **5.1.1** Métricas principais
  - [ ] Total faturado no mês
  - [ ] Total recebido no mês
  - [ ] Taxa de inadimplência
  - [ ] Projeção de recebimentos
- [ ] **5.1.2** Gráficos e visualizações
  - [ ] Gráfico de recebimentos por mês
  - [ ] Distribuição por status
  - [ ] Top representantes
  - [ ] Análise de tendências
- [ ] **5.1.3** Filtros e exportação
  - [ ] Filtro por período
  - [ ] Filtro por representante
  - [ ] Exportar para Excel/PDF
  - [ ] Agendamento de relatórios

### ✅ **TAREFA 5.2: Relatórios Específicos**
- [ ] **5.2.1** Relatório de inadimplência
  - [ ] Lista de clientes em atraso
  - [ ] Valor total em atraso
  - [ ] Tempo médio de atraso
  - [ ] Ações de cobrança
- [ ] **5.2.2** Relatório de antecipações
  - [ ] Volume de antecipações
  - [ ] Desconto médio aplicado
  - [ ] Impacto no fluxo de caixa
  - [ ] Análise de rentabilidade
- [ ] **5.2.3** Relatório de comissões
  - [ ] Comissões por representante
  - [ ] Comissões pagas vs pendentes
  - [ ] Projeção de pagamentos
  - [ ] Ranking de performance

---

## 🧪 FASE 6: TESTES E QUALIDADE
*Prioridade: ALTA - Garantia de qualidade*

### ✅ **TAREFA 6.1: Testes Unitários**
- [ ] **6.1.1** Testes de serviços
  - [ ] `invoiceService` - todas as funções
  - [ ] `paymentService` - integração com gateway
  - [ ] `anticipationService` - cálculos e validações
- [ ] **6.1.2** Testes de componentes
  - [ ] Componentes de faturas
  - [ ] Modais de pagamento
  - [ ] Formulários de antecipação
- [ ] **6.1.3** Testes de integração
  - [ ] Fluxo completo de criação de fatura
  - [ ] Fluxo de pagamento
  - [ ] Fluxo de antecipação

### ✅ **TAREFA 6.2: Testes de Performance**
- [ ] **6.2.1** Testes de carga
  - [ ] Criação de múltiplas faturas
  - [ ] Processamento de webhooks
  - [ ] Consultas complexas
- [ ] **6.2.2** Otimizações
  - [ ] Índices no banco de dados
  - [ ] Cache de consultas frequentes
  - [ ] Paginação de listas grandes
- [ ] **6.2.3** Monitoramento
  - [ ] Logs de performance
  - [ ] Alertas de lentidão
  - [ ] Métricas de uso

---

## 🔒 FASE 7: SEGURANÇA E COMPLIANCE
*Prioridade: ALTA - Proteção de dados*

### ✅ **TAREFA 7.1: Segurança de Dados**
- [ ] **7.1.1** Criptografia
  - [ ] Criptografar dados sensíveis
  - [ ] Hash de senhas
  - [ ] Certificados SSL
- [ ] **7.1.2** Controle de acesso
  - [ ] Permissões por role
  - [ ] Auditoria de ações
  - [ ] Logs de segurança
- [ ] **7.1.3** Backup e recuperação
  - [ ] Backup automático diário
  - [ ] Teste de recuperação
  - [ ] Plano de contingência

### ✅ **TAREFA 7.2: Compliance LGPD**
- [ ] **7.2.1** Proteção de dados pessoais
  - [ ] Anonimização de dados
  - [ ] Consentimento explícito
  - [ ] Direito ao esquecimento
- [ ] **7.2.2** Relatórios de compliance
  - [ ] Relatório de acesso a dados
  - [ ] Relatório de alterações
  - [ ] Relatório de vazamentos
- [ ] **7.2.3** Treinamento da equipe
  - [ ] Capacitação em LGPD
  - [ ] Procedimentos de segurança
  - [ ] Plano de resposta a incidentes

---

## 📅 CRONOGRAMA SUGERIDO

### **Semana 1-2: FASE 1**
- Implementar serviço básico de faturas
- Criação automática de faturas
- Gestão de status

### **Semana 3-4: FASE 2**
- Integração com gateway de pagamento
- Links de pagamento PIX/Boleto
- Webhook de confirmação

### **Semana 5-6: FASE 3**
- Sistema de antecipações
- Aprovação pelo admin
- Relatórios básicos

### **Semana 7-8: FASE 4**
- Notificações automáticas
- Jobs de automação
- Melhorias de UX

### **Semana 9-10: FASE 5-7**
- Relatórios avançados
- Testes e qualidade
- Segurança e compliance

---

## 🎯 CRITÉRIOS DE SUCESSO

### **FASE 1 - Concluída quando:**
- [ ] Faturas são criadas automaticamente ao aprovar contrato
- [ ] Admin pode marcar faturas como pagas
- [ ] Cliente vê suas faturas no dashboard
- [ ] Status é atualizado corretamente

### **FASE 2 - Concluída quando:**
- [ ] Cliente pode pagar via PIX
- [ ] Cliente pode pagar via Boleto
- [ ] Pagamento é confirmado automaticamente
- [ ] Fatura é marcada como paga automaticamente

### **FASE 3 - Concluída quando:**
- [ ] Cliente pode solicitar antecipação
- [ ] Admin pode aprovar/rejeitar
- [ ] Nova fatura é gerada com desconto
- [ ] Comissão é calculada corretamente

---

## 📝 NOTAS IMPORTANTES

1. **Prioridade**: Focar nas Fases 1 e 2 primeiro - são essenciais
2. **Testes**: Implementar testes desde o início
3. **Documentação**: Documentar cada funcionalidade implementada
4. **Backup**: Fazer backup antes de cada deploy
5. **Monitoramento**: Implementar logs e métricas desde o início

---

*Documento criado em: 02/10/2025*
*Última atualização: 02/10/2025*

