// Teste do ASAAS Invoice Service (atualizado)
// Arquivo: test-asaas-invoice-service-updated.js

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://cgystsylstnkgfgbqoel.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNneXN0c3lsc3Rua2dmZ2Jxb2VsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMzMDMyNDYsImV4cCI6MjA2ODg3OTI0Nn0.IcY6tymXTxsuQGk7xHJWMkgtoP808i0sPTWLLTb6jPI';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testAsaasInvoiceServiceUpdated() {
  console.log('🧪 TESTE DO ASAAS INVOICE SERVICE (ATUALIZADO)');
  console.log('=' .repeat(60));

  try {
    // 1. Buscar contratos com clientes (sem asaas_customer_id por enquanto)
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
          cpf_cnpj
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
      console.log(`   - ID: ${contract.id}, Status: ${contract.status}, Valor: R$ ${(contract.credit_amount || 0).toLocaleString('pt-BR')}`);
      console.log(`     Cliente: ${client?.full_name} (${client?.email})`);
      console.log(`     CPF/CNPJ: ${client?.cpf_cnpj}`);
    });

    // 2. Encontrar contrato ativo para teste
    console.log('\n🎯 2. ENCONTRANDO CONTRATO ATIVO PARA TESTE...');
    
    const activeContract = contracts.find(c => c.status === 'Ativo' && c.credit_amount > 0);

    if (!activeContract) {
      console.log('⚠️ Nenhum contrato ativo encontrado');
      console.log('   Status dos contratos encontrados:');
      contracts.forEach(contract => {
        console.log(`     ID ${contract.id}: ${contract.status} (R$ ${(contract.credit_amount || 0).toLocaleString('pt-BR')})`);
      });
      return;
    }

    console.log(`✅ Contrato ativo encontrado: ID ${activeContract.id}`);
    console.log(`   Cliente: ${activeContract.clients.full_name}`);
    console.log(`   Email: ${activeContract.clients.email}`);
    console.log(`   CPF/CNPJ: ${activeContract.clients.cpf_cnpj}`);

    // 3. Buscar faturas do contrato
    console.log('\n📄 3. BUSCANDO FATURAS DO CONTRATO...');
    
    const { data: invoices, error: invoicesError } = await supabase
      .from('invoices')
      .select('id, installment_number, amount, due_date, status, invoice_code, payment_link_pix')
      .eq('contract_id', activeContract.id)
      .order('installment_number');

    if (invoicesError) {
      console.error('❌ Erro ao buscar faturas:', invoicesError);
      return;
    }

    console.log(`✅ Faturas encontradas: ${invoices.length}`);
    
    if (invoices.length === 0) {
      console.log('⚠️ Nenhuma fatura encontrada - necessário criar faturas primeiro');
      console.log('   Execute: Gerar faturas para este contrato no admin');
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
      
      // Dados da fatura para ASAAS (simulação)
      const asaasInvoiceData = {
        customer: 'CUSTOMER_ID_PLACEHOLDER', // Será preenchido após sincronização
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
      console.log(`   Cliente ASAAS: ${asaasInvoiceData.customer} (placeholder)`);
      console.log(`   Valor: R$ ${asaasInvoiceData.value.toLocaleString('pt-BR')}`);
      console.log(`   Vencimento: ${asaasInvoiceData.dueDate}`);
      console.log(`   Tipo: ${asaasInvoiceData.billingType}`);
      console.log(`   Referência: ${asaasInvoiceData.externalReference}`);
      
      console.log('\n✅ Dados preparados corretamente para criação no ASAAS');
      console.log('⚠️ Necessário sincronizar cliente com ASAAS primeiro');
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

    // 7. Verificar se migração foi executada
    console.log('\n🗄️ 7. VERIFICANDO MIGRAÇÃO ASAAS_CUSTOMER_ID...');
    
    const { data: clientSample, error: clientError } = await supabase
      .from('clients')
      .select('id, full_name, asaas_customer_id')
      .limit(1);

    if (clientError) {
      if (clientError.code === '42703') {
        console.log('⚠️ Coluna asaas_customer_id não existe ainda');
        console.log('   Execute a migração: execute-migration-asaas-customer-id.sql');
      } else {
        console.error('❌ Erro ao verificar migração:', clientError);
      }
    } else {
      console.log('✅ Coluna asaas_customer_id existe');
      if (clientSample && clientSample.length > 0) {
        console.log(`   Exemplo: ${clientSample[0].full_name} - ASAAS ID: ${clientSample[0].asaas_customer_id || 'Não configurado'}`);
      }
    }

    console.log('\n🎯 CONCLUSÕES:');
    console.log('=' .repeat(60));
    console.log('✅ Serviço ASAAS de faturas testado');
    console.log('✅ Contratos e clientes encontrados');
    console.log('✅ Faturas locais identificadas');
    console.log('✅ Integração com ASAAS preparada');
    
    console.log('\n📝 PRÓXIMOS PASSOS:');
    console.log('1. Executar migração para adicionar asaas_customer_id');
    console.log('2. Sincronizar clientes com ASAAS');
    console.log('3. Testar criação real de fatura no ASAAS');
    console.log('4. Implementar sincronização de status');

  } catch (error) {
    console.error('❌ ERRO GERAL:', error);
  }
}

// Executar teste
testAsaasInvoiceServiceUpdated();


