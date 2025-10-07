// Teste do mapeamento commission_table -> plano
// Arquivo: test-commission-table-mapping.js

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://cgystsylstnkgfgbqoel.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNneXN0c3lsc3Rua2dmZ2Jxb2VsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMzMDMyNDYsImV4cCI6MjA2ODg3OTI0Nn0.IcY6tymXTxsuQGk7xHJWMkgtoP808i0sPTWLLTb6jPI';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testCommissionTableMapping() {
  console.log('🔍 TESTE DO MAPEAMENTO COMMISSION_TABLE -> PLANO');
  console.log('=' .repeat(60));

  try {
    // 1. Buscar contrato 35 com commission_table
    console.log('\n📋 1. BUSCANDO CONTRATO 35 COM COMMISSION_TABLE...');
    
    const { data: contract, error: contractError } = await supabase
      .from('contracts')
      .select(`
        id,
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
    console.log(`   Commission Table ID: ${contract.commission_table_id}`);
    console.log(`   Commission Table Name: "${contract.commission_tables.name}"`);

    // 2. Buscar plano pelo nome da commission_table
    console.log('\n📊 2. BUSCANDO PLANO PELO NOME...');
    
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
      .eq('nome', contract.commission_tables.name)
      .single();

    if (planoError) {
      console.error('❌ Erro ao buscar plano:', planoError);
      console.log('   Tentando buscar todos os planos...');
      
      // Buscar todos os planos para ver os nomes
      const { data: allPlans, error: allPlansError } = await supabase
        .from('planos')
        .select('id, nome, ativo')
        .limit(10);

      if (allPlansError) {
        console.error('❌ Erro ao buscar todos os planos:', allPlansError);
      } else {
        console.log('   Planos disponíveis:');
        allPlans.forEach(plan => {
          console.log(`     - ID: ${plan.id}, Nome: "${plan.nome}", Ativo: ${plan.ativo}`);
        });
      }
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

    // 4. Verificar se existe faixa para R$ 20.000
    console.log('\n🎯 4. VERIFICANDO FAIXA PARA R$ 20.000...');
    
    const contractValue = 20000;
    const matchingFaixa = plano.faixas_de_credito.find(faixa => faixa.valor_credito === contractValue);
    
    if (matchingFaixa) {
      console.log(`✅ Faixa encontrada para R$ ${contractValue.toLocaleString('pt-BR')}:`);
      console.log(`   ID: ${matchingFaixa.id}`);
      console.log(`   Primeira parcela: R$ ${matchingFaixa.valor_primeira_parcela.toLocaleString('pt-BR')}`);
      console.log(`   Parcelas restantes: R$ ${matchingFaixa.valor_parcelas_restantes.toLocaleString('pt-BR')}`);
      console.log(`   Total parcelas: ${matchingFaixa.numero_total_parcelas}`);
    } else {
      console.log(`❌ Nenhuma faixa encontrada para R$ ${contractValue.toLocaleString('pt-BR')}`);
      console.log('   Valores disponíveis:');
      plano.faixas_de_credito.forEach(faixa => {
        console.log(`     - R$ ${faixa.valor_credito.toLocaleString('pt-BR')}`);
      });
    }

    // 5. Buscar todas as faixas de crédito do sistema
    console.log('\n🔍 5. BUSCANDO TODAS AS FAIXAS DE CRÉDITO...');
    
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
testCommissionTableMapping();


