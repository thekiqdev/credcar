// Teste da migração para plan_id
// Arquivo: test-plan-id-migration.js

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://cgystsylstnkgfgbqoel.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNneXN0c3lsc3Rua2dmZ2Jxb2VsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMzMDMyNDYsImV4cCI6MjA2ODg3OTI0Nn0.IcY6tymXTxsuQGk7xHJWMkgtoP808i0sPTWLLTb6jPI';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testPlanIdMigration() {
  console.log('🧪 TESTE DA MIGRAÇÃO PARA PLAN_ID');
  console.log('=' .repeat(60));

  try {
    // 1. Verificar se a coluna plan_id existe
    console.log('\n📋 1. VERIFICANDO COLUNA PLAN_ID...');
    
    const { data: contract, error: contractError } = await supabase
      .from('contracts')
      .select('id, plan_id, commission_table_id, credit_amount')
      .eq('id', 35)
      .single();

    if (contractError) {
      if (contractError.code === '42703') {
        console.log('❌ Coluna plan_id não existe ainda');
        console.log('   Execute a migração primeiro!');
        console.log('\n📝 COMANDO PARA EXECUTAR:');
        console.log('   Execute o arquivo: execute-migration-plan-id-contracts.sql');
        return;
      } else {
        console.error('❌ Erro ao buscar contrato:', contractError);
        return;
      }
    }

    console.log('✅ Contrato 35:');
    console.log(`   ID: ${contract.id}`);
    console.log(`   Plan ID: ${contract.plan_id || 'N/A'}`);
    console.log(`   Commission Table ID: ${contract.commission_table_id}`);
    console.log(`   Credit Amount: R$ ${(contract.credit_amount || 0).toLocaleString('pt-BR')}`);

    // 2. Verificar se plan_id foi migrado corretamente
    console.log('\n🔍 2. VERIFICANDO MIGRAÇÃO...');
    
    if (contract.plan_id) {
      console.log('✅ Plan ID migrado com sucesso');
      console.log(`   Plan ID: ${contract.plan_id}`);
      console.log(`   Commission Table ID: ${contract.commission_table_id}`);
      console.log(`   Correspondência: ${contract.plan_id == contract.commission_table_id ? '✅ SIM' : '❌ NÃO'}`);
    } else {
      console.log('⚠️ Plan ID não migrado ainda');
      console.log('   Execute a migração para continuar');
      return;
    }

    // 3. Testar busca do plano
    console.log('\n📊 3. TESTANDO BUSCA DO PLANO...');
    
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
      .eq('id', contract.plan_id)
      .eq('ativo', true)
      .single();

    if (planoError) {
      console.error('❌ Erro ao buscar plano:', planoError);
      return;
    }

    console.log('✅ Plano encontrado:');
    console.log(`   ID: ${plano.id}`);
    console.log(`   Nome: "${plano.nome}"`);
    console.log(`   Ativo: ${plano.ativo}`);
    console.log(`   Faixas de crédito: ${plano.faixas_de_credito.length}`);

    // 4. Verificar faixa para R$ 20.000
    console.log('\n💰 4. VERIFICANDO FAIXA PARA R$ 20.000...');
    
    const faixa20000 = plano.faixas_de_credito.find(faixa => faixa.valor_credito == 20000);
    
    if (faixa20000) {
      console.log('✅ Faixa para R$ 20.000 encontrada:');
      console.log(`   ID: ${faixa20000.id}`);
      console.log(`   Primeira parcela: R$ ${faixa20000.valor_primeira_parcela.toLocaleString('pt-BR')}`);
      console.log(`   Parcelas restantes: R$ ${faixa20000.valor_parcelas_restantes.toLocaleString('pt-BR')}`);
      console.log(`   Total parcelas: ${faixa20000.numero_total_parcelas}`);
      
      console.log('\n🎉 SUCESSO! Sistema funcionando com plan_id');
    } else {
      console.log('❌ Nenhuma faixa para R$ 20.000 encontrada');
    }

    // 5. Verificar todos os contratos migrados
    console.log('\n📊 5. VERIFICANDO TODOS OS CONTRATOS...');
    
    const { data: allContracts, error: allContractsError } = await supabase
      .from('contracts')
      .select('id, plan_id, commission_table_id')
      .limit(5);

    if (allContractsError) {
      console.error('❌ Erro ao buscar contratos:', allContractsError);
    } else {
      console.log(`✅ Contratos encontrados: ${allContracts.length}`);
      allContracts.forEach(contract => {
        console.log(`   - ID: ${contract.id}, Plan ID: ${contract.plan_id || 'N/A'}, Commission Table ID: ${contract.commission_table_id}`);
      });
    }

  } catch (error) {
    console.error('❌ ERRO GERAL:', error);
  }
}

// Executar teste
testPlanIdMigration();


