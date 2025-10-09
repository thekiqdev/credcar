// Serviço de Cronjob para Geração Automática de Faturas (JavaScript)
// Arquivo: src/lib/invoice-cron.service.js
// Versão JavaScript para uso no upload-server.js

import { createClient } from '@supabase/supabase-js';

// Configuração do Supabase
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Variáveis de ambiente do Supabase não encontradas!');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

class InvoiceCronService {
  /**
   * Processar faturas agendadas para criação automática
   */
  async processScheduledInvoices() {
    const startTime = new Date();
    console.log(`🚀 [CRON] Iniciando processamento de faturas agendadas - ${startTime.toISOString()}`);

    const result = {
      processed: 0,
      created: 0,
      failed: 0,
      errors: [],
      details: []
    };

    try {
      // 1. Buscar faturas que precisam gerar próxima parcela
      const invoicesToProcess = await this.getInvoicesToProcess();
      
      console.log(`📋 [CRON] Encontradas ${invoicesToProcess.length} faturas para processar`);

      if (invoicesToProcess.length === 0) {
        console.log(`✅ [CRON] Nenhuma fatura para processar hoje`);
        return result;
      }

      // 2. Processar cada fatura
      for (const invoice of invoicesToProcess) {
        result.processed++;
        
        try {
          console.log(`🔄 [CRON] Processando contrato ${invoice.contract_id}, parcela ${invoice.installment_number}`);
          
          // Criar próxima fatura (simplificado para teste)
          const nextInvoice = await this.createNextInvoiceSimple(
            invoice.contract_id, 
            invoice.installment_number
          );

          if (!nextInvoice) {
            const detail = {
              contractId: invoice.contract_id,
              invoiceId: invoice.id,
              installmentNumber: invoice.installment_number,
              status: 'skipped',
              message: 'Todas as parcelas já foram criadas'
            };
            result.details.push(detail);
            console.log(`⏭️ [CRON] Contrato ${invoice.contract_id} - todas as parcelas criadas`);
            continue;
          }

          // Inserir nova fatura no banco
          const { data: createdInvoice, error: insertError } = await supabase
            .from('invoices')
            .insert(nextInvoice)
            .select()
            .single();

          if (insertError) {
            throw new Error(`Erro ao inserir fatura: ${insertError.message}`);
          }

          // Atualizar next_invoice_date da fatura anterior para NULL
          const { error: updateError } = await supabase
            .from('invoices')
            .update({ next_invoice_date: null })
            .eq('id', invoice.id);

          if (updateError) {
            console.warn(`⚠️ [CRON] Erro ao atualizar next_invoice_date da fatura ${invoice.id}:`, updateError);
          }

          // Registrar sucesso
          const detail = {
            contractId: invoice.contract_id,
            invoiceId: createdInvoice.id,
            installmentNumber: nextInvoice.installment_number,
            status: 'success',
            message: `Parcela ${nextInvoice.installment_number} criada com sucesso`,
            nextInvoiceDate: nextInvoice.next_invoice_date || undefined
          };
          result.details.push(detail);
          result.created++;

          console.log(`✅ [CRON] Contrato ${invoice.contract_id} - parcela ${nextInvoice.installment_number} criada (R$ ${nextInvoice.amount.toLocaleString('pt-BR')})`);

        } catch (error) {
          result.failed++;
          const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
          result.errors.push(`Contrato ${invoice.contract_id}: ${errorMessage}`);

          const detail = {
            contractId: invoice.contract_id,
            invoiceId: invoice.id,
            installmentNumber: invoice.installment_number,
            status: 'failed',
            message: errorMessage
          };
          result.details.push(detail);

          console.error(`❌ [CRON] Erro ao processar contrato ${invoice.contract_id}:`, error);
        }
      }

      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();
      
      console.log(`🏁 [CRON] Processamento concluído em ${duration}ms`);
      console.log(`📊 [CRON] Resultado: ${result.created} criadas, ${result.failed} falharam, ${result.processed} processadas`);

      return result;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido no cronjob';
      result.errors.push(errorMessage);
      
      console.error(`❌ [CRON] Erro geral no processamento:`, error);
      
      return result;
    }
  }

