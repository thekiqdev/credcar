/**
 * Serviço de Webhooks ASAAS
 * Processa notificações automáticas de mudanças de status de pagamento
 */

import { supabase } from './supabase';
import crypto from 'crypto';

export interface AsaasWebhookEvent {
  event: 'PAYMENT_RECEIVED' | 'PAYMENT_OVERDUE' | 'PAYMENT_DELETED' | 'PAYMENT_CREATED' | 'PAYMENT_UPDATED';
  payment: {
    id: string;
    customer: string;
    value: number;
    netValue: number;
    originalValue: number;
    interestValue: number;
    description: string;
    billingType: 'PIX' | 'BOLETO' | 'CREDIT_CARD';
    pixTransaction?: {
      id: string;
      status: string;
      qrCode: string;
      endToEndIdentifier: string;
    };
    status: 'PENDING' | 'RECEIVED' | 'OVERDUE' | 'REFUNDED' | 'RECEIVED_IN_CASH' | 'CHARGEBACK_REQUESTED' | 'CHARGEBACK_DISPUTE' | 'AWAITING_CHARGEBACK_REVERSAL' | 'DUNNING_REQUESTED' | 'DUNNING_RECEIVED' | 'AWAITING_RISK_ANALYSIS';
    dueDate: string;
    originalDueDate: string;
    paymentDate?: string;
    clientPaymentDate?: string;
    installmentNumber?: number;
    invoiceUrl?: string;
    invoiceNumber?: string;
    externalReference?: string;
    deleted?: boolean;
    anticipated?: boolean;
    anticipable?: boolean;
    creditDate?: string;
    estimatedCreditDate?: string;
    transactionReceiptUrl?: string;
    nossoNumero?: string;
    bankSlipUrl?: string;
    lastInvoiceViewedDate?: string;
    lastBankSlipViewedDate?: string;
    discount?: {
      value: number;
      dueDateLimitDays: number;
      type: 'FIXED' | 'PERCENTAGE';
    };
    fine?: {
      value: number;
      type: 'FIXED' | 'PERCENTAGE';
    };
    interest?: {
      value: number;
      type: 'PERCENTAGE';
    };
    postalService?: boolean;
    escrow?: boolean;
    refunds?: any[];
  };
  paymentLink?: string;
  installment?: {
    id: string;
    installmentNumber: number;
    value: number;
    dueDate: string;
    status: string;
  };
}

export interface WebhookProcessingResult {
  success: boolean;
  invoiceId?: string;
  status?: string;
  errors: string[];
}

class AsaasWebhookService {
  /**
   * Validar assinatura do webhook ASAAS
   */
  validateSignature(payload: string, signature: string, secret: string): boolean {
    try {
      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(payload)
        .digest('hex');
      
      return signature === expectedSignature;
    } catch (error) {
      console.error('Erro ao validar assinatura do webhook:', error);
      return false;
    }
  }

  /**
   * Processar evento de webhook ASAAS
   */
  async processWebhookEvent(event: AsaasWebhookEvent): Promise<WebhookProcessingResult> {
    try {
      console.log(`🔔 Processando webhook ASAAS: ${event.event}`);
      console.log(`📋 Payment ID: ${event.payment.id}`);
      console.log(`📋 Status: ${event.payment.status}`);
      console.log(`📋 External Reference: ${event.payment.externalReference}`);

      // Buscar fatura local pelo externalReference
      const localInvoice = await this.findLocalInvoiceByExternalReference(event.payment.externalReference);
      
      if (!localInvoice) {
        console.log(`⚠️ Fatura local não encontrada para externalReference: ${event.payment.externalReference}`);
        return {
          success: false,
          errors: [`Fatura local não encontrada para externalReference: ${event.payment.externalReference}`]
        };
      }

      console.log(`✅ Fatura local encontrada: ID ${localInvoice.id}`);

      // Mapear status ASAAS para status local
      const localStatus = this.mapAsaasStatusToLocal(event.payment.status);
      
      // Atualizar fatura local
      const updateResult = await this.updateLocalInvoiceStatus(
        localInvoice.id,
        localStatus,
        event.payment.paymentDate,
        event.payment.transactionReceiptUrl
      );

      if (updateResult.success) {
        console.log(`✅ Fatura ${localInvoice.id} atualizada para status: ${localStatus}`);
        
        // Log do evento para auditoria
        await this.logWebhookEvent(event, localInvoice.id, localStatus);
        
        return {
          success: true,
          invoiceId: localInvoice.id,
          status: localStatus,
          errors: []
        };
      } else {
        return {
          success: false,
          errors: updateResult.errors
        };
      }

    } catch (error) {
      console.error('Erro ao processar webhook ASAAS:', error);
      return {
        success: false,
        errors: [error instanceof Error ? error.message : 'Erro desconhecido']
      };
    }
  }

