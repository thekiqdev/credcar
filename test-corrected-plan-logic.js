// Teste da correção da lógica de busca de planos
// Arquivo: test-corrected-plan-logic.js

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://cgystsylstnkgfgbqoel.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNneXN0c3lsc3Rua2dmZ2Jxb2VsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMzMDMyNDYsImV4cCI6MjA2ODg3OTI0Nn0.IcY6tymXTxsuQGk7xHJWMkgtoP808i0sPTWLLTb6jPI';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testCorrectedPlanLogic() {
  console.log('🧪 TESTE DA CORREÇÃO DA LÓGICA DE BUSCA DE PLANOS');
  console.log('=' .repeat(60));

  try {
    // 1. Buscar contrato 35
    console.log('\n📋 1. BUSCANDO CONTRATO 35...');
    
    const { data: contract, error: contractError } = await supabase
      .from('contracts')
      .select(`
        id,
        credit_amount,
        commission_table_id
      `)
      .eq('id', 35)
      .single();

    if (contractError) {
      console.error('❌ Erro ao buscar contrato:', contractError);
      return;
    }

    console.log('✅ Contrato 35:');
    console.log(`   ID: ${contract.id}`);
    console.log(`   Credit Amount: R$ ${(contract.credit_amount || 0).toLocaleString('pt-BR')}`);
    console.log(`   Commission Table ID: ${contract.commission_table_id}`);

    // 2. Buscar plano diretamente usando commission_table_id
    console.log('\n📊 2. BUSCANDO PLANO DIRETAMENTE...');
    
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
      .eq('id', contract.commission_table_id)
      .eq('ativo', true)
      .single();

    if (planoError) {
      console.error('❌ Erro ao buscar plano:', planoError);
      return;
    }

    if (!plano) {
      console.log('❌ Plano não encontrado');
      return;
    }

    console.log('✅ Plano encontrado:');
    console.log(`   ID: ${plano.id}`);
    console.log(`   Nome: "${plano.nome}"`);
    console.log(`   Ativo: ${plano.ativo}`);
    console.log(`   Faixas de crédito: ${plano.faixas_de_credito.length}`);

    // 3. Verificar faixas de crédito
    console.log('\n💰 3. VERIFICANDO FAIXAS DE CRÉDITO...');
    
    if (plano.faixas_de_credito.length > 0) {
      console.log('   Faixas disponíveis:');
      plano.faixas_de_credito.forEach(faixa => {
        console.log(`     - ID: ${faixa.id}, Valor: R$ ${faixa.valor_credito.toLocaleString('pt-BR')}`);
        console.log(`       Primeira parcela: R$ ${faixa.valor_primeira_parcela.toLocaleString('pt-BR')}`);
        console.log(`       Parcelas restantes: R$ ${faixa.valor_parcelas_restantes.toLocaleString('pt-BR')}`);
        console.log(`       Total parcelas: ${faixa.numero_total_parcelas}`);
      });
    } else {
      console.log('   ❌ NENHUMA FAIXA DE CRÉDITO ENCONTRADA!');
    }

    // 4. Verificar se existe faixa para o valor do contrato
    console.log('\n🎯 4. VERIFICANDO FAIXA PARA O VALOR DO CONTRATO...');
    
    const contractValue = contract.credit_amount || 0;
    const matchingFaixa = plano.faixas_de_credito.find(
      faixa => faixa.valor_credito == contractValue
    );
    
    if (matchingFaixa) {
      console.log(`✅ Faixa encontrada para R$ ${contractValue.toLocaleString('pt-BR')}:`);
      console.log(`   ID: ${matchingFaixa.id}`);
      console.log(`   Primeira parcela: R$ ${matchingFaixa.valor_primeira_parcela.toLocaleString('pt-BR')}`);
      console.log(`   Parcelas restantes: R$ ${matchingFaixa.valor_parcelas_restantes.toLocaleString('pt-BR')}`);
      console.log(`   Total parcelas: ${matchingFaixa.numero_total_parcelas}`);
      
      console.log('\n🎉 SUCESSO! O sistema deve funcionar agora');
    } else {
      console.log(`❌ Nenhuma faixa encontrada para R$ ${contractValue.toLocaleString('pt-BR')}`);
      console.log('   Valores disponíveis:');
      plano.faixas_de_credito.forEach(faixa => {
        console.log(`     - R$ ${faixa.valor_credito.toLocaleString('pt-BR')}`);
      });
    }

    // 5. Verificar se commission_table_id corresponde a um plano válido
    console.log('\n🔍 5. VERIFICANDO CORRESPONDÊNCIA...');
    
    console.log(`   Commission Table ID: ${contract.commission_table_id}`);
    console.log(`   Plano ID encontrado: ${plano.id}`);
    console.log(`   Correspondência: ${contract.commission_table_id == plano.id ? '✅ SIM' : '❌ NÃO'}`);

    // 6. Simular cálculo de parcelas
    console.log('\n💰 6. SIMULANDO CÁLCULO DE PARCELAS...');
    
    if (matchingFaixa) {
      const installments = [];
      
      // 1ª Parcela
      installments.push({
        numero_parcela: 1,
        valor_parcela: matchingFaixa.valor_primeira_parcela,
        vencimento: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 dias
        tipo: 'primeira'
      });

      // Parcelas restantes (simular algumas)
      for (let i = 2; i <= Math.min(5, matchingFaixa.numero_total_parcelas); i++) {
        installments.push({
          numero_parcela: i,
          valor_parcela: matchingFaixa.valor_parcelas_restantes,
          vencimento: new Date(Date.now() + (i * 30) * 24 * 60 * 60 * 1000), // i * 30 dias
          tipo: 'restante'
        });
      }

      console.log(`✅ Parcelas calculadas: ${installments.length}`);
      installments.forEach(inst => {
        console.log(`   ${inst.numero_parcela}ª: R$ ${inst.valor_parcela.toLocaleString('pt-BR')} - ${inst.vencimento.toISOString().split('T')[0]} (${inst.tipo})`);
      });
    }

  } catch (error) {
    console.error('❌ ERRO GERAL:', error);
  }
}

// Executar teste
testCorrectedPlanLogic();
