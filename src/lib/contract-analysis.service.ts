// Serviço de Análise de Contratos
// Arquivo: src/lib/contract-analysis.service.ts

import { supabase } from './supabase';

// Tipos TypeScript para o serviço
export interface PaymentPlan {
  id: number;
  nome: string;
  descricao: string;
  ativo: boolean;
  faixas_de_credito: CreditRange[];
}

export interface CreditRange {
  id: number;
  plano_id: number;
  valor_credito: number;
  valor_primeira_parcela: number;
  valor_parcelas_restantes: number;
  numero_total_parcelas: number;
  valor_restante: number;
  customInstallments?: CustomInstallment[];
}

export interface CustomInstallment {
  id: number;
  faixa_credito_id: number;
  numero_parcela: number;
  valor_parcela: number;
  created_at: string;
  updated_at: string;
}

export interface InstallmentData {
  numero_parcela: number;
  valor_parcela: number;
  vencimento: Date;
  tipo: 'primeira' | 'personalizada' | 'restante';
}

export interface InvoiceGenerationData {
  contractId: number;
  creditRange: CreditRange;
  installments: InstallmentData[];
  totalValue: number;
  isValid: boolean;
  errors: string[];
}

class ContractAnalysisService {
  /**
   * Busca o plano de pagamento de um contrato
   */
  async getContractPaymentPlan(contractId: number): Promise<PaymentPlan | null> {
    try {
      // Buscar contrato com commission_table
      const { data: contract, error: contractError } = await supabase
        .from('contracts')
        .select(`
          id,
          commission_table_id,
          commission_tables!inner (
            id,
            name,
            commission_percentage,
            payment_details,
            payment_installments
          )
        `)
        .eq('id', contractId)
        .single();

      if (contractError) {
        console.error('Error fetching contract:', contractError);
        return null;
      }

      // Buscar plano baseado no nome da commission_table
      const { data: plano, error: planoError } = await supabase
        .from('planos')
        .select(`
          *,
          faixas_de_credito (
            *,
            condicoes_parcelas (
              *
            )
          )
        `)
        .eq('nome', contract.commission_tables.name)
        .single();

      if (planoError) {
        console.error('Error fetching plano:', planoError);
        return null;
      }

      return plano;
    } catch (error) {
      console.error('Error in getContractPaymentPlan:', error);
      return null;
    }
  }

  /**
   * Calcula todas as parcelas de um contrato
   */
  async calculateInstallments(contractId: number): Promise<InstallmentData[]> {
    try {
      const paymentPlan = await this.getContractPaymentPlan(contractId);
      if (!paymentPlan) {
        throw new Error('Plano de pagamento não encontrado');
      }

      // Buscar faixa de crédito do contrato
      const { data: contract, error: contractError } = await supabase
        .from('contracts')
        .select('credit_amount')
        .eq('id', contractId)
        .single();

      if (contractError) {
        throw new Error('Contrato não encontrado');
      }

      // Encontrar faixa de crédito correspondente
      const creditRange = paymentPlan.faixas_de_credito.find(
        faixa => faixa.valor_credito === contract.credit_amount
      );

      if (!creditRange) {
        throw new Error('Faixa de crédito não encontrada');
      }

      return this.calculateInstallmentsFromCreditRange(creditRange);
    } catch (error) {
      console.error('Error in calculateInstallments:', error);
      throw error;
    }
  }

  /**
   * Calcula parcelas baseado em uma faixa de crédito
   */
  calculateInstallmentsFromCreditRange(creditRange: CreditRange): InstallmentData[] {
    const installments: InstallmentData[] = [];
    const customInstallments = creditRange.customInstallments || [];

    // 1ª Parcela
    installments.push({
      numero_parcela: 1,
      valor_parcela: creditRange.valor_primeira_parcela,
      vencimento: this.calculateDueDate(1),
      tipo: 'primeira'
    });

    // Parcelas personalizadas
    customInstallments.forEach(custom => {
      installments.push({
        numero_parcela: custom.numero_parcela,
        valor_parcela: custom.valor_parcela,
        vencimento: this.calculateDueDate(custom.numero_parcela),
        tipo: 'personalizada'
      });
    });

    // Parcelas restantes
    const usedNumbers = new Set([
      1,
      ...customInstallments.map(c => c.numero_parcela)
    ]);

    for (let i = 2; i <= creditRange.numero_total_parcelas; i++) {
      if (!usedNumbers.has(i)) {
        installments.push({
          numero_parcela: i,
          valor_parcela: creditRange.valor_parcelas_restantes,
          vencimento: this.calculateDueDate(i),
          tipo: 'restante'
        });
      }
    }

    // Ordenar por número da parcela
    return installments.sort((a, b) => a.numero_parcela - b.numero_parcela);
  }

