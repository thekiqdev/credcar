// Verificar estrutura da tabela commission_tables
// Arquivo: check-commission-tables-structure.js

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://cgystsylstnkgfgbqoel.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNneXN0c3lsc3Rua2dmZ2Jxb2VsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMzMDMyNDYsImV4cCI6MjA2ODg3OTI0Nn0.IcY6tymXTxsuQGk7xHJWMkgtoP808i0sPTWLLTb6jPI';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkCommissionTablesStructure() {
  console.log('🔍 VERIFICANDO ESTRUTURA DA TABELA COMMISSION_TABLES');
  console.log('=' .repeat(60));

  try {
    // 1. Buscar dados do contrato 35
    console.log('\n📋 1. BUSCANDO DADOS DO CONTRATO 35...');
    
    const { data: contract, error: contractError } = await supabase
      .from('contracts')
      .select(`
        id,
        credit_amount,
        status,
        commission_table_id,
        clients (
          id,
          full_name,
          email
        )
      `)
      .eq('id', 35)
      .single();

    if (contractError) {
      console.error('❌ Erro ao buscar contrato 35:', contractError);
      return;
    }

    console.log('✅ Contrato 35:');
    console.log(`   ID: ${contract.id}`);
    console.log(`   Credit Amount: R$ ${(contract.credit_amount || 0).toLocaleString('pt-BR')}`);
    console.log(`   Commission Table ID: ${contract.commission_table_id}`);

    // 2. Buscar commission_table sem especificar colunas
    console.log('\n📊 2. BUSCANDO COMMISSION TABLE (TODAS AS COLUNAS)...');
    
    const { data: commissionTable, error: commissionError } = await supabase
      .from('commission_tables')
      .select('*')
      .eq('id', contract.commission_table_id)
      .single();

    if (commissionError) {
      console.error('❌ Erro ao buscar commission_table:', commissionError);
      return;
    }

    if (!commissionTable) {
      console.log('❌ Commission table não encontrada');
      return;
    }

    console.log('✅ Commission table encontrada:');
    console.log('   Colunas disponíveis:');
    Object.keys(commissionTable).forEach(key => {
      console.log(`     - ${key}: ${commissionTable[key]}`);
    });

    // 3. Buscar todas as commission_tables para ver estrutura
    console.log('\n📋 3. BUSCANDO TODAS AS COMMISSION_TABLES...');
    
    const { data: allCommissionTables, error: allCommissionError } = await supabase
      .from('commission_tables')
      .select('*')
      .limit(3);

    if (allCommissionError) {
      console.error('❌ Erro ao buscar todas as commission_tables:', allCommissionError);
    } else {
      console.log(`✅ Encontradas ${allCommissionTables.length} commission_tables:`);
      allCommissionTables.forEach((table, index) => {
        console.log(`\n   Commission Table ${index + 1}:`);
        Object.keys(table).forEach(key => {
          console.log(`     - ${key}: ${table[key]}`);
        });
      });
    }

    // 4. Buscar faixas de crédito diretamente
    console.log('\n💰 4. BUSCANDO FAIXAS DE CRÉDITO...');
    
    const { data: creditRanges, error: creditRangesError } = await supabase
      .from('faixas_de_credito')
      .select('*')
      .limit(5);

    if (creditRangesError) {
      console.error('❌ Erro ao buscar faixas de crédito:', creditRangesError);
    } else {
      console.log(`✅ Encontradas ${creditRanges.length} faixas de crédito:`);
      if (creditRanges.length > 0) {
        console.log('   Estrutura da primeira faixa:');
        Object.keys(creditRanges[0]).forEach(key => {
          console.log(`     - ${key}: ${creditRanges[0][key]}`);
        });
      }
    }

    // 5. Buscar planos
    console.log('\n📋 5. BUSCANDO PLANOS...');
    
    const { data: plans, error: plansError } = await supabase
      .from('planos')
      .select('*')
      .limit(3);

    if (plansError) {
      console.error('❌ Erro ao buscar planos:', plansError);
    } else {
      console.log(`✅ Encontrados ${plans.length} planos:`);
      if (plans.length > 0) {
        console.log('   Estrutura do primeiro plano:');
        Object.keys(plans[0]).forEach(key => {
          console.log(`     - ${key}: ${plans[0][key]}`);
        });
      }
    }

    // 6. Tentar encontrar relação entre commission_table e plano
    console.log('\n🔗 6. TENTANDO ENCONTRAR RELAÇÃO...');
    
    // Verificar se commission_table tem alguma coluna que referencia plano
    if (commissionTable) {
      console.log('   Verificando colunas da commission_table:');
      Object.keys(commissionTable).forEach(key => {
        if (key.toLowerCase().includes('plan') || key.toLowerCase().includes('plano')) {
          console.log(`     ✅ Possível referência: ${key} = ${commissionTable[key]}`);
        }
      });
    }

  } catch (error) {
    console.error('❌ ERRO GERAL:', error);
  }
}

// Executar verificação
checkCommissionTablesStructure();


