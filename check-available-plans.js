// Verificar planos disponíveis e correspondência
// Arquivo: check-available-plans.js

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://cgystsylstnkgfgbqoel.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNneXN0c3lsc3Rua2dmZ2Jxb2VsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMzMDMyNDYsImV4cCI6MjA2ODg3OTI0Nn0.IcY6tymXTxsuQGk7xHJWMkgtoP808i0sPTWLLTb6jPI';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAvailablePlans() {
  console.log('🔍 VERIFICANDO PLANOS DISPONÍVEIS E CORRESPONDÊNCIA');
  console.log('=' .repeat(60));

  try {
    // 1. Buscar contrato 35
    console.log('\n📋 1. BUSCANDO CONTRATO 35...');
    
    const { data: contract, error: contractError } = await supabase
      .from('contracts')
      .select('id, credit_amount, commission_table_id')
      .eq('id', 35)
      .single();

    if (contractError) {
      console.error('❌ Erro ao buscar contrato:', contractError);
      return;
    }

    console.log('✅ Contrato 35:');
    console.log(`   Commission Table ID: ${contract.commission_table_id}`);

    // 2. Buscar todos os planos ativos
    console.log('\n📊 2. BUSCANDO TODOS OS PLANOS ATIVOS...');
    
    const { data: planos, error: planosError } = await supabase
      .from('planos')
      .select(`
        id,
        nome,
        ativo,
        faixas_de_credito (
          id,
          valor_credito
        )
      `)
      .eq('ativo', true)
      .order('id');

    if (planosError) {
      console.error('❌ Erro ao buscar planos:', planosError);
      return;
    }

    console.log(`✅ Planos ativos encontrados: ${planos.length}`);
    planos.forEach(plano => {
      console.log(`   - ID: ${plano.id}, Nome: "${plano.nome}", Faixas: ${plano.faixas_de_credito.length}`);
    });

    // 3. Verificar se commission_table_id corresponde a algum plano
    console.log('\n🎯 3. VERIFICANDO CORRESPONDÊNCIA...');
    
    const matchingPlano = planos.find(plano => plano.id == contract.commission_table_id);
    
    if (matchingPlano) {
      console.log(`✅ Plano correspondente encontrado: ID ${matchingPlano.id}`);
      console.log(`   Nome: "${matchingPlano.nome}"`);
      console.log(`   Faixas de crédito: ${matchingPlano.faixas_de_credito.length}`);
    } else {
      console.log(`❌ Nenhum plano encontrado com ID ${contract.commission_table_id}`);
      console.log('   IDs disponíveis:');
      planos.forEach(plano => {
        console.log(`     - ${plano.id}`);
      });
    }

    // 4. Buscar planos que têm faixa para R$ 20.000
    console.log('\n💰 4. BUSCANDO PLANOS COM FAIXA PARA R$ 20.000...');
    
    const planosComFaixa20000 = planos.filter(plano => 
      plano.faixas_de_credito.some(faixa => faixa.valor_credito == 20000)
    );

    console.log(`✅ Planos com faixa para R$ 20.000: ${planosComFaixa20000.length}`);
    planosComFaixa20000.forEach(plano => {
      const faixa20000 = plano.faixas_de_credito.find(faixa => faixa.valor_credito == 20000);
      console.log(`   - ID: ${plano.id}, Nome: "${plano.nome}", Faixa ID: ${faixa20000.id}`);
    });

    // 5. Recomendações
    console.log('\n💡 5. RECOMENDAÇÕES:');
    console.log('=' .repeat(60));
    
    if (matchingPlano) {
      console.log('✅ Tudo correto - usar o plano encontrado');
    } else if (planosComFaixa20000.length > 0) {
      console.log('⚠️ Commission Table ID incorreto');
      console.log('   SOLUÇÕES:');
      console.log('   1. Atualizar commission_table_id do contrato para um plano válido');
      console.log('   2. Ou criar um plano com ID 12');
      
      console.log('\n   Planos recomendados:');
      planosComFaixa20000.forEach(plano => {
        console.log(`     - ID: ${plano.id}, Nome: "${plano.nome}"`);
      });
    } else {
      console.log('❌ Nenhum plano tem faixa para R$ 20.000');
      console.log('   SOLUÇÃO: Criar faixa de crédito para R$ 20.000 em algum plano');
    }

    // 6. Verificar commission_tables
    console.log('\n🔍 6. VERIFICANDO COMMISSION_TABLES...');
    
    const { data: commissionTables, error: commissionError } = await supabase
      .from('commission_tables')
      .select('id, name')
      .limit(5);

    if (commissionError) {
      console.error('❌ Erro ao buscar commission_tables:', commissionError);
    } else {
      console.log(`✅ Commission tables encontradas: ${commissionTables.length}`);
      commissionTables.forEach(table => {
        console.log(`   - ID: ${table.id}, Nome: "${table.name}"`);
      });
    }

  } catch (error) {
    console.error('❌ ERRO GERAL:', error);
  }
}

// Executar verificação
checkAvailablePlans();


