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
  vencimento: Date | null; // Apenas primeira parcela tem data específica
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
      // Buscar contrato com id_faixa_de_credito e commission_table_id
      const { data: contract, error: contractError } = await supabase
        .from('contracts')
        .select(`
          id,
          commission_table_id,
          id_faixa_de_credito
        `)
        .eq('id', contractId)
        .single();

      if (contractError) {
        console.error('Error fetching contract:', contractError);
        return null;
      }

      // Usar id_faixa_de_credito se disponível, senão usar commission_table_id como fallback
      const planId = contract.commission_table_id;
      
      if (!planId) {
        console.error('Nenhum commission_table_id encontrado para contrato:', contractId);
        return null;
      }

      // Buscar plano diretamente usando commission_table_id como plan_id
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
        .eq('id', planId)
        .eq('ativo', true)
        .single();

      if (planoError) {
        console.error('Error fetching plano:', planoError);
        return null;
      }

      if (!plano) {
        console.error('Plano não encontrado com ID:', planId);
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
      console.log(`🚀 calculateInstallments iniciado para contrato ${contractId}`);
      
      // Buscar contrato com id_faixa_de_credito
      const { data: contract, error: contractError } = await supabase
        .from('contracts')
        .select('id_faixa_de_credito')
        .eq('id', contractId)
        .single();

      if (contractError) {
        throw new Error('Contrato não encontrado');
      }

      console.log(`📋 Contrato ${contractId} - ID Faixa de Crédito: ${contract.id_faixa_de_credito}`);

      // Se temos id_faixa_de_credito, buscar diretamente
      if (contract.id_faixa_de_credito) {
        console.log(`🔍 Buscando faixa diretamente por ID: ${contract.id_faixa_de_credito}`);
        
        const { data: creditRange, error: creditRangeError } = await supabase
          .from('faixas_de_credito')
          .select('*')
          .eq('id', contract.id_faixa_de_credito)
          .single();

        if (creditRangeError) {
          console.error('❌ Erro ao buscar faixa:', creditRangeError);
          throw new Error('Faixa de crédito não encontrada');
        }

        console.log(`✅ Faixa encontrada: ID ${creditRange.id}, Valor R$ ${creditRange.valor_credito.toLocaleString('pt-BR')}`);
        return this.calculateInstallmentsFromCreditRange(creditRange);
      }

      // Fallback: usar método antigo se id_faixa_de_credito não estiver disponível
      const paymentPlan = await this.getContractPaymentPlan(contractId);
      if (!paymentPlan) {
        throw new Error('Plano de pagamento não encontrado');
      }

      // Buscar faixa de crédito do contrato
      const { data: contractData, error: contractDataError } = await supabase
        .from('contracts')
        .select('credit_amount')
        .eq('id', contractId)
        .single();

      if (contractDataError) {
        throw new Error('Contrato não encontrado');
      }

      // Encontrar faixa de crédito correspondente
      const creditRange = paymentPlan.faixas_de_credito.find(
        faixa => faixa.valor_credito == contractData.credit_amount
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
  async calculateInstallmentsFromCreditRange(creditRange: CreditRange): Promise<InstallmentData[]> {
    const installments: InstallmentData[] = [];

    // Buscar parcelas personalizadas da tabela condicoes_parcelas
    const { data: customInstallments, error: customError } = await supabase
      .from('condicoes_parcelas')
      .select('numero_parcela, valor_parcela')
      .eq('faixa_credito_id', creditRange.id)
      .order('numero_parcela');

    if (customError) {
      console.error('Erro ao buscar parcelas personalizadas:', customError);
    }

    console.log(`📋 Encontradas ${customInstallments?.length || 0} parcelas personalizadas para faixa ${creditRange.id}`);

    // Buscar configuração de dias para vencimento
    const { systemConfigService } = await import('./system-config.service');
    const paymentConfig = await systemConfigService.getPaymentConfig();
    const defaultDueDays = paymentConfig.defaultDueDays || 30;

    // 1ª Parcela
    installments.push({
      numero_parcela: 1,
      valor_parcela: creditRange.valor_primeira_parcela,
      vencimento: this.calculateDueDateForInstallment(1, defaultDueDays),
      tipo: 'primeira'
    });

    // Parcelas personalizadas (da tabela condicoes_parcelas)
    if (customInstallments && customInstallments.length > 0) {
      for (const custom of customInstallments) {
        // Pular a primeira parcela se já foi adicionada
        if (custom.numero_parcela === 1) {
          continue;
        }
        
        installments.push({
          numero_parcela: custom.numero_parcela,
          valor_parcela: custom.valor_parcela,
          vencimento: this.calculateDueDateForInstallment(custom.numero_parcela, defaultDueDays),
          tipo: 'personalizada'
        });
      }
    }

    // Parcelas restantes (se não foram todas personalizadas)
    const totalInstallments = creditRange.numero_total_parcelas || 80;
    const existingNumbers = installments.map(inst => inst.numero_parcela);
    
    for (let i = 1; i <= totalInstallments; i++) {
      if (!existingNumbers.includes(i)) {
        installments.push({
          numero_parcela: i,
          valor_parcela: creditRange.valor_parcelas_restantes,
          vencimento: this.calculateDueDateForInstallment(i, defaultDueDays),
          tipo: 'restante'
        });
      }
    }

    // Ordenar por número da parcela
    installments.sort((a, b) => a.numero_parcela - b.numero_parcela);

    console.log(`✅ Total de parcelas calculadas: ${installments.length}`);
    console.log(`   - Primeira: ${installments.filter(i => i.tipo === 'primeira').length}`);
    console.log(`   - Personalizadas: ${installments.filter(i => i.tipo === 'personalizada').length}`);
    console.log(`   - Restantes: ${installments.filter(i => i.tipo === 'restante').length}`);

    return installments;
  }

  /**
   * Calcula data de vencimento para uma parcela específica
   * 1ª parcela: hoje + defaultDueDays
   * Demais parcelas: 1ª parcela + (número_parcela - 1) meses
   */
  private calculateDueDateForInstallment(installmentNumber: number, defaultDueDays: number): Date {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();
    const day = today.getDate();
    
    if (installmentNumber === 1) {
      // 1ª parcela: hoje + defaultDueDays
      const dueDate = new Date(year, month, day + defaultDueDays);
      console.log(`📅 Parcela ${installmentNumber}: ${dueDate.toISOString().split('T')[0]} (${defaultDueDays} dias a partir de hoje)`);
      return dueDate;
    } else {
      // Demais parcelas: 1ª parcela + (número_parcela - 1) meses
      const firstDueDate = new Date(year, month, day + defaultDueDays);
      const dueDate = new Date(firstDueDate);
      dueDate.setMonth(dueDate.getMonth() + (installmentNumber - 1));
      
      console.log(`📅 Parcela ${installmentNumber}: ${dueDate.toISOString().split('T')[0]} (${installmentNumber - 1} meses após a 1ª)`);
      return dueDate;
    }
  }

  /**
   * Calcula data de vencimento apenas para a primeira parcela (método antigo - mantido para compatibilidade)
   * Demais parcelas seguem o padrão (sem data específica)
   */
  private async calculateDueDate(installmentNumber: number): Promise<Date | null> {
    try {
      // Apenas a primeira parcela tem data de vencimento calculada
      if (installmentNumber !== 1) {
        console.log(`📅 Parcela ${installmentNumber}: Sem data de vencimento específica (seguirá padrão)`);
        return null; // Demais parcelas não têm data específica
      }

      // Buscar configuração de dias para vencimento
      const { systemConfigService } = await import('./system-config.service');
      const paymentConfig = await systemConfigService.getPaymentConfig();
      const defaultDueDays = paymentConfig.defaultDueDays || 30;
      
      console.log(`📅 Calculando vencimento para PRIMEIRA parcela com ${defaultDueDays} dias`);
      
      // Calcular data de vencimento: hoje + defaultDueDays
      // Usar data local para evitar problemas de timezone
      const today = new Date();
      const year = today.getFullYear();
      const month = today.getMonth();
      const day = today.getDate();
      
      // Criar nova data local sem timezone
      const baseDate = new Date(year, month, day + defaultDueDays);
      
      console.log(`📅 Data atual: ${today.toISOString().split('T')[0]}`);
      console.log(`📅 Data de vencimento calculada: ${baseDate.toISOString().split('T')[0]} (${defaultDueDays} dias a partir de hoje)`);
      
      return baseDate;
    } catch (error) {
      console.error('Erro ao calcular data de vencimento:', error);
      // Fallback: usar 30 dias apenas para primeira parcela
      if (installmentNumber === 1) {
        const today = new Date();
        const year = today.getFullYear();
        const month = today.getMonth();
        const day = today.getDate();
        
        const baseDate = new Date(year, month, day + 30);
        console.log(`📅 Fallback: Data de vencimento calculada: ${baseDate.toISOString().split('T')[0]} (30 dias)`);
        return baseDate;
      }
      return null;
    }
  }

  /**
   * Valida se um contrato pode gerar faturas
   */
  async validateContractForInvoicing(contractId: number): Promise<InvoiceGenerationData> {
    try {
      console.log(`🔍 validateContractForInvoicing iniciado para contrato ${contractId}`);
      
      const installments = await this.calculateInstallments(contractId);
      
      // Buscar contrato com id_faixa_de_credito
      const { data: contract, error: contractError } = await supabase
        .from('contracts')
        .select('id_faixa_de_credito, credit_amount')
        .eq('id', contractId)
        .single();

      if (contractError) {
        return {
          contractId,
          creditRange: null as any,
          installments: [],
          totalValue: 0,
          isValid: false,
          errors: ['Contrato não encontrado']
        };
      }

      console.log(`📋 Contrato ${contractId} - ID Faixa de Crédito: ${contract.id_faixa_de_credito}`);

      let creditRange = null;

      // Se temos id_faixa_de_credito, buscar diretamente
      if (contract.id_faixa_de_credito) {
        console.log(`🔍 Buscando faixa diretamente por ID: ${contract.id_faixa_de_credito}`);
        
        const { data: faixa, error: faixaError } = await supabase
          .from('faixas_de_credito')
          .select('*')
          .eq('id', contract.id_faixa_de_credito)
          .single();

        if (faixaError) {
          console.error('❌ Erro ao buscar faixa:', faixaError);
          return {
            contractId,
            creditRange: null as any,
            installments: [],
            totalValue: 0,
            isValid: false,
            errors: ['Faixa de crédito não encontrada']
          };
        }

        creditRange = faixa;
        console.log(`✅ Faixa encontrada: ID ${creditRange.id}, Valor R$ ${creditRange.valor_credito.toLocaleString('pt-BR')}`);
      } else {
        // Fallback: usar método antigo
        console.log('⚠️ ID Faixa de Crédito é NULL, usando método antigo');
        
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

        creditRange = paymentPlan.faixas_de_credito.find(
          faixa => faixa.valor_credito == contract.credit_amount
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
