// Serviço de Geração de Faturas
// Arquivo: src/lib/invoice-generation.service.ts

import { supabase } from './supabase';
import { contractAnalysisService, InstallmentData, InvoiceGenerationData } from './contract-analysis.service';

// Tipos TypeScript para o serviço
export interface InvoiceData {
  id?: string;
  contract_id: number;
  installment_number: number;
  invoice_number?: string;
  amount: number;
  due_date: string;
  payment_date?: string;
  payment_method?: string;
  notes?: string;
  status: 'Pendente' | 'Pago' | 'Vencido';
  created_at?: string;
  updated_at?: string;
}

export interface InvoiceGenerationResult {
  success: boolean;
  invoicesCreated: number;
  contractId: number;
  errors: string[];
  invoices?: InvoiceData[];
}

class InvoiceGenerationService {
  /**
   * Função principal: Criar faturas para um contrato
   */
  async createInvoicesForContract(contractId: number): Promise<InvoiceGenerationResult> {
    try {
      console.log(`🚀 Iniciando criação de faturas para contrato ID: ${contractId}`);

      // 1. Validar contrato e buscar dados
      const validation = await contractAnalysisService.validateContractForInvoicing(contractId);
      
      if (!validation.isValid) {
        return {
          success: false,
          invoicesCreated: 0,
          contractId,
          errors: validation.errors
        };
      }

      // 2. Verificar se já existem faturas
      const { data: existingInvoices, error: existingError } = await supabase
        .from('invoices')
        .select('id')
        .eq('contract_id', contractId);

      if (existingError) {
        throw new Error(`Erro ao verificar faturas existentes: ${existingError.message}`);
      }

      if (existingInvoices && existingInvoices.length > 0) {
        return {
          success: false,
          invoicesCreated: 0,
          contractId,
          errors: ['Faturas já existem para este contrato']
        };
      }

      // 3. Criar faturas baseadas nas parcelas
      const invoices = await this.generateInvoicesFromInstallments(contractId, validation.installments);
      
      // 4. Inserir faturas no banco
      const { data: createdInvoices, error: insertError } = await supabase
        .from('invoices')
        .insert(invoices)
        .select();

      if (insertError) {
        throw new Error(`Erro ao inserir faturas: ${insertError.message}`);
      }

      console.log(`✅ ${createdInvoices.length} faturas criadas com sucesso para contrato ${contractId}`);

      return {
        success: true,
        invoicesCreated: createdInvoices.length,
        contractId,
        errors: [],
        invoices: createdInvoices
      };

    } catch (error) {
      console.error('Erro na criação de faturas:', error);
      return {
        success: false,
        invoicesCreated: 0,
        contractId,
        errors: [error instanceof Error ? error.message : 'Erro desconhecido']
      };
    }
  }

  /**
   * Gerar dados das faturas baseado nas parcelas
   */
  private async generateInvoicesFromInstallments(
    contractId: number, 
    installments: InstallmentData[]
  ): Promise<InvoiceData[]> {
    const invoices: InvoiceData[] = [];

    for (const installment of installments) {
      const invoice: InvoiceData = {
        contract_id: contractId,
        installment_number: installment.numero_parcela,
        amount: installment.valor_parcela,
        due_date: installment.vencimento.toISOString().split('T')[0], // YYYY-MM-DD
        status: 'Pendente',
        notes: `Parcela ${installment.numero_parcela} - ${installment.tipo}`
      };

      invoices.push(invoice);
    }

    return invoices;
  }

  /**
   * Gerar 1ª parcela
   */
  async generateFirstInstallment(contractId: number): Promise<InvoiceData | null> {
    try {
      const installments = await contractAnalysisService.calculateInstallments(contractId);
      const firstInstallment = installments.find(inst => inst.numero_parcela === 1);
      
      if (!firstInstallment) {
        throw new Error('Primeira parcela não encontrada');
      }

      const invoice: InvoiceData = {
        contract_id: contractId,
        installment_number: 1,
        amount: firstInstallment.valor_parcela,
        due_date: firstInstallment.vencimento.toISOString().split('T')[0],
        status: 'Pendente',
        notes: 'Primeira parcela'
      };

      return invoice;
    } catch (error) {
      console.error('Erro ao gerar primeira parcela:', error);
      return null;
    }
  }

  /**
   * Gerar parcelas personalizadas
   */
  async generateCustomInstallments(contractId: number): Promise<InvoiceData[]> {
    try {
      const installments = await contractAnalysisService.calculateInstallments(contractId);
      const customInstallments = installments.filter(inst => inst.tipo === 'personalizada');
      
      const invoices: InvoiceData[] = [];
      
      for (const installment of customInstallments) {
        const invoice: InvoiceData = {
          contract_id: contractId,
          installment_number: installment.numero_parcela,
          amount: installment.valor_parcela,
          due_date: installment.vencimento.toISOString().split('T')[0],
          status: 'Pendente',
          notes: `Parcela personalizada ${installment.numero_parcela}`
        };
        
        invoices.push(invoice);
      }

      return invoices;
    } catch (error) {
      console.error('Erro ao gerar parcelas personalizadas:', error);
      return [];
    }
  }