  /**
   * Buscar fatura local pelo externalReference
   */
  private async findLocalInvoiceByExternalReference(externalReference?: string): Promise<any> {
    if (!externalReference) {
      return null;
    }

    try {
      // Tentar buscar pelo ID da fatura (externalReference pode ser o ID)
      const { data: invoiceById, error: errorById } = await supabase
        .from('invoices')
        .select('*')
        .eq('id', externalReference)
        .single();

      if (!errorById && invoiceById) {
        return invoiceById;
      }

      // Tentar buscar pelo invoice_code (ID do ASAAS)
      const { data: invoiceByCode, error: errorByCode } = await supabase
        .from('invoices')
        .select('*')
        .eq('invoice_code', externalReference)
        .single();

      if (!errorByCode && invoiceByCode) {
        return invoiceByCode;
      }

      return null;
    } catch (error) {
      console.error('Erro ao buscar fatura local:', error);
      return null;
    }
  }

  /**
   * Mapear status ASAAS para status local
   */
  private mapAsaasStatusToLocal(asaasStatus: string): string {
    const statusMap: Record<string, string> = {
      'PENDING': 'Pendente',
      'RECEIVED': 'Pago',
      'OVERDUE': 'Vencido',
      'REFUNDED': 'Estornado',
      'RECEIVED_IN_CASH': 'Pago',
      'CHARGEBACK_REQUESTED': 'Chargeback',
      'CHARGEBACK_DISPUTE': 'Chargeback',
      'AWAITING_CHARGEBACK_REVERSAL': 'Chargeback',
      'DUNNING_REQUESTED': 'Cobrança',
      'DUNNING_RECEIVED': 'Cobrança',
      'AWAITING_RISK_ANALYSIS': 'Análise'
    };

    return statusMap[asaasStatus] || 'Pendente';
  }

  /**
   * Atualizar status da fatura local
   */
  private async updateLocalInvoiceStatus(
    invoiceId: string,
    status: string,
    paymentDate?: string,
    receiptUrl?: string
  ): Promise<{ success: boolean; errors: string[] }> {
    try {
      const updateData: any = {
        status: status
      };

      if (paymentDate && status === 'Pago') {
        updateData.paid_at = paymentDate;
      }

      if (receiptUrl) {
        updateData.receipt_url = receiptUrl;
      }

      console.log(`🔄 Atualizando fatura ${invoiceId} com dados:`, updateData);

      const { error } = await supabase
        .from('invoices')
        .update(updateData)
        .eq('id', invoiceId);

      if (error) {
        console.error('Erro ao atualizar fatura local:', error);
        return {
          success: false,
          errors: [error.message]
        };
      }

      return {
        success: true,
        errors: []
      };
    } catch (error) {
      console.error('Erro ao atualizar status da fatura:', error);
      return {
        success: false,
        errors: [error instanceof Error ? error.message : 'Erro desconhecido']
      };
    }
  }

  /**
   * Log do evento de webhook para auditoria
   */
  private async logWebhookEvent(event: AsaasWebhookEvent, invoiceId: string, localStatus: string): Promise<void> {
    try {
      const logData = {
        event_type: event.event,
        payment_id: event.payment.id,
        invoice_id: invoiceId,
        asaas_status: event.payment.status,
        local_status: localStatus,
        payment_date: event.payment.paymentDate,
        external_reference: event.payment.externalReference,
        raw_data: JSON.stringify(event),
        processed_at: new Date().toISOString()
      };

      // Inserir log na tabela de auditoria (se existir)
      const { error } = await supabase
        .from('webhook_logs')
        .insert([logData]);

      if (error) {
        console.error('Erro ao salvar log do webhook:', error);
      } else {
        console.log(`📝 Log do webhook salvo para fatura ${invoiceId}`);
      }
    } catch (error) {
      console.error('Erro ao criar log do webhook:', error);
    }
  }

  /**
   * Processar múltiplos eventos de webhook
   */
  async processMultipleWebhookEvents(events: AsaasWebhookEvent[]): Promise<{
    success: boolean;
    processed: number;
    failed: number;
    results: WebhookProcessingResult[];
  }> {
    const results: WebhookProcessingResult[] = [];
    let processed = 0;
    let failed = 0;

    for (const event of events) {
      try {
        const result = await this.processWebhookEvent(event);
        results.push(result);
        
        if (result.success) {
          processed++;
        } else {
          failed++;
        }
      } catch (error) {
        console.error('Erro ao processar evento:', error);
        results.push({
          success: false,
          errors: [error instanceof Error ? error.message : 'Erro desconhecido']
        });
        failed++;
      }
    }

    return {
      success: failed === 0,
      processed,
      failed,
      results
    };
  }
}

export const asaasWebhookService = new AsaasWebhookService();