  /**
   * Calcula data de vencimento baseada no número da parcela
   */
  private calculateDueDate(installmentNumber: number): Date {
    const baseDate = new Date();
    baseDate.setMonth(baseDate.getMonth() + installmentNumber);
    return baseDate;
  }

  /**
   * Valida se um contrato pode gerar faturas
   */
  async validateContractForInvoicing(contractId: number): Promise<InvoiceGenerationData> {
    try {
      const installments = await this.calculateInstallments(contractId);
      const paymentPlan = await this.getContractPaymentPlan(contractId);
      
      if (!paymentPlan) {
        return {
          contractId,
          creditRange: null as any,
          installments: [],
          totalValue: 0,
          isValid: false,
          errors: ['Plano de pagamento não encontrado']
        };
      }

      // Buscar faixa de crédito
      const { data: contract } = await supabase
        .from('contracts')
        .select('credit_amount')
        .eq('id', contractId)
        .single();

      const creditRange = paymentPlan.faixas_de_credito.find(
        faixa => faixa.valor_credito === contract.credit_amount
      );

      if (!creditRange) {
        return {
          contractId,
          creditRange: null as any,
          installments: [],
          totalValue: 0,
          isValid: false,
          errors: ['Faixa de crédito não encontrada']
        };
      }

      // Calcular total
      const totalValue = installments.reduce((sum, inst) => sum + inst.valor_parcela, 0);
      
      // Validar se já existem faturas
      const { data: existingInvoices } = await supabase
        .from('invoices')
        .select('id')
        .eq('contract_id', contractId);

      const errors: string[] = [];
      
      if (existingInvoices && existingInvoices.length > 0) {
        errors.push('Faturas já existem para este contrato');
      }

      // Não validar juros - cliente pode definir qualquer % de juros
      // O sistema apenas cria as faturas conforme configurado no plano

      return {
        contractId,
        creditRange,
        installments,
        totalValue,
        isValid: errors.length === 0,
        errors
      };
    } catch (error) {
      console.error('Error in validateContractForInvoicing:', error);
      return {
        contractId,
        creditRange: null as any,
        installments: [],
        totalValue: 0,
        isValid: false,
        errors: [error instanceof Error ? error.message : 'Erro desconhecido']
      };
    }
  }

  /**
   * Testa o serviço com dados reais
   */
  async testService(): Promise<void> {
    console.log('🧪 TESTANDO CONTRACT ANALYSIS SERVICE');
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

      const testContract = contracts[0];
      console.log(`📋 Testando com contrato ID: ${testContract.id}, Valor: R$ ${testContract.credit_amount.toLocaleString('pt-BR')}`);

      // Testar busca do plano
      const paymentPlan = await this.getContractPaymentPlan(testContract.id);
      if (paymentPlan) {
        console.log(`✅ Plano encontrado: ${paymentPlan.nome}`);
        console.log(`   Faixas de crédito: ${paymentPlan.faixas_de_credito.length}`);
      } else {
        console.log('❌ Plano não encontrado');
      }

      // Testar cálculo de parcelas
      const installments = await this.calculateInstallments(testContract.id);
      console.log(`✅ Parcelas calculadas: ${installments.length}`);
      
      if (installments.length > 0) {
        console.log(`   Primeira parcela: R$ ${installments[0].valor_parcela.toLocaleString('pt-BR')}`);
        console.log(`   Última parcela: R$ ${installments[installments.length - 1].valor_parcela.toLocaleString('pt-BR')}`);
      }

      // Testar validação
      const validation = await this.validateContractForInvoicing(testContract.id);
      console.log(`✅ Validação: ${validation.isValid ? 'VÁLIDA' : 'INVÁLIDA'}`);
      
      if (!validation.isValid) {
        console.log('   Erros encontrados:');
        validation.errors.forEach(error => console.log(`     - ${error}`));
      }

      console.log('\n🎯 TESTE CONCLUÍDO COM SUCESSO!');

    } catch (error) {
      console.error('❌ ERRO NO TESTE:', error);
    }
  }
}

export const contractAnalysisService = new ContractAnalysisService();
