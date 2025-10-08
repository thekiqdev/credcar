// Serviço de Geração de Faturas
// Arquivo: src/lib/invoice-generation.service.ts

import { supabase } from './supabase';
import { contractAnalysisService, InstallmentData, InvoiceGenerationData } from './contract-analysis.service';
import { asaasInvoiceService } from './asaas-invoice.service';

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
  status: 'pending' | 'paid' | 'overdue';
  created_at?: string;
  updated_at?: string;
}

export interface InvoiceGenerationResult {
  success: boolean;
  invoicesCreated: number;
  contractId: number;
  errors: string[];
  invoices?: InvoiceData[];
  asaasIntegration?: {
    success: boolean;
    created: number;
    failed: number;
    errors: string[];
  };
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

      // 3. Criar apenas faturas essenciais (1ª parcela + personalizadas)
      const essentialInstallments = validation.installments.filter(inst => 
        inst.tipo === 'primeira' || inst.tipo === 'personalizada'
      );
      
      console.log(`📋 Criando ${essentialInstallments.length} faturas essenciais de ${validation.installments.length} parcelas totais`);
      
      const invoices = await this.generateInvoicesFromInstallments(contractId, essentialInstallments);
      
      // 4. Inserir faturas no banco
      const { data: createdInvoices, error: insertError } = await supabase
        .from('invoices')
        .insert(invoices)
        .select();

      if (insertError) {
        throw new Error(`Erro ao inserir faturas: ${insertError.message}`);
      }

      console.log(`✅ ${createdInvoices.length} faturas criadas com sucesso para contrato ${contractId}`);

      // 5. Criar faturas no ASAAS automaticamente
      let asaasResults = {
        success: true,
        created: 0,
        failed: 0,
        errors: []
      };

      try {
        console.log(`🚀 Criando faturas no ASAAS para contrato ${contractId}...`);
        
        // Criar faturas no ASAAS
        const asaasResult = await asaasInvoiceService.createMultipleInvoicesInAsaas(contractId);
        asaasResults = asaasResult;
        
        if (asaasResult.success) {
          console.log(`✅ ${asaasResult.created} faturas criadas no ASAAS com sucesso`);
        } else {
          console.log(`⚠️ ${asaasResult.failed} faturas falharam no ASAAS: ${asaasResult.errors.join(', ')}`);
        }
      } catch (asaasError) {
        console.error('Erro ao criar faturas no ASAAS:', asaasError);
        asaasResults = {
          success: false,
          created: 0,
          failed: createdInvoices.length,
          errors: [asaasError instanceof Error ? asaasError.message : 'Erro desconhecido no ASAAS']
        };
      }

      return {
        success: true,
        invoicesCreated: createdInvoices.length,
        contractId,
        errors: [],
        invoices: createdInvoices,
        asaasIntegration: asaasResults
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
      // Calcular data de vencimento baseada na configuração
      let dueDate: string;
      
      if (installment.vencimento) {
        // Primeira parcela: usar data calculada (evitar problemas de timezone)
        const date = installment.vencimento;
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        dueDate = `${year}-${month}-${day}`;
        console.log(`📅 Parcela ${installment.numero_parcela}: Data específica ${dueDate}`);
      } else {
        // Demais parcelas: usar padrão do sistema (hoje + defaultDueDays)
        try {
          const { systemConfigService } = await import('./system-config.service');
          const paymentConfig = await systemConfigService.getPaymentConfig();
          const defaultDueDays = paymentConfig.defaultDueDays || 30;
          
          // Usar data local para evitar problemas de timezone
          const today = new Date();
          const year = today.getFullYear();
          const month = today.getMonth();
          const day = today.getDate();
          
          const baseDate = new Date(year, month, day + defaultDueDays);
          const yearStr = baseDate.getFullYear();
          const monthStr = String(baseDate.getMonth() + 1).padStart(2, '0');
          const dayStr = String(baseDate.getDate()).padStart(2, '0');
          dueDate = `${yearStr}-${monthStr}-${dayStr}`;
          
          console.log(`📅 Parcela ${installment.numero_parcela}: Data padrão ${dueDate} (${defaultDueDays} dias)`);
        } catch (error) {
          console.error('Erro ao calcular data padrão:', error);
          // Fallback: usar 30 dias
          const today = new Date();
          const year = today.getFullYear();
          const month = today.getMonth();
          const day = today.getDate();
          
          const baseDate = new Date(year, month, day + 30);
          const yearStr = baseDate.getFullYear();
          const monthStr = String(baseDate.getMonth() + 1).padStart(2, '0');
          const dayStr = String(baseDate.getDate()).padStart(2, '0');
          dueDate = `${yearStr}-${monthStr}-${dayStr}`;
        }
      }

      const invoice: InvoiceData = {
        contract_id: contractId,
        installment_number: installment.numero_parcela,
        amount: installment.valor_parcela,
        due_date: dueDate, // YYYY-MM-DD
        status: 'pending',
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
        status: 'pending',
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
          status: 'pending',
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
          status: 'pending',
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
    status: 'pending' | 'paid' | 'overdue',
    paymentDate?: string,
    paymentMethod?: string
  ): Promise<boolean> {
    try {
      const updateData: any = {
        status,
        updated_at: new Date().toISOString()
      };

      if (status === 'paid' && paymentDate) {
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
