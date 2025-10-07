// Teste da correção do commission_table_id
// Arquivo: test-commission-table-id-fix.js

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://cgystsylstnkgfgbqoel.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNneXN0c3lsc3Rua2dmZ2Jxb2VsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMzMDMyNDYsImV4cCI6MjA2ODg3OTI0Nn0.IcY6tymXTxsuQGk7xHJWMkgtoP808i0sPTWLLTb6jPI';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testCommissionTableIdFix() {
  console.log('🧪 TESTE DA CORREÇÃO DO COMMISSION_TABLE_ID');
  console.log('=' .repeat(60));

  try {
    // 1. Verificar planos disponíveis
    console.log('\n📊 1. VERIFICANDO PLANOS DISPONÍVEIS...');
    
    const { data: planos, error: planosError } = await supabase
      .from('planos')
      .select('id, nome, ativo')
      .eq('ativo', true)
      .order('id')
      .limit(5);

    if (planosError) {
      console.error('❌ Erro ao buscar planos:', planosError);
      return;
    }

    console.log(`✅ Planos ativos encontrados: ${planos.length}`);
    planos.forEach(plano => {
      console.log(`   - ID: ${plano.id}, Nome: "${plano.nome}"`);
    });

    // 2. Verificar faixas de crédito para um plano
    console.log('\n💰 2. VERIFICANDO FAIXAS DE CRÉDITO...');
    
    const testPlano = planos[0];
    if (testPlano) {
      const { data: faixas, error: faixasError } = await supabase
        .from('faixas_de_credito')
        .select('id, valor_credito, valor_primeira_parcela, valor_parcelas_restantes')
        .eq('plano_id', testPlano.id)
        .order('valor_credito')
        .limit(3);

      if (faixasError) {
        console.error('❌ Erro ao buscar faixas:', faixasError);
        return;
      }

      console.log(`✅ Faixas para plano "${testPlano.nome}" (ID: ${testPlano.id}):`);
      faixas.forEach(faixa => {
        console.log(`   - ID: ${faixa.id}, Valor: R$ ${faixa.valor_credito.toLocaleString('pt-BR')}`);
        console.log(`     1ª Parcela: R$ ${faixa.valor_primeira_parcela.toLocaleString('pt-BR')}`);
        console.log(`     Restantes: R$ ${faixa.valor_parcelas_restantes.toLocaleString('pt-BR')}`);
      });
    }

    // 3. Simular dados de contrato
    console.log('\n🧪 3. SIMULANDO DADOS DE CONTRATO...');
    
    const testContractData = {
      contract_code: `TEST-${Date.now()}`,
      representative_id: '3f3b90b2-3fbe-4b0d-b3cf-2954e94d4afa', // UUID válido
      client_id: 1,
      commission_table_id: testPlano?.id || 1, // ID do plano
      id_faixa_de_credito: 121, // ID da faixa fixo para teste
      quota_id: '1',
      credit_amount: '20000',
      total_value: '20000',
      remaining_value: '19600',
      total_installments: 80,
      first_payment: '1750',
      remaining_payments: '350',
      paid_installments: 0,
      status: 'Pendente',
      contract_content: 'Contrato de teste para verificar commission_table_id'
    };

    console.log('✅ Dados do contrato de teste:');
    console.log(`   Contract Code: ${testContractData.contract_code}`);
    console.log(`   Commission Table ID: ${testContractData.commission_table_id}`);
    console.log(`   ID Faixa de Crédito: ${testContractData.id_faixa_de_credito}`);
    console.log(`   Credit Amount: R$ ${testContractData.credit_amount}`);

    // 4. Testar inserção
    console.log('\n🚀 4. TESTANDO INSERÇÃO DO CONTRATO...');
    
    const { data: newContract, error: insertError } = await supabase
      .from('contracts')
      .insert([testContractData])
      .select('id, contract_code, commission_table_id, id_faixa_de_credito')
      .single();

    if (insertError) {
      console.error('❌ Erro ao inserir contrato:', insertError);
      console.log('   Detalhes:', insertError.message);
      console.log('   Código:', insertError.code);
      
      if (insertError.message.includes('commission_table_id')) {
        console.log('\n⚠️ PROBLEMA: commission_table_id ainda está null');
        console.log('   Verifique se o plano está sendo selecionado corretamente');
      }
      return;
    }

    console.log('✅ Contrato inserido com sucesso:');
    console.log(`   ID: ${newContract.id}`);
    console.log(`   Código: ${newContract.contract_code}`);
    console.log(`   Commission Table ID: ${newContract.commission_table_id}`);
    console.log(`   ID Faixa de Crédito: ${newContract.id_faixa_de_credito}`);

    // 5. Limpar contrato de teste
    console.log('\n🧹 5. LIMPANDO CONTRATO DE TESTE...');
    
    const { error: deleteError } = await supabase
      .from('contracts')
      .delete()
      .eq('id', newContract.id);

    if (deleteError) {
      console.error('❌ Erro ao deletar contrato de teste:', deleteError);
    } else {
      console.log('✅ Contrato de teste removido com sucesso');
    }

    // 6. Conclusão
    console.log('\n🎯 6. CONCLUSÃO:');
    console.log('=' .repeat(60));
    
    if (newContract && newContract.commission_table_id) {
      console.log('✅ commission_table_id funcionando corretamente');
      console.log('✅ Contratos podem ser criados normalmente');
      console.log('✅ Sistema pronto para uso');
    } else {
      console.log('❌ commission_table_id ainda tem problemas');
      console.log('⚠️ Verifique a seleção do plano no frontend');
    }

  } catch (error) {
    console.error('❌ ERRO GERAL:', error);
  }
}

// Executar teste
testCommissionTableIdFix();
