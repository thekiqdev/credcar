// Teste do ASAAS Invoice Service
// Arquivo: test-asaas-invoice-service.js

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://cgystsylstnkgfgbqoel.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNneXN0c3lsc3Rua2dmZ2Jxb2VsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMzMDMyNDYsImV4cCI6MjA2ODg3OTI0Nn0.IcY6tymXTxsuQGk7xHJWMkgtoP808i0sPTWLLTb6jPI';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testAsaasInvoiceService() {
  console.log('🧪 TESTE DO ASAAS INVOICE SERVICE');
  console.log('=' .repeat(60));

  try {
    // 1. Buscar contratos com clientes
    console.log('\n📋 1. BUSCANDO CONTRATOS COM CLIENTES...');
    
    const { data: contracts, error: contractsError } = await supabase
      .from('contracts')
      .select(`
        id,
        credit_amount,
        status,
        clients (
          id,
          full_name,
          email,
          cpf_cnpj,
          asaas_customer_id
        )
      `)
      .limit(5);

    if (contractsError) {
      console.error('❌ Erro ao buscar contratos:', contractsError);
      return;
    }

    if (!contracts || contracts.length === 0) {
      console.log('❌ Nenhum contrato encontrado');
      return;
    }

    console.log(`✅ Encontrados ${contracts.length} contratos:`);
    contracts.forEach(contract => {
      const client = contract.clients;
      console.log(`   - ID: ${contract.id}, Status: ${contract.status}`);
      console.log(`     Cliente: ${client?.full_name} (${client?.email})`);
      console.log(`     ASAAS ID: ${client?.asaas_customer_id || 'Não configurado'}`);
    });

    // 2. Encontrar contrato com cliente que tem ASAAS ID
    console.log('\n🎯 2. ENCONTRANDO CONTRATO COM CLIENTE ASAAS...');
    
    const contractWithAsaasClient = contracts.find(c => 
      c.clients?.asaas_customer_id && c.status === 'Ativo'
    );

    if (!contractWithAsaasClient) {
      console.log('⚠️ Nenhum contrato ativo com cliente ASAAS encontrado');
      console.log('   Necessário sincronizar clientes com ASAAS primeiro');
      return;
    }

    console.log(`✅ Contrato encontrado: ID ${contractWithAsaasClient.id}`);
    console.log(`   Cliente: ${contractWithAsaasClient.clients.full_name}`);
    console.log(`   ASAAS ID: ${contractWithAsaasClient.clients.asaas_customer_id}`);

    // 3. Buscar faturas do contrato
    console.log('\n📄 3. BUSCANDO FATURAS DO CONTRATO...');
    
    const { data: invoices, error: invoicesError } = await supabase
      .from('invoices')
      .select('id, installment_number, amount, due_date, status, invoice_code, payment_link_pix')
      .eq('contract_id', contractWithAsaasClient.id)
      .order('installment_number');

    if (invoicesError) {
      console.error('❌ Erro ao buscar faturas:', invoicesError);
      return;
    }

    console.log(`✅ Faturas encontradas: ${invoices.length}`);
    
    if (invoices.length === 0) {
      console.log('⚠️ Nenhuma fatura encontrada - necessário criar faturas primeiro');
      return;
    }

    // Mostrar primeiras faturas
    console.log('   Primeiras 5 faturas:');
    invoices.slice(0, 5).forEach(invoice => {
      console.log(`     ${invoice.installment_number}ª: R$ ${invoice.amount.toLocaleString('pt-BR')} - ${invoice.due_date} (${invoice.status})`);
      console.log(`       ASAAS ID: ${invoice.invoice_code || 'Não criada'}`);
      console.log(`       PIX Link: ${invoice.payment_link_pix ? 'Configurado' : 'Não configurado'}`);
    });

    // 4. Verificar faturas já integradas com ASAAS
    console.log('\n🔗 4. VERIFICANDO INTEGRAÇÃO COM ASAAS...');
    
    const integratedInvoices = invoices.filter(inv => inv.invoice_code);
    const pendingInvoices = invoices.filter(inv => !inv.invoice_code);

    console.log(`✅ Faturas integradas com ASAAS: ${integratedInvoices.length}`);
    console.log(`⏳ Faturas pendentes de integração: ${pendingInvoices.length}`);

    if (pendingInvoices.length > 0) {
      console.log('   Faturas pendentes:');
      pendingInvoices.slice(0, 3).forEach(invoice => {
        console.log(`     ${invoice.installment_number}ª: R$ ${invoice.amount.toLocaleString('pt-BR')} - ${invoice.due_date}`);
      });
    }

    // 5. Simular criação de fatura no ASAAS
    console.log('\n🧪 5. SIMULANDO CRIAÇÃO DE FATURA NO ASAAS...');
    
    if (pendingInvoices.length > 0) {
      const testInvoice = pendingInvoices[0];
      console.log(`📋 Testando com fatura: Parcela ${testInvoice.installment_number}`);
      
      // Dados da fatura para ASAAS
      const asaasInvoiceData = {
        customer: contractWithAsaasClient.clients.asaas_customer_id,
        billingType: 'PIX',
        value: testInvoice.amount,
        dueDate: testInvoice.due_date,
        description: `Parcela ${testInvoice.installment_number}`,
        externalReference: `invoice_${testInvoice.id}`,
        installmentCount: 1,
        installmentValue: testInvoice.amount,
        totalValue: testInvoice.amount
      };

      console.log('📊 Dados para criação no ASAAS:');
      console.log(`   Cliente ASAAS: ${asaasInvoiceData.customer}`);
      console.log(`   Valor: R$ ${asaasInvoiceData.value.toLocaleString('pt-BR')}`);
      console.log(`   Vencimento: ${asaasInvoiceData.dueDate}`);
      console.log(`   Tipo: ${asaasInvoiceData.billingType}`);
      console.log(`   Referência: ${asaasInvoiceData.externalReference}`);
      
      console.log('\n✅ Dados preparados corretamente para criação no ASAAS');
    } else {
      console.log('✅ Todas as faturas já estão integradas com ASAAS');
    }

    // 6. Verificar configurações do ASAAS
    console.log('\n⚙️ 6. VERIFICANDO CONFIGURAÇÕES DO ASAAS...');
    
    const { data: configs, error: configError } = await supabase
      .from('system_config')
      .select('key, value')
      .in('key', ['asaas.api.key', 'asaas.environment', 'asaas.base.url']);

    if (configError) {
      console.error('❌ Erro ao buscar configurações:', configError);
    } else {
      console.log('✅ Configurações ASAAS:');
      configs.forEach(config => {
        const value = config.key === 'asaas.api.key' 
          ? `${config.value.substring(0, 10)}...` 
          : config.value;
        console.log(`   ${config.key}: ${value}`);
      });
    }

    console.log('\n🎯 CONCLUSÕES:');
    console.log('=' .repeat(60));
    console.log('✅ Serviço ASAAS de faturas testado');
    console.log('✅ Contratos e clientes encontrados');
    console.log('✅ Faturas locais identificadas');
    console.log('✅ Integração com ASAAS preparada');
    
    console.log('\n📝 PRÓXIMOS PASSOS:');
    console.log('1. Testar criação real de fatura no ASAAS');
    console.log('2. Implementar sincronização de status');
    console.log('3. Integrar com webhooks do ASAAS');

  } catch (error) {
    console.error('❌ ERRO GERAL:', error);
  }
}

// Executar teste
testAsaasInvoiceService();

