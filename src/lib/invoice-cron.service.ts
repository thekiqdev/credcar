// Serviço de Cronjob para Geração Automática de Faturas
// Arquivo: src/lib/invoice-cron.service.ts

import { supabase } from './supabase';
import { invoiceGenerationService, InvoiceData } from './invoice-generation.service';
import { asaasInvoiceService } from './asaas-invoice.service';

// Tipos para o serviço de cron
export interface CronJobResult {
  processed: number;
  created: number;
  failed: number;
  errors: string[];
  details: CronJobDetail[];
}

export interface CronJobDetail {
  contractId: number;
  invoiceId: string;
  installmentNumber: number;
  status: 'success' | 'failed' | 'skipped';
  message: string;
  nextInvoiceDate?: string;
}

export interface InvoiceToProcess {
  id: string;
  contract_id: number;
  installment_number: number;
  amount: number;
  due_date: string;
  next_invoice_date: string;
  status: string;
}

class InvoiceCronService {
  /**
   * Processar faturas agendadas para criação automática
   */
  async processScheduledInvoices(): Promise<CronJobResult> {
    const startTime = new Date();
    console.log(`🚀 [CRON] Iniciando processamento de faturas agendadas - ${startTime.toISOString()}`);

    const result: CronJobResult = {
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
          
          // Criar próxima fatura
          const nextInvoice = await invoiceGenerationService.createNextInvoice(
            invoice.contract_id, 
            invoice.installment_number
          );

          if (!nextInvoice) {
            // Não há mais parcelas para criar
            const detail: CronJobDetail = {
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

          // Criar fatura no ASAAS
          try {
            const asaasResult = await asaasInvoiceService.createInvoiceInAsaas(createdInvoice);
            
            if (asaasResult.success) {
              console.log(`✅ [CRON] Fatura ${createdInvoice.id} criada no ASAAS: ${asaasResult.asaasInvoiceId}`);
              console.log(`   PIX: ${asaasResult.pixQrCode ? 'Disponível' : 'N/A'}`);
              console.log(`   Boleto: ${asaasResult.bankSlipUrl ? 'Disponível' : 'N/A'}`);
            } else {
              console.warn(`⚠️ [CRON] Falha ao criar fatura ${createdInvoice.id} no ASAAS:`, asaasResult.errors);
            }
          } catch (asaasError) {
            console.warn(`⚠️ [CRON] Erro ASAAS para fatura ${createdInvoice.id}:`, asaasError);
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
          const detail: CronJobDetail = {
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

          const detail: CronJobDetail = {
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

      // 3. Registrar log da execução
      await this.logCronExecution(result, startTime, endTime);

      return result;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido no cronjob';
      result.errors.push(errorMessage);
      
      console.error(`❌ [CRON] Erro geral no processamento:`, error);
      
      // Registrar erro no log
      await this.logCronExecution(result, startTime, new Date());
      
      return result;
    }
  }

  /**
   * Buscar faturas que precisam gerar próxima parcela
   */
  async getInvoicesToProcess(): Promise<InvoiceToProcess[]> {
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
   * Registrar log da execução do cronjob
   */
  private async logCronExecution(
    result: CronJobResult, 
    startTime: Date, 
    endTime: Date
  ): Promise<void> {
    try {
      const logData = {
        execution_date: startTime.toISOString(),
        duration_ms: endTime.getTime() - startTime.getTime(),
        invoices_processed: result.processed,
        invoices_created: result.created,
        invoices_failed: result.failed,
        errors: result.errors,
        details: result.details,
        status: result.failed > 0 ? 'partial_success' : 'success'
      };

      const { error } = await supabase
        .from('cron_execution_logs')
        .insert(logData);

      if (error) {
        console.warn('⚠️ [CRON] Erro ao registrar log de execução:', error);
      } else {
        console.log(`📝 [CRON] Log de execução registrado`);
      }
    } catch (error) {
      console.warn('⚠️ [CRON] Erro ao registrar log:', error);
    }
  }

  /**
   * Obter estatísticas do cronjob
   */
  async getCronStats(): Promise<{
    lastExecution: Date | null;
    totalExecutions: number;
    successRate: number;
    avgDuration: number;
  }> {
    try {
      const { data, error } = await supabase
        .from('cron_execution_logs')
        .select('execution_date, duration_ms, status')
        .order('execution_date', { ascending: false })
        .limit(30); // Últimas 30 execuções

      if (error) {
        console.error('Erro ao buscar estatísticas do cron:', error);
        return {
          lastExecution: null,
          totalExecutions: 0,
          successRate: 0,
          avgDuration: 0
        };
      }

      if (!data || data.length === 0) {
        return {
          lastExecution: null,
          totalExecutions: 0,
          successRate: 0,
          avgDuration: 0
        };
      }

      const totalExecutions = data.length;
      const successfulExecutions = data.filter(log => log.status === 'success').length;
      const successRate = (successfulExecutions / totalExecutions) * 100;
      const avgDuration = data.reduce((sum, log) => sum + (log.duration_ms || 0), 0) / totalExecutions;

      return {
        lastExecution: data[0] ? new Date(data[0].execution_date) : null,
        totalExecutions,
        successRate,
        avgDuration
      };
    } catch (error) {
      console.error('Erro ao calcular estatísticas do cron:', error);
      return {
        lastExecution: null,
        totalExecutions: 0,
        successRate: 0,
        avgDuration: 0
      };
    }
  }

  /**
   * Executar teste manual do cronjob
   */
  async runManualTest(): Promise<CronJobResult> {
    console.log('🧪 [CRON] Executando teste manual do cronjob');
    return await this.processScheduledInvoices();
  }
}

export const invoiceCronService = new InvoiceCronService();