  /**
   * Buscar faturas que precisam gerar próxima parcela
   */
  async getInvoicesToProcess() {
    try {
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      
      console.log(`🔍 [CRON] Buscando faturas com next_invoice_date <= ${today}`);

      const { data, error } = await supabase
        .from('invoices')
        .select('id, contract_id, installment_number, amount, due_date, next_invoice_date, status')
        .not('next_invoice_date', 'is', null)
        .lte('next_invoice_date', today)
        .neq('status', 'cancelled')
        .order('contract_id, installment_number');

      if (error) {
        throw new Error(`Erro ao buscar faturas: ${error.message}`);
      }

      console.log(`📋 [CRON] Encontradas ${data?.length || 0} faturas para processar`);

      return data || [];
    } catch (error) {
      console.error('Erro ao buscar faturas para processar:', error);
      return [];
    }
  }

  /**
   * Criar próxima fatura (versão simplificada)
   */
  async createNextInvoiceSimple(contractId, currentInstallment) {
    try {
      console.log(`🚀 Criando próxima fatura para contrato ${contractId}, parcela ${currentInstallment + 1}`);

      // Buscar dados básicos do contrato
      const { data: contract, error: contractError } = await supabase
        .from('contracts')
        .select('credit_amount, payment_installments')
        .eq('id', contractId)
        .single();

      if (contractError || !contract) {
        console.error(`❌ Contrato ${contractId} não encontrado`);
        return null;
      }

      const nextInstallmentNumber = currentInstallment + 1;
      
      // Verificar se já existe a próxima parcela
      const { data: existingInvoice } = await supabase
        .from('invoices')
        .select('id')
        .eq('contract_id', contractId)
        .eq('installment_number', nextInstallmentNumber)
        .single();

      if (existingInvoice) {
        console.log(`✅ Parcela ${nextInstallmentNumber} já existe para contrato ${contractId}`);
        return null;
      }

      // Calcular valor da próxima parcela (simplificado)
      const totalInstallments = contract.payment_installments || 80;
      const installmentValue = Math.round(contract.credit_amount / totalInstallments);

      // Calcular data de vencimento (simplificado)
      const today = new Date();
      const dueDate = new Date(today);
      dueDate.setMonth(dueDate.getMonth() + nextInstallmentNumber);
      
      const yearStr = dueDate.getFullYear();
      const monthStr = String(dueDate.getMonth() + 1).padStart(2, '0');
      const dayStr = String(dueDate.getDate()).padStart(2, '0');
      const dueDateStr = `${yearStr}-${monthStr}-${dayStr}`;

      // Calcular next_invoice_date da parcela seguinte
      let nextInvoiceDate = null;
      
      if (nextInstallmentNumber < totalInstallments) {
        const nextDueDate = new Date(dueDate);
        nextDueDate.setMonth(nextDueDate.getMonth() + 1);
        
        const nextDate = new Date(nextDueDate);
        nextDate.setDate(nextDate.getDate() - 15); // 15 dias antes
        
        const nextYearStr = nextDate.getFullYear();
        const nextMonthStr = String(nextDate.getMonth() + 1).padStart(2, '0');
        const nextDayStr = String(nextDate.getDate()).padStart(2, '0');
        nextInvoiceDate = `${nextYearStr}-${nextMonthStr}-${nextDayStr}`;
      }

      const invoice = {
        contract_id: contractId,
        installment_number: nextInstallmentNumber,
        amount: installmentValue,
        due_date: dueDateStr,
        status: 'Pendente',
        notes: `Parcela ${nextInstallmentNumber} - automática`,
        next_invoice_date: nextInvoiceDate
      };

      console.log(`✅ Próxima fatura gerada: Parcela ${nextInstallmentNumber} - R$ ${invoice.amount.toLocaleString('pt-BR')} - vence ${invoice.due_date}`);

      return invoice;
    } catch (error) {
      console.error('Erro ao criar próxima fatura:', error);
      return null;
    }
  }

  /**
   * Executar teste manual do cronjob
   */
  async runManualTest() {
    console.log('🧪 [CRON] Executando teste manual do cronjob');
    return await this.processScheduledInvoices();
  }
}

export const invoiceCronService = new InvoiceCronService();