  /**
   * Gerar parcelas restantes
   */
  async generateRemainingInstallments(contractId: number): Promise<InvoiceData[]> {
    try {
      const installments = await contractAnalysisService.calculateInstallments(contractId);
      const remainingInstallments = installments.filter(inst => inst.tipo === 'restante');
      
      const invoices: InvoiceData[] = [];
      
      for (const installment of remainingInstallments) {
        const invoice: InvoiceData = {
          contract_id: contractId,
          installment_number: installment.numero_parcela,
          amount: installment.valor_parcela,
          due_date: installment.vencimento.toISOString().split('T')[0],
          status: 'Pendente',
          notes: `Parcela restante ${installment.numero_parcela}`
        };
        
        invoices.push(invoice);
      }

      return invoices;
    } catch (error) {
      console.error('Erro ao gerar parcelas restantes:', error);
      return [];
    }
  }

  /**
   * Calcular datas de vencimento progressivas
   */
  calculateDueDates(startDate: Date, totalInstallments: number): Date[] {
    const dueDates: Date[] = [];
    
    for (let i = 1; i <= totalInstallments; i++) {
      const dueDate = new Date(startDate);
      dueDate.setMonth(dueDate.getMonth() + i);
      dueDates.push(dueDate);
    }
    
    return dueDates;
  }

  /**
   * Buscar faturas de um contrato
   */
  async getInvoicesByContract(contractId: number): Promise<InvoiceData[]> {
    try {
      const { data, error } = await supabase
        .from('invoices')
        .select('*')
        .eq('contract_id', contractId)
        .order('installment_number');

      if (error) {
        throw new Error(`Erro ao buscar faturas: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error('Erro ao buscar faturas:', error);
      return [];
    }
  }

  /**
   * Atualizar status de uma fatura
   */
  async updateInvoiceStatus(
    invoiceId: string, 
    status: 'Pendente' | 'Pago' | 'Vencido',
    paymentDate?: string,
    paymentMethod?: string
  ): Promise<boolean> {
    try {
      const updateData: any = {
        status,
        updated_at: new Date().toISOString()
      };

      if (status === 'Pago' && paymentDate) {
        updateData.payment_date = paymentDate;
        updateData.payment_method = paymentMethod;
      }

      const { error } = await supabase
        .from('invoices')
        .update(updateData)
        .eq('id', invoiceId);

      if (error) {
        throw new Error(`Erro ao atualizar fatura: ${error.message}`);
      }

      return true;
    } catch (error) {
      console.error('Erro ao atualizar status da fatura:', error);
      return false;
    }
  }

  /**
   * Testar o serviço com dados reais
   */
  async testService(): Promise<void> {
    console.log('🧪 TESTANDO INVOICE GENERATION SERVICE');
    console.log('=' .repeat(50));

    try {
      // Buscar um contrato existente
      const { data: contracts, error: contractsError } = await supabase
        .from('contracts')
        .select('id, credit_amount')
        .limit(1);

      if (contractsError || !contracts || contracts.length === 0) {
        console.log('❌ Nenhum contrato encontrado para teste');
        return;
      }

      const testContract = contracts.find(c => c.credit_amount > 0) || contracts[0];
      console.log(`📋 Testando com contrato ID: ${testContract.id}`);

      // Testar validação
      const validation = await contractAnalysisService.validateContractForInvoicing(testContract.id);
      console.log(`✅ Validação: ${validation.isValid ? 'VÁLIDA' : 'INVÁLIDA'}`);
      
      if (!validation.isValid) {
        console.log('   Erros encontrados:');
        validation.errors.forEach(error => console.log(`     - ${error}`));
        return;
      }

      // Testar cálculo de parcelas
      const installments = await contractAnalysisService.calculateInstallments(testContract.id);
      console.log(`✅ Parcelas calculadas: ${installments.length}`);
      
      if (installments.length > 0) {
        console.log('   Primeiras 3 parcelas:');
        installments.slice(0, 3).forEach(inst => {
          console.log(`     ${inst.numero_parcela}ª: R$ ${inst.valor_parcela.toLocaleString('pt-BR')} (${inst.tipo})`);
        });
      }

      // Testar geração de faturas (sem inserir no banco)
      const invoices = await this.generateInvoicesFromInstallments(testContract.id, installments);
      console.log(`✅ Faturas geradas: ${invoices.length}`);
      
      if (invoices.length > 0) {
        console.log('   Primeiras 3 faturas:');
        invoices.slice(0, 3).forEach(invoice => {
          console.log(`     Parcela ${invoice.installment_number}: R$ ${invoice.amount.toLocaleString('pt-BR')} - ${invoice.due_date}`);
        });
      }

      console.log('\n🎯 TESTE CONCLUÍDO COM SUCESSO!');

    } catch (error) {
      console.error('❌ ERRO NO TESTE:', error);
    }
  }
}

export const invoiceGenerationService = new InvoiceGenerationService();
