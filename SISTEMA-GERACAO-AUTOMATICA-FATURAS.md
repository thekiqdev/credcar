# Sistema de Geração Automática de Faturas - CredCar

## Visão Geral

O sistema implementa geração automática mensal de faturas usando um cronjob que verifica o campo `next_invoice_date` e cria faturas progressivamente, integrando com ASAAS.

## Arquitetura

### Fluxo Principal

1. **Ativação do Contrato**: Cria apenas a 1ª parcela + calcula `next_invoice_date`
2. **Cronjob Diário**: Verifica faturas com `next_invoice_date <= hoje` e cria próxima parcela
3. **Webhook ASAAS**: Atualiza status automaticamente quando pagamento confirmado

### Componentes Implementados

#### 1. Database Schema
- **`invoices.next_invoice_date`**: Data para criar próxima fatura
- **`cron_execution_logs`**: Logs de execução do cronjob
- **`system_config`**: Configuração de dias de antecedência

#### 2. Services
- **`invoice-generation.service.ts`**: Modificado para criar apenas 1ª parcela
- **`invoice-cron.service.ts`**: Novo serviço para processar faturas agendadas
- **`system-config.service.ts`**: Adicionado `invoiceGenerationDaysAdvance`

#### 3. API Endpoints
- **`/api/cron/generate-invoices`**: Endpoint protegido para cronjob
- **`/api/cron/test-generate-invoices`**: Endpoint de teste (sem autenticação)

#### 4. Scripts
- **`cron-invoice-generation.sh`**: Script bash para Linux/macOS
- **`cron-invoice-generation.bat`**: Script batch para Windows

#### 5. Interface
- **AdminDashboard**: Seção de monitoramento em Configurações > Pagamentos

## Configuração

### 1. Executar Migrations

```sql
-- Adicionar coluna next_invoice_date
\i supabase/migrations/20250106000006_add_next_invoice_date.sql

-- Criar tabela de logs do cronjob
\i supabase/migrations/20250106000007_create_cron_execution_logs_table.sql
```

### 2. Configurar Variáveis de Ambiente

```bash
# Token de segurança para o cronjob
CRON_AUTH_TOKEN=credcar-cron-token-2025

# Ambiente (opcional)
NODE_ENV=production
```

### 3. Configurar Cronjob no Servidor

#### Linux/macOS
```bash
# Tornar script executável
chmod +x cron-invoice-generation.sh

# Adicionar ao crontab (executar diariamente às 08:00)
crontab -e
# Adicionar linha:
0 8 * * * /var/www/CredCar-Finance/cron-invoice-generation.sh
```

#### Windows (Task Scheduler)
1. Abrir "Agendador de Tarefas"
2. Criar nova tarefa básica
3. Configurar para executar diariamente às 08:00
4. Ação: Executar `cron-invoice-generation.bat`

### 4. Configurar Upload Server

O upload-server.js já está configurado com os endpoints do cronjob. Certifique-se de que está rodando:

```bash
# Desenvolvimento
npm run dev:server

# Produção
pm2 start upload-server.js --name "credcar-upload-server"
```

## Uso

### 1. Ativação de Contrato

Quando um contrato é ativado:
- Sistema cria APENAS a 1ª parcela
- Calcula `next_invoice_date` da 2ª parcela conforme configuração das Regras de Geração de Faturas
- Integra com ASAAS automaticamente

### 2. Execução Automática

O cronjob executa diariamente e:
- Busca faturas com `next_invoice_date <= hoje`
- Cria próxima parcela para cada fatura encontrada
- Calcula `next_invoice_date` da parcela seguinte
- Integra com ASAAS
- Registra logs de execução

### 3. Monitoramento

Acesse **Configurações > Pagamentos** no AdminDashboard para:
- Ver estatísticas do cronjob
- Executar testes manuais
- Acompanhar execuções

### 4. Teste Manual

```bash
# Teste via script
./cron-invoice-generation.sh test

# Teste via API
curl -X GET http://localhost:3001/api/cron/test-generate-invoices
```

## Exemplo de Fluxo

### Contrato Ativado (Hoje: 2025-01-06)

1. **1ª Parcela Criada**:
   - `installment_number: 1`
   - `amount: R$ 883,00`
   - `due_date: 2025-02-05` (hoje + 30 dias)
   - `next_invoice_date: 2025-01-21` (conforme configuração das Regras de Geração de Faturas)

2. **Cronjob Executa (2025-01-21)**:
   - Encontra fatura com `next_invoice_date: 2025-01-21`
   - Cria 2ª parcela:
     - `installment_number: 2`
     - `amount: R$ 883,00`
     - `due_date: 2025-03-05`
     - `next_invoice_date: 2025-02-18` (conforme configuração das Regras de Geração de Faturas)
   - Atualiza 1ª parcela: `next_invoice_date: NULL`

3. **Pagamento Confirmado**:
   - Webhook ASAAS atualiza status da 1ª parcela para "paid"
   - Sistema não precisa gerar próxima parcela (já foi gerada pelo cron)

## Configurações Avançadas

### Dias de Antecedência

Configure em **Configurações > Pagamentos**:
- Configurável nas Regras de Geração de Faturas (Configurações > Pagamentos)
- Pode ser ajustado conforme necessidade

### Token de Segurança

Para produção, altere o token padrão:
```bash
export CRON_AUTH_TOKEN="seu-token-super-seguro-2025"
```

### Logs e Debugging

Logs são salvos em:
- **Database**: Tabela `cron_execution_logs`
- **Scripts**: Arquivos em `logs/` (se configurado)
- **Console**: Upload server logs

## Troubleshooting

### Problemas Comuns

1. **Cronjob não executa**:
   - Verificar se script tem permissão de execução
   - Verificar logs do sistema
   - Testar manualmente: `./cron-invoice-generation.sh test`

2. **Faturas não são criadas**:
   - Verificar se `next_invoice_date` está preenchido
   - Verificar logs do cronjob
   - Verificar integração com ASAAS

3. **Erro de autenticação**:
   - Verificar `CRON_AUTH_TOKEN`
   - Verificar se endpoint está acessível

### Comandos Úteis

```bash
# Verificar status do upload server
pm2 status upload-server

# Ver logs do upload server
pm2 logs upload-server

# Testar endpoint manualmente
curl -H "Authorization: Bearer credcar-cron-token-2025" \
     http://localhost:3001/api/cron/generate-invoices

# Verificar faturas com next_invoice_date
psql -d credcar -c "SELECT id, contract_id, installment_number, next_invoice_date FROM invoices WHERE next_invoice_date IS NOT NULL;"
```

## Vantagens do Sistema

- **Performance**: Não cria 80 faturas de uma vez
- **ASAAS**: Não sobrecarrega com faturas futuras
- **Escalável**: Funciona para milhares de contratos
- **Manutenível**: Cronjob independente e monitorado
- **Flexível**: Fácil ajustar datas e lógica

## Próximos Passos

1. **Deploy em Produção**: Configurar cronjob no servidor
2. **Monitoramento**: Implementar alertas por email
3. **Relatórios**: Dashboard de estatísticas avançadas
4. **Backup**: Estratégia de backup dos logs
5. **Testes**: Suite de testes automatizados
