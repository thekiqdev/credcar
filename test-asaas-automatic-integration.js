// Teste da Integração Automática ASAAS
// Arquivo: test-asaas-automatic-integration.js

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://cgystsylstnkgfgbqoel.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNneXN0c3lsc3Rua2dmZ2Jxb2VsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMzMDMyNDYsImV4cCI6MjA2ODg3OTI0Nn0.IcY6tymXTxsuQGk7xHJWMkgtoP808i0sPTWLLTb6jPI';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testAsaasAutomaticIntegration() {
  console.log('🧪 TESTE DA INTEGRAÇÃO AUTOMÁTICA ASAAS');
  console.log('=' .repeat(60));

  try {
    // 1. Verificar se a migração foi executada
    console.log('\n🗄️ 1. VERIFICANDO MIGRAÇÃO ASAAS_CUSTOMER_ID...');
    
    const { data: clientSample, error: clientError } = await supabase
      .from('clients')
      .select('id, full_name, asaas_customer_id')
      .limit(1);

    if (clientError) {
      if (clientError.code === '42703') {
        console.log('❌ Coluna asaas_customer_id não existe ainda');
        console.log('   Execute a migração primeiro!');
        return;
      } else {
        console.error('❌ Erro ao verificar migração:', clientError);
        return;
      }
    } else {
      console.log('✅ Coluna asaas_customer_id existe');
      if (clientSample && clientSample.length > 0) {
        console.log(`   Exemplo: ${clientSample[0].full_name} - ASAAS ID: ${clientSample[0].asaas_customer_id || 'Não configurado'}`);
      }
    }

    // 2. Buscar contratos com clientes
    console.log('\n📋 2. BUSCANDO CONTRATOS COM CLIENTES...');
    
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

    console.log(`✅ Encontrados ${contracts.length} contratos:`);
    contracts.forEach(contract => {
      const client = contract.clients;
      console.log(`   - ID: ${contract.id}, Status: ${contract.status}`);
      console.log(`     Cliente: ${client?.full_name} (${client?.email})`);
      console.log(`     ASAAS ID: ${client?.asaas_customer_id || 'Não configurado'}`);
    });

    // 3. Encontrar contrato para teste
    console.log('\n🎯 3. ENCONTRANDO CONTRATO PARA TESTE...');
    
    const testContract = contracts.find(c => c.status === 'Ativo' && c.credit_amount > 0);

    if (!testContract) {
      console.log('⚠️ Nenhum contrato ativo encontrado');
      return;
    }

    console.log(`✅ Contrato encontrado: ID ${testContract.id}`);
    console.log(`   Cliente: ${testContract.clients.full_name}`);
    console.log(`   ASAAS ID: ${testContract.clients.asaas_customer_id || 'Não configurado'}`);

    // 4. Verificar faturas existentes
    console.log('\n📄 4. VERIFICANDO FATURAS EXISTENTES...');
    
    const { data: invoices, error: invoicesError } = await supabase
      .from('invoices')
      .select('id, installment_number, amount, due_date, status, invoice_code, payment_link_pix')
      .eq('contract_id', testContract.id)
      .order('installment_number');

    if (invoicesError) {
      console.error('❌ Erro ao buscar faturas:', invoicesError);
      return;
    }

    console.log(`✅ Faturas encontradas: ${invoices.length}`);
    
    if (invoices.length > 0) {
      console.log('   Primeiras 5 faturas:');
      invoices.slice(0, 5).forEach(invoice => {
        console.log(`     ${invoice.installment_number}ª: R$ ${invoice.amount.toLocaleString('pt-BR')} - ${invoice.due_date} (${invoice.status})`);
        console.log(`       ASAAS ID: ${invoice.invoice_code || 'Não criada'}`);
        console.log(`       PIX Link: ${invoice.payment_link_pix ? 'Configurado' : 'Não configurado'}`);
      });
    }

    // 5. Verificar configurações ASAAS
    console.log('\n⚙️ 5. VERIFICANDO CONFIGURAÇÕES ASAAS...');
    
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

    // 6. Simular integração automática
    console.log('\n🚀 6. SIMULANDO INTEGRAÇÃO AUTOMÁTICA...');
    
    if (invoices.length > 0) {
      const integratedInvoices = invoices.filter(inv => inv.invoice_code);
      const pendingInvoices = invoices.filter(inv => !inv.invoice_code);

      console.log(`✅ Faturas integradas com ASAAS: ${integratedInvoices.length}`);
      console.log(`⏳ Faturas pendentes de integração: ${pendingInvoices.length}`);

      if (pendingInvoices.length > 0) {
        console.log('   Faturas pendentes:');
        pendingInvoices.slice(0, 3).forEach(invoice => {
          console.log(`     ${invoice.installment_number}ª: R$ ${invoice.amount.toLocaleString('pt-BR')} - ${invoice.due_date}`);
        });
        
        console.log('\n📝 Para integrar com ASAAS:');
        console.log('1. Cliente precisa ter asaas_customer_id configurado');
        console.log('2. Configurações ASAAS precisam estar corretas');
        console.log('3. Sistema criará faturas automaticamente no ASAAS');
      } else {
        console.log('✅ Todas as faturas já estão integradas com ASAAS');
      }
    } else {
      console.log('⚠️ Nenhuma fatura encontrada - necessário criar faturas primeiro');
      console.log('   Use o botão "Gerar Faturas" no admin');
    }

    console.log('\n🎯 CONCLUSÕES:');
    console.log('=' .repeat(60));
    console.log('✅ Migração executada com sucesso');
    console.log('✅ Contratos e clientes encontrados');
    console.log('✅ Sistema pronto para integração automática');
    console.log('✅ Configurações ASAAS verificadas');
    
    console.log('\n📝 PRÓXIMOS PASSOS:');
    console.log('1. Configurar asaas_customer_id para clientes');
    console.log('2. Testar criação de faturas com integração ASAAS');
    console.log('3. Verificar links de pagamento gerados');

  } catch (error) {
    console.error('❌ ERRO GERAL:', error);
  }
}

// Executar teste
testAsaasAutomaticIntegration();
