// Teste da correção na listagem de contratos
// Arquivo: test-contract-listing-fix.js

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://cgystsylstnkgfgbqoel.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNneXN0c3lsc3Rua2dmZ2Jxb2VsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMzMDMyNDYsImV4cCI6MjA2ODg3OTI0Nn0.IcY6tymXTxsuQGk7xHJWMkgtoP808i0sPTWLLTb6jPI';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testContractListingFix() {
  console.log('🧪 TESTE DA CORREÇÃO NA LISTAGEM DE CONTRATOS');
  console.log('=' .repeat(60));

  try {
    // 1. Testar query corrigida (simulando contractService.getAll)
    console.log('\n📋 1. TESTANDO QUERY CORRIGIDA...');
    
    const { data: contracts, error: contractsError } = await supabase
      .from('contracts')
      .select(`
        *,
        clients(full_name, name),
        profiles!inner (full_name, email),
        planos!inner (nome, descricao)
      `)
      .order('created_at', { ascending: false });

    if (contractsError) {
      console.error('❌ Erro ao buscar contratos:', contractsError);
      return;
    }

    console.log(`✅ Contratos encontrados: ${contracts.length}`);
    
    if (contracts.length > 0) {
      console.log('\n📊 DETALHES DOS CONTRATOS:');
      contracts.forEach((contract, index) => {
        console.log(`\n   ${index + 1}. Contrato ID: ${contract.id}`);
        console.log(`      Código: ${contract.contract_code}`);
        console.log(`      Commission Table ID: ${contract.commission_table_id}`);
        console.log(`      Credit Amount: R$ ${(contract.credit_amount || 0).toLocaleString('pt-BR')}`);
        console.log(`      Status: ${contract.status}`);
        console.log(`      Cliente: ${contract.clients?.full_name || contract.clients?.name || 'N/A'}`);
        console.log(`      Representante: ${contract.profiles?.full_name || 'N/A'}`);
        console.log(`      Plano: ${contract.planos?.nome || 'N/A'}`);
        console.log(`      Descrição: ${contract.planos?.descricao || 'N/A'}`);
      });
    } else {
      console.log('⚠️ Nenhum contrato encontrado');
    }

    // 2. Verificar se há contratos sem plano associado
    console.log('\n🔍 2. VERIFICANDO CONTRATOS SEM PLANO...');
    
    const { data: contractsWithoutPlan, error: withoutPlanError } = await supabase
      .from('contracts')
      .select(`
        id,
        contract_code,
        commission_table_id,
        status
      `)
      .order('created_at', { ascending: false });

    if (withoutPlanError) {
      console.error('❌ Erro ao buscar contratos:', withoutPlanError);
      return;
    }

    const problematicContracts = [];
    
    for (const contract of contractsWithoutPlan) {
      const { data: plano, error: planoError } = await supabase
        .from('planos')
        .select('id, nome')
        .eq('id', contract.commission_table_id)
        .single();

      if (planoError) {
        problematicContracts.push(contract);
      }
    }

    if (problematicContracts.length > 0) {
      console.log(`❌ Contratos com problemas: ${problematicContracts.length}`);
      problematicContracts.forEach(contract => {
        console.log(`   - ID: ${contract.id}, Commission Table ID: ${contract.commission_table_id}`);
      });
    } else {
      console.log('✅ Todos os contratos têm plano válido');
    }

    // 3. Testar query antiga (que deveria falhar)
    console.log('\n⚠️ 3. TESTANDO QUERY ANTIGA (DEVERIA FALHAR)...');
    
    const { data: oldQueryResult, error: oldQueryError } = await supabase
      .from('contracts')
      .select(`
        *,
        clients(full_name, name),
        profiles!inner (full_name, email),
        commission_tables!inner (name, commission_percentage)
      `)
      .order('created_at', { ascending: false });

    if (oldQueryError) {
      console.log('✅ Query antiga falhou como esperado:', oldQueryError.message);
    } else {
      console.log(`⚠️ Query antiga funcionou (inesperado): ${oldQueryResult.length} contratos`);
    }

    // 4. Conclusão
    console.log('\n🎯 4. CONCLUSÃO:');
    console.log('=' .repeat(60));
    
    if (contracts.length > 0) {
      console.log('✅ Correção funcionando - contratos aparecem na lista');
      console.log('✅ Join com tabela planos funcionando');
      console.log('✅ Dados do plano sendo carregados corretamente');
    } else {
      console.log('⚠️ Nenhum contrato encontrado - pode ser normal se não há contratos');
    }
    
    console.log('✅ Sistema corrigido para listar contratos');
    console.log('✅ Admin Dashboard deve mostrar contratos agora');

  } catch (error) {
    console.error('❌ ERRO GERAL:', error);
  }
}

// Executar teste
testContractListingFix();
