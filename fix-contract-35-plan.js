// Corrigir commission_table_id do contrato 35
// Arquivo: fix-contract-35-plan.js

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://cgystsylstnkgfgbqoel.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNneXN0c3lsc3Rua2dmZ2Jxb2VsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMzMDMyNDYsImV4cCI6MjA2ODg3OTI0Nn0.IcY6tymXTxsuQGk7xHJWMkgtoP808i0sPTWLLTb6jPI';

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixContract35Plan() {
  console.log('🔧 CORRIGINDO COMMISSION_TABLE_ID DO CONTRATO 35');
  console.log('=' .repeat(60));

  try {
    // 1. Verificar contrato atual
    console.log('\n📋 1. VERIFICANDO CONTRATO ATUAL...');
    
    const { data: contract, error: contractError } = await supabase
      .from('contracts')
      .select('id, credit_amount, commission_table_id')
      .eq('id', 35)
      .single();

    if (contractError) {
      console.error('❌ Erro ao buscar contrato:', contractError);
      return;
    }

    console.log('✅ Contrato 35 atual:');
    console.log(`   ID: ${contract.id}`);
    console.log(`   Credit Amount: R$ ${(contract.credit_amount || 0).toLocaleString('pt-BR')}`);
    console.log(`   Commission Table ID: ${contract.commission_table_id}`);

    // 2. Buscar plano recomendado (ID 44 - TABELA A)
    console.log('\n📊 2. VERIFICANDO PLANO RECOMENDADO...');
    
    const { data: plano, error: planoError } = await supabase
      .from('planos')
      .select(`
        id,
        nome,
        ativo,
        faixas_de_credito (
          id,
          valor_credito,
          valor_primeira_parcela,
          valor_parcelas_restantes,
          numero_total_parcelas
        )
      `)
      .eq('id', 44)
      .eq('ativo', true)
      .single();

    if (planoError) {
      console.error('❌ Erro ao buscar plano:', planoError);
      return;
    }

    console.log('✅ Plano recomendado (ID 44):');
    console.log(`   Nome: "${plano.nome}"`);
    console.log(`   Ativo: ${plano.ativo}`);
    console.log(`   Faixas de crédito: ${plano.faixas_de_credito.length}`);

    // 3. Verificar se tem faixa para R$ 20.000
    console.log('\n💰 3. VERIFICANDO FAIXA PARA R$ 20.000...');
    
    const faixa20000 = plano.faixas_de_credito.find(faixa => faixa.valor_credito == 20000);
    
    if (faixa20000) {
      console.log('✅ Faixa para R$ 20.000 encontrada:');
      console.log(`   ID: ${faixa20000.id}`);
      console.log(`   Primeira parcela: R$ ${faixa20000.valor_primeira_parcela.toLocaleString('pt-BR')}`);
      console.log(`   Parcelas restantes: R$ ${faixa20000.valor_parcelas_restantes.toLocaleString('pt-BR')}`);
      console.log(`   Total parcelas: ${faixa20000.numero_total_parcelas}`);
    } else {
      console.log('❌ Nenhuma faixa para R$ 20.000 encontrada');
      return;
    }

    // 4. Atualizar contrato
    console.log('\n🔧 4. ATUALIZANDO CONTRATO...');
    
    const { data: updatedContract, error: updateError } = await supabase
      .from('contracts')
      .update({ commission_table_id: 44 })
      .eq('id', 35)
      .select()
      .single();

    if (updateError) {
      console.error('❌ Erro ao atualizar contrato:', updateError);
      return;
    }

    console.log('✅ Contrato atualizado com sucesso:');
    console.log(`   ID: ${updatedContract.id}`);
    console.log(`   Commission Table ID: ${updatedContract.commission_table_id}`);

    // 5. Testar se agora funciona
    console.log('\n🧪 5. TESTANDO SE AGORA FUNCIONA...');
    
    // Simular o fluxo do contract-analysis.service.ts
    const { data: testPlano, error: testError } = await supabase
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
      .eq('id', updatedContract.commission_table_id)
      .eq('ativo', true)
      .single();

    if (testError) {
      console.error('❌ Erro no teste:', testError);
      return;
    }

    const testFaixa = testPlano.faixas_de_credito.find(
      faixa => faixa.valor_credito == updatedContract.credit_amount
    );

    if (testFaixa) {
      console.log('🎉 SUCESSO! Sistema funcionando:');
      console.log(`   Plano encontrado: ID ${testPlano.id}`);
      console.log(`   Faixa encontrada: ID ${testFaixa.id}`);
      console.log(`   Primeira parcela: R$ ${testFaixa.valor_primeira_parcela.toLocaleString('pt-BR')}`);
      console.log(`   Parcelas restantes: R$ ${testFaixa.valor_parcelas_restantes.toLocaleString('pt-BR')}`);
      
      console.log('\n✅ Agora o botão "Gerar Faturas" deve funcionar!');
    } else {
      console.log('❌ Ainda não funciona - faixa não encontrada');
    }

  } catch (error) {
    console.error('❌ ERRO GERAL:', error);
  }
}

// Executar correção
fixContract35Plan();
