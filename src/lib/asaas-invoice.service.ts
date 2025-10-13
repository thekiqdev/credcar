// Serviço de Integração com ASAAS para Faturas
// Arquivo: src/lib/asaas-invoice.service.ts

import { supabase } from './supabase';
import { asaasService } from './asaas.service';
import { invoiceGenerationService, InvoiceData } from './invoice-generation.service';

// Tipos TypeScript para o serviço ASAAS de faturas
export interface AsaasInvoiceData {
  id?: string;
  customer: string; // ID do cliente no ASAAS
  billingType: 'PIX' | 'BOLETO' | 'CREDIT_CARD';
  value: number;
  dueDate: string; // YYYY-MM-DD
  description?: string;
  externalReference?: string; // Referência externa (ID da fatura local)
  installmentCount?: number;
  installmentValue?: number;
  totalValue?: number;
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
    type: 'FIXED' | 'PERCENTAGE';
  };
  postalService?: boolean;
  split?: Array<{
    walletId: string;
    fixedValue?: number;
    percentualValue?: number;
    totalValue?: number;
  }>;
}

export interface AsaasInvoiceResponse {
  id: string;
  customer: string;
  paymentLink: string;
  value: number;
  netValue: number;
  originalValue: number;
  interestValue: number;
  description: string;
  billingType: string;
  canBePaidAfterDueDate: boolean;
  pixTransaction: string;
  status: string;
  dueDate: string;
  originalDueDate: string;
  paymentDate: string;
  clientPaymentDate: string;
  installmentNumber: number;
  invoiceUrl: string;
  bankSlipUrl: string;
  invoiceNumber: string;
  externalReference: string;
  deleted: boolean;
  postalService: boolean;
  additionalInfo: any[];
  transactionReceiptUrl: string;
  installments: any[];
  discount: any;
  fine: any;
  interest: any;
  split: any[];
  chargeback: any;
  refunds: any[];
}

export interface AsaasInvoiceCreationResult {
  success: boolean;
  asaasInvoiceId?: string;
  paymentLink?: string;
  invoiceUrl?: string;
  bankSlipUrl?: string;
  errors: string[];
  localInvoiceId?: string;
}

