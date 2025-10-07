// Teste da correção da sequência da tabela contracts
// Arquivo: test-contracts-id-sequence-fix.js

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://cgystsylstnkgfgbqoel.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNneXN0c3lsc3Rua2dmZ2Jxb2VsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMzMDMyNDYsImV4cCI6MjA2ODg3OTI0Nn0.IcY6tymXTxsuQGk7xHJWMkgtoP808i0sPTWLLTb6jPI';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testContractsIdSequenceFix() {
  console.log('🧪 TESTE DA CORREÇÃO DA SEQUÊNCIA DA TABELA CONTRACTS');
  console.log('=' .repeat(60));

  try {
    // 1. Verificar contratos existentes
    console.log('\n📋 1. VERIFICANDO CONTRATOS EXISTENTES...');
    
    const { data: existingContracts, error: existingError } = await supabase
      .from('contracts')
      .select('id, contract_code, status')
      .order('id', { ascending: false })
      .limit(5);

    if (existingError) {
      console.error('❌ Erro ao buscar contratos existentes:', existingError);
      return;
    }

    console.log(`✅ Contratos existentes: ${existingContracts.length}`);
    existingContracts.forEach(contract => {
      console.log(`   - ID: ${contract.id}, Código: ${contract.contract_code}, Status: ${contract.status}`);
    });

    // 2. Testar inserção de um contrato de teste
    console.log('\n🧪 2. TESTANDO INSERÇÃO DE CONTRATO DE TESTE...');
    
    const testContractData = {
      contract_code: `TEST-${Date.now()}`,
      representative_id: 'test-rep-id',
      client_id: 1,
      commission_table_id: 1,
      credit_amount: '1000',
      total_value: '1000',
      remaining_value: '980',
      total_installments: 1,
      first_payment: '1000',
      remaining_payments: '0',
      paid_installments: 0,
      status: 'Pendente',
      contract_content: 'Contrato de teste para verificar sequência ID'
    };

    const { data: newContract, error: insertError } = await supabase
      .from('contracts')
      .insert([testContractData])
      .select('id, contract_code')
      .single();

    if (insertError) {
      console.error('❌ Erro ao inserir contrato de teste:', insertError);
      console.log('   Detalhes do erro:', insertError.message);
      console.log('   Código do erro:', insertError.code);
      
      // Verificar se é erro de sequência
      if (insertError.message.includes('null value in column "id"')) {
        console.log('\n⚠️ PROBLEMA CONFIRMADO: Sequência ID não está funcionando');
        console.log('   Execute o script fix-contracts-id-sequence.sql');
      }
      return;
    }

    console.log('✅ Contrato de teste inserido com sucesso:');
    console.log(`   ID: ${newContract.id}`);
    console.log(`   Código: ${newContract.contract_code}`);

    // 3. Verificar se o ID foi gerado automaticamente
    if (newContract.id && newContract.id > 0) {
      console.log('✅ ID gerado automaticamente pela sequência');
      
      // 4. Limpar o contrato de teste
      console.log('\n🧹 3. LIMPANDO CONTRATO DE TESTE...');
      
      const { error: deleteError } = await supabase
        .from('contracts')
        .delete()
        .eq('id', newContract.id);

      if (deleteError) {
        console.error('❌ Erro ao deletar contrato de teste:', deleteError);
      } else {
        console.log('✅ Contrato de teste removido com sucesso');
      }
    } else {
      console.log('❌ ID não foi gerado automaticamente');
    }

    // 5. Conclusão
    console.log('\n🎯 4. CONCLUSÃO:');
    console.log('=' .repeat(60));
    
    if (newContract && newContract.id) {
      console.log('✅ Sequência ID funcionando corretamente');
      console.log('✅ Contratos podem ser criados normalmente');
      console.log('✅ Sistema pronto para uso');
    } else {
      console.log('❌ Sequência ID não está funcionando');
      console.log('⚠️ Execute o script fix-contracts-id-sequence.sql');
      console.log('⚠️ Sistema não funcionará até a correção');
    }

  } catch (error) {
    console.error('❌ ERRO GERAL:', error);
  }
}

// Executar teste
testContractsIdSequenceFix();
