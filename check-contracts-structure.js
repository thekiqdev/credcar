// Verificar estrutura da tabela contracts
// Arquivo: check-contracts-structure.js

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://cgystsylstnkgfgbqoel.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNneXN0c3lsc3Rua2dmZ2Jxb2VsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMzMDMyNDYsImV4cCI6MjA2ODg3OTI0Nn0.IcY6tymXTxsuQGk7xHJWMkgtoP808i0sPTWLLTb6jPI';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkContractsStructure() {
  console.log('🔍 VERIFICANDO ESTRUTURA DA TABELA CONTRACTS');
  console.log('=' .repeat(60));

  try {
    // 1. Buscar contrato 35 para ver estrutura
    console.log('\n📋 1. BUSCANDO CONTRATO 35...');
    
    const { data: contract, error: contractError } = await supabase
      .from('contracts')
      .select('*')
      .eq('id', 35)
      .single();

    if (contractError) {
      console.error('❌ Erro ao buscar contrato:', contractError);
      return;
    }

    console.log('✅ Contrato 35 - Estrutura:');
    Object.keys(contract).forEach(key => {
      console.log(`   - ${key}: ${contract[key]}`);
    });

    // 2. Verificar se tem plan_id
    console.log('\n🔍 2. VERIFICANDO COLUNAS RELACIONADAS A PLANOS...');
    
    const planRelatedColumns = Object.keys(contract).filter(key => 
      key.toLowerCase().includes('plan') || 
      key.toLowerCase().includes('commission') ||
      key.toLowerCase().includes('table')
    );

    console.log('   Colunas relacionadas a planos:');
    planRelatedColumns.forEach(col => {
      console.log(`     - ${col}: ${contract[col]}`);
    });

    // 3. Verificar se precisa adicionar plan_id
    console.log('\n💡 3. ANÁLISE...');
    
    if (contract.plan_id) {
      console.log('✅ Contrato já tem plan_id - usar diretamente');
    } else if (contract.commission_table_id) {
      console.log('⚠️ Contrato usa commission_table_id - precisa migrar para plan_id');
      console.log('   SOLUÇÃO: Adicionar coluna plan_id e migrar dados');
    } else {
      console.log('❌ Contrato não tem nem plan_id nem commission_table_id');
    }

    // 4. Verificar todos os contratos
    console.log('\n📊 4. VERIFICANDO TODOS OS CONTRATOS...');
    
    const { data: allContracts, error: allContractsError } = await supabase
      .from('contracts')
      .select('id, commission_table_id, plan_id')
      .limit(10);

    if (allContractsError) {
      console.error('❌ Erro ao buscar contratos:', allContractsError);
    } else {
      console.log(`✅ Contratos encontrados: ${allContracts.length}`);
      allContracts.forEach(contract => {
        console.log(`   - ID: ${contract.id}, commission_table_id: ${contract.commission_table_id}, plan_id: ${contract.plan_id || 'N/A'}`);
      });
    }

  } catch (error) {
    console.error('❌ ERRO GERAL:', error);
  }
}

// Executar verificação
checkContractsStructure();