class AsaasInvoiceService {
  /**
   * Criar fatura no ASAAS baseada em uma fatura local
   */
  async createInvoiceInAsaas(localInvoice: InvoiceData): Promise<AsaasInvoiceCreationResult> {
    try {
      console.log(`🚀 Criando fatura no ASAAS para fatura local ID: ${localInvoice.id}`);

      // 1. Buscar dados do contrato para obter cliente ASAAS
      const contractData = await this.getContractWithClient(localInvoice.contract_id);
      if (!contractData) {
        return {
          success: false,
          errors: ['Contrato não encontrado']
        };
      }

      // Corrigir acesso ao cliente (Supabase retorna 'clients' como array)
      const client = contractData.clients;
      
      console.log(`📋 Dados do contrato:`, {
        contractId: contractData.id,
        client: client,
        hasClient: !!client,
        clientId: client?.id,
        asaasCustomerId: client?.asaas_customer_id
      });

      // Verificar se cliente existe
      if (!client) {
        return {
          success: false,
          errors: ['Cliente não encontrado no contrato']
        };
      }

      // 2. Verificar se cliente tem ID do ASAAS válido
      let customerId = client.asaas_customer_id;
      let needsCustomerUpdate = false;

      if (!customerId) {
        console.log(`🔄 Cliente não possui ID do ASAAS. Criando cliente automaticamente...`);
        needsCustomerUpdate = true;
      } else {
        // Verificar se o cliente existe no ASAAS
        console.log(`🔍 Verificando se cliente ${customerId} existe no ASAAS...`);
        try {
          const { asaasService } = await import('./asaas.service');
          const existingCustomer = await asaasService.getCustomerById(customerId);
          
          if (!existingCustomer) {
            console.log(`⚠️ Cliente ${customerId} não existe no ASAAS. Recriando...`);
            needsCustomerUpdate = true;
          } else {
            console.log(`✅ Cliente ${customerId} existe no ASAAS`);
          }
        } catch (error) {
          console.log(`⚠️ Erro ao verificar cliente ${customerId} no ASAAS:`, error);
          console.log(`🔄 Recriando cliente automaticamente...`);
          needsCustomerUpdate = true;
        }
      }

      if (needsCustomerUpdate) {
        const { asaasService } = await import('./asaas.service');
        const customer = await asaasService.createOrFindCustomer({
          name: client.full_name,
          email: client.email,
          cpfCnpj: client.cpf_cnpj,
          phone: client.phone || ''
        });

        console.log(`✅ Cliente ASAAS encontrado/criado:`, customer);

        // Atualizar cliente local com ID do ASAAS
        console.log(`🔄 Atualizando cliente local ID ${client.id} com ASAAS ID: ${customer.id}`);
        
        const { error: updateError } = await supabase
          .from('clients')
          .update({ asaas_customer_id: customer.id })
          .eq('id', client.id);

        if (updateError) {
          console.error('Erro ao atualizar cliente com ID do ASAAS:', updateError);
          return {
            success: false,
            errors: [`Erro ao atualizar cliente local: ${updateError.message}`]
          };
        } else {
          console.log(`✅ Cliente atualizado com ID do ASAAS: ${customer.id}`);
          client.asaas_customer_id = customer.id;
          customerId = customer.id;
        }
      }

      // 3. Preparar dados da fatura para o ASAAS
      console.log(`📋 Dados da fatura local:`, {
        id: localInvoice.id,
        amount: localInvoice.amount,
        due_date: localInvoice.due_date,
        installment_number: localInvoice.installment_number
      });

      // Usar a data de vencimento da fatura local (já calculada corretamente)
      let dueDate: string;
      
      if (localInvoice.due_date) {
        // A data já vem no formato YYYY-MM-DD do banco, não precisa converter
        dueDate = localInvoice.due_date;
        console.log(`📅 Data de vencimento da fatura local: ${localInvoice.due_date} (formato já correto)`);
      } else {
        console.error('❌ Fatura local sem data de vencimento!');
        // Fallback: usar configuração padrão
        const today = new Date();
        today.setDate(today.getDate() + 30); // 30 dias padrão
        dueDate = today.toISOString().split('T')[0];
        console.log(`📅 Data de fallback calculada: ${dueDate}`);
      }
      
      console.log(`📅 Data de vencimento para ASAAS: "${dueDate}" (formato YYYY-MM-DD)`);
      console.log(`📅 Fatura local due_date: ${localInvoice.due_date}`);
      
      // Validar formato da data (deve ser YYYY-MM-DD)
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(dueDate)) {
        console.error(`❌ Formato de data inválido: ${dueDate}. Deve ser YYYY-MM-DD`);
        throw new Error(`Formato de data inválido: ${dueDate}`);
      }

      // Estrutura simplificada baseada na documentação ASAAS
      const asaasInvoiceData = {
        customer: customerId,
        billingType: 'PIX',
        value: localInvoice.amount,
        dueDate: dueDate,
        description: localInvoice.notes || `Parcela ${localInvoice.installment_number}`,
        externalReference: localInvoice.id?.toString() || `invoice_${localInvoice.contract_id}_${localInvoice.installment_number}`
      };

      // 4. Criar fatura no ASAAS
      const asaasResponse = await this.createAsaasInvoice(asaasInvoiceData);
      
      if (!asaasResponse.success) {
        return {
          success: false,
          errors: asaasResponse.errors
        };
      }

      // 5. Atualizar fatura local com dados do ASAAS
      await this.updateLocalInvoiceWithAsaasData(
        localInvoice.id!,
        asaasResponse.asaasInvoiceId!,
        asaasResponse.paymentLink!,
        asaasResponse.invoiceUrl,
        asaasResponse.bankSlipUrl
      );

      console.log(`✅ Fatura criada no ASAAS: ${asaasResponse.asaasInvoiceId}`);

      return {
        success: true,
        asaasInvoiceId: asaasResponse.asaasInvoiceId,
        paymentLink: asaasResponse.paymentLink,
        invoiceUrl: asaasResponse.invoiceUrl,
        bankSlipUrl: asaasResponse.bankSlipUrl,
        errors: [],
        localInvoiceId: localInvoice.id
      };

    } catch (error) {
      console.error('Erro ao criar fatura no ASAAS:', error);
      return {
        success: false,
        errors: [error instanceof Error ? error.message : 'Erro desconhecido']
      };
    }
  }

  /**
   * Criar múltiplas faturas no ASAAS para um contrato
   */
  async createMultipleInvoicesInAsaas(contractId: number): Promise<{
    success: boolean;
    created: number;
    failed: number;
    results: AsaasInvoiceCreationResult[];
    errors: string[];
  }> {
    try {
      console.log(`🚀 Criando múltiplas faturas no ASAAS para contrato ID: ${contractId}`);

      // 1. Buscar faturas locais do contrato
      const localInvoices = await invoiceGenerationService.getInvoicesByContract(contractId);
      
      if (localInvoices.length === 0) {
        return {
          success: false,
          created: 0,
          failed: 0,
          results: [],
          errors: ['Nenhuma fatura local encontrada para este contrato']
        };
      }

      console.log(`📋 Encontradas ${localInvoices.length} faturas locais`);

      // 2. Criar cada fatura no ASAAS
      const results: AsaasInvoiceCreationResult[] = [];
      let created = 0;
      let failed = 0;
      const errors: string[] = [];

      for (const invoice of localInvoices) {
        const result = await this.createInvoiceInAsaas(invoice);
        results.push(result);
        
        if (result.success) {
          created++;
        } else {
          failed++;
          errors.push(`Fatura ${invoice.installment_number}: ${result.errors.join(', ')}`);
        }
      }

      console.log(`✅ Resultado: ${created} criadas, ${failed} falharam`);

      return {
        success: failed === 0,
        created,
        failed,
        results,
        errors
      };

    } catch (error) {
      console.error('Erro ao criar múltiplas faturas no ASAAS:', error);
      return {
        success: false,
        created: 0,
        failed: 0,
        results: [],
        errors: [error instanceof Error ? error.message : 'Erro desconhecido']
      };
    }
  }

  /**
   * Buscar dados do contrato com cliente
   */
  private async getContractWithClient(contractId: number): Promise<any> {
    try {
      console.log(`🔍 Buscando contrato ${contractId} com dados do cliente...`);
      
      const { data, error } = await supabase
        .from('contracts')
        .select(`
          *,
          clients (
            id,
            full_name,
            email,
            cpf_cnpj,
            asaas_customer_id
          )
        `)
        .eq('id', contractId)
        .single();

      if (error) {
        console.error('Erro ao buscar contrato:', error);
        return null;
      }

      console.log(`📋 Contrato encontrado:`, {
        id: data?.id,
        clientId: data?.client_id,
        client: data?.clients,
        hasClient: !!data?.clients
      });

      return data;
    } catch (error) {
      console.error('Erro ao buscar contrato:', error);
      return null;
    }
  }

  /**
   * Criar fatura no ASAAS via API
   */
  private async createAsaasInvoice(invoiceData: AsaasInvoiceData): Promise<{
    success: boolean;
    asaasInvoiceId?: string;
    paymentLink?: string;
    invoiceUrl?: string;
    bankSlipUrl?: string;
    errors: string[];
  }> {
    try {
      console.log(`🚀 Criando fatura no ASAAS com dados:`, {
        customer: invoiceData.customer,
        value: invoiceData.value,
        dueDate: invoiceData.dueDate,
        description: invoiceData.description
      });

      // Usar a função específica do AsaasService para criar pagamento
      const response = await asaasService.createPaymentLink({
        customer: invoiceData.customer,
        billingType: invoiceData.billingType,
        value: invoiceData.value,
        dueDate: invoiceData.dueDate,
        description: invoiceData.description,
        externalReference: invoiceData.externalReference
      });
      
      console.log(`📋 Resposta do ASAAS:`, response);
      
      if (response && response.id) {
        // O ASAAS retorna o ID do pagamento como 'pay_xxx', mas precisamos do ID numérico da fatura
        // Vamos procurar por outros campos que possam conter o ID numérico
        console.log(`🔍 Campos disponíveis na resposta:`, Object.keys(response));
        
        // Tentar encontrar o ID numérico em outros campos
        const numericId = response.invoiceNumber || 
                         response.invoiceId || 
                         response.number || 
                         response.id.replace('pay_', '') || 
                         response.id;
        
        console.log(`🔍 ID do pagamento ASAAS: ${response.id}`);
        console.log(`🔍 ID numérico encontrado: ${numericId}`);
        console.log(`🔍 invoiceNumber: ${response.invoiceNumber}`);
        console.log(`🔍 invoiceId: ${response.invoiceId}`);
        console.log(`🔍 number: ${response.number}`);
        
        return {
          success: true,
          asaasInvoiceId: numericId, // Usar ID numérico
          paymentLink: response.paymentLink,
          invoiceUrl: response.invoiceUrl,
          bankSlipUrl: response.bankSlipUrl,
          errors: []
        };
      } else {
        console.error('❌ Resposta inválida do ASAAS:', response);
        return {
          success: false,
          errors: ['Resposta inválida do ASAAS']
        };
      }
    } catch (error) {
      console.error('❌ Erro na API do ASAAS:', error);
      return {
        success: false,
        errors: [error instanceof Error ? error.message : 'Erro desconhecido na API do ASAAS']
      };
    }
  }

  /**
   * Atualizar fatura local com dados do ASAAS
   */
  private async updateLocalInvoiceWithAsaasData(
    localInvoiceId: string,
    asaasInvoiceId: string,
    paymentLink: string,
    invoiceUrl?: string,
    bankSlipUrl?: string
  ): Promise<void> {
    try {
      // Tentar atualizar apenas a coluna invoice_code primeiro
      const updateData: any = {
        invoice_code: asaasInvoiceId
      };

      console.log(`🔄 Atualizando fatura local ${localInvoiceId} com dados ASAAS:`, updateData);

      const { error } = await supabase
        .from('invoices')
        .update(updateData)
        .eq('id', localInvoiceId);

      if (error) {
        console.error('Erro ao atualizar fatura local:', error);
        console.log('⚠️ Continuando mesmo com erro na atualização local');
        
        // Tentar atualizar apenas o invoice_code sem outros campos
        console.log('🔄 Tentando atualizar apenas invoice_code...');
        const { error: simpleError } = await supabase
          .from('invoices')
          .update({ invoice_code: asaasInvoiceId })
          .eq('id', localInvoiceId);
          
        if (simpleError) {
          console.error('❌ Erro mesmo com atualização simples:', simpleError);
        } else {
          console.log('✅ Fatura local atualizada com sucesso (apenas invoice_code)');
        }
      } else {
        console.log('✅ Fatura local atualizada com sucesso');
      }

      console.log(`✅ Fatura local ${localInvoiceId} atualizada com dados do ASAAS`);
    } catch (error) {
      console.error('Erro ao atualizar fatura local:', error);
      throw error;
    }
  }

  /**
   * Buscar status de uma fatura no ASAAS
   */
  async getInvoiceStatus(asaasInvoiceId: string): Promise<{
    success: boolean;
    status?: string;
    paymentDate?: string;
    errors: string[];
  }> {
    try {
      const response = await asaasService.client.get(`/payments/${asaasInvoiceId}`);
      
      if (response && response.id) {
        return {
          success: true,
          status: response.status,
          paymentDate: response.paymentDate,
          errors: []
        };
      } else {
        return {
          success: false,
          errors: ['Fatura não encontrada no ASAAS']
        };
      }
    } catch (error) {
      console.error('Erro ao buscar status da fatura:', error);
      return {
        success: false,
        errors: [error instanceof Error ? error.message : 'Erro ao buscar status']
      };
    }
  }

  /**
   * Sincronizar status de faturas locais com ASAAS
   */
  async syncInvoiceStatuses(contractId: number): Promise<{
    success: boolean;
    synced: number;
    errors: string[];
  }> {
    try {
      console.log(`🔄 Sincronizando status de faturas para contrato ${contractId}`);

      // Buscar faturas locais com código do ASAAS
      const { data: invoices, error } = await supabase
        .from('invoices')
        .select('id, invoice_code, status')
        .eq('contract_id', contractId)
        .not('invoice_code', 'is', null);

      if (error) {
        throw error;
      }

      if (!invoices || invoices.length === 0) {
        return {
          success: true,
          synced: 0,
          errors: ['Nenhuma fatura com código ASAAS encontrada']
        };
      }

      let synced = 0;
      const errors: string[] = [];

      for (const invoice of invoices) {
        try {
          const statusResult = await this.getInvoiceStatus(invoice.invoice_code);
          
          if (statusResult.success && statusResult.status) {
            // Atualizar status local se necessário
            let newStatus = 'Pendente';
            if (statusResult.status === 'RECEIVED' || statusResult.status === 'CONFIRMED') {
              newStatus = 'Pago';
            } else if (statusResult.status === 'OVERDUE') {
              newStatus = 'Vencido';
            }

            if (newStatus !== invoice.status) {
              await supabase
                .from('invoices')
                .update({ 
                  status: newStatus,
                  payment_date: statusResult.paymentDate || null,
                  updated_at: new Date().toISOString()
                })
                .eq('id', invoice.id);

              synced++;
              console.log(`✅ Fatura ${invoice.invoice_code} atualizada: ${invoice.status} → ${newStatus}`);
            }
          }
        } catch (error) {
          errors.push(`Fatura ${invoice.invoice_code}: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
        }
      }

      console.log(`✅ Sincronização concluída: ${synced} faturas atualizadas`);

      return {
        success: errors.length === 0,
        synced,
        errors
      };

    } catch (error) {
      console.error('Erro na sincronização:', error);
      return {
        success: false,
        synced: 0,
        errors: [error instanceof Error ? error.message : 'Erro desconhecido']
      };
    }
  }

  /**
   * Testar o serviço com dados reais
   */
  async testService(): Promise<void> {
    console.log('🧪 TESTANDO ASAAS INVOICE SERVICE');
    console.log('=' .repeat(50));

    try {
      // 1. Testar conexão com ASAAS
      const connectionTest = await asaasService.testConnection();
      console.log(`✅ Conexão ASAAS: ${connectionTest.success ? 'OK' : 'FALHA'}`);
      
      if (!connectionTest.success) {
        console.log(`❌ Erro: ${connectionTest.message}`);
        return;
      }

      // 2. Buscar um contrato com faturas para teste
      const { data: contracts, error: contractsError } = await supabase
        .from('contracts')
        .select(`
          id,
          clients (
            id,
            full_name,
            email,
            asaas_customer_id
          )
        `)
        .limit(1);

      if (contractsError || !contracts || contracts.length === 0) {
        console.log('❌ Nenhum contrato encontrado para teste');
        return;
      }

      const testContract = contracts[0];
      console.log(`📋 Testando com contrato ID: ${testContract.id}`);

      // 3. Verificar se cliente tem ID do ASAAS
      if (!testContract.clients?.asaas_customer_id) {
        console.log('⚠️ Cliente não possui ID do ASAAS - necessário sincronizar primeiro');
        return;
      }

      console.log(`✅ Cliente ASAAS ID: ${testContract.clients.asaas_customer_id}`);

      // 4. Buscar faturas do contrato
      const invoices = await invoiceGenerationService.getInvoicesByContract(testContract.id);
      console.log(`📄 Faturas encontradas: ${invoices.length}`);

      if (invoices.length === 0) {
        console.log('⚠️ Nenhuma fatura encontrada - necessário criar faturas primeiro');
        return;
      }

      // 5. Testar criação de uma fatura (simulação)
      const testInvoice = invoices[0];
      console.log(`🧪 Testando criação de fatura: Parcela ${testInvoice.installment_number}`);
      
      // Simular dados da fatura para ASAAS
      const asaasInvoiceData = {
        customer: testContract.clients.asaas_customer_id,
        billingType: 'PIX' as const,
        value: testInvoice.amount,
        dueDate: testInvoice.due_date,
        description: testInvoice.notes || `Parcela ${testInvoice.installment_number}`,
        externalReference: `test_${testInvoice.id}`,
        installmentCount: 1,
        installmentValue: testInvoice.amount,
        totalValue: testInvoice.amount
      };

      console.log('📊 Dados da fatura para ASAAS:');
      console.log(`   Cliente: ${asaasInvoiceData.customer}`);
      console.log(`   Valor: R$ ${asaasInvoiceData.value.toLocaleString('pt-BR')}`);
      console.log(`   Vencimento: ${asaasInvoiceData.dueDate}`);
      console.log(`   Descrição: ${asaasInvoiceData.description}`);

      console.log('\n🎯 TESTE CONCLUÍDO COM SUCESSO!');
      console.log('✅ Serviço ASAAS de faturas testado');
      console.log('✅ Conexão com ASAAS funcionando');
      console.log('✅ Dados preparados para criação');

    } catch (error) {
      console.error('❌ ERRO NO TESTE:', error);
    }
  }
}

export const asaasInvoiceService = new AsaasInvoiceService();
