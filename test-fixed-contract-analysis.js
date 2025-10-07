// Teste da correção do contract-analysis.service.ts
// Arquivo: test-fixed-contract-analysis.js

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://cgystsylstnkgfgbqoel.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNneXN0c3lsc3Rua2dmZ2Jxb2VsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMzMDMyNDYsImV4cCI6MjA2ODg3OTI0Nn0.IcY6tymXTxsuQGk7xHJWMkgtoP808i0sPTWLLTb6jPI';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testFixedContractAnalysis() {
  console.log('🧪 TESTE DA CORREÇÃO DO CONTRACT-ANALYSIS.SERVICE.TS');
  console.log('=' .repeat(60));

  try {
    // 1. Buscar contrato 35 com commission_table
    console.log('\n📋 1. BUSCANDO CONTRATO 35 COM COMMISSION_TABLE...');
    
    const { data: contract, error: contractError } = await supabase
      .from('contracts')
      .select(`
        id,
        credit_amount,
        commission_table_id,
        commission_tables!inner (
          id,
          name,
          commission_percentage,
          payment_details,
          payment_installments
        )
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
    console.log(`   Commission Table: "${contract.commission_tables.name}"`);

    // 2. Buscar planos pelo nome (múltiplos)
    console.log('\n📊 2. BUSCANDO PLANOS PELO NOME...');
    
    const { data: planos, error: planoError } = await supabase
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
      .eq('nome', contract.commission_tables.name)
      .eq('ativo', true);

    if (planoError) {
      console.error('❌ Erro ao buscar planos:', planoError);
      return;
    }

    console.log(`✅ Planos encontrados: ${planos.length}`);
    planos.forEach((plano, index) => {
      console.log(`   Plano ${index + 1}:`);
      console.log(`     ID: ${plano.id}`);
      console.log(`     Nome: "${plano.nome}"`);
      console.log(`     Ativo: ${plano.ativo}`);
      console.log(`     Faixas de crédito: ${plano.faixas_de_credito.length}`);
    });

    // 3. Usar o primeiro plano (como no código corrigido)
    console.log('\n🎯 3. USANDO PRIMEIRO PLANO ATIVO...');
    
    const plano = planos[0];
    console.log(`✅ Plano selecionado: ID ${plano.id}`);
    console.log(`   Nome: "${plano.nome}"`);
    console.log(`   Faixas de crédito: ${plano.faixas_de_credito.length}`);

    // 4. Verificar faixas de crédito
    console.log('\n💰 4. VERIFICANDO FAIXAS DE CRÉDITO...');
    
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

    // 5. Verificar se existe faixa para R$ 20.000
    console.log('\n🎯 5. VERIFICANDO FAIXA PARA R$ 20.000...');
    
    const contractValue = contract.credit_amount || 0;
    const matchingFaixa = plano.faixas_de_credito.find(faixa => faixa.valor_credito === contractValue);
    
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
      
      console.log('\n💡 SOLUÇÃO: Criar faixa de crédito para R$ 20.000');
    }

    // 6. Buscar faixas de crédito para R$ 20.000 em todo o sistema
    console.log('\n🔍 6. BUSCANDO FAIXAS PARA R$ 20.000 EM TODO O SISTEMA...');
    
    const { data: allFaixas, error: allFaixasError } = await supabase
      .from('faixas_de_credito')
      .select(`
        id,
        valor_credito,
        plano_id,
        planos (
          id,
          nome
        )
      `)
      .eq('valor_credito', contractValue);

    if (allFaixasError) {
      console.error('❌ Erro ao buscar faixas:', allFaixasError);
    } else {
      console.log(`✅ Faixas encontradas para R$ ${contractValue.toLocaleString('pt-BR')}: ${allFaixas.length}`);
      allFaixas.forEach(faixa => {
        console.log(`   - ID: ${faixa.id}, Plano: "${faixa.planos?.nome || 'N/A'}" (ID: ${faixa.plano_id})`);
      });
    }

  } catch (error) {
    console.error('❌ ERRO GERAL:', error);
  }
}

// Executar teste
testFixedContractAnalysis();


