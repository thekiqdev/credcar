// Debug do Contrato 35 - Faixa de Crédito
// Arquivo: debug-contract-35.js

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://cgystsylstnkgfgbqoel.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNneXN0c3lsc3Rua2dmZ2Jxb2VsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMzMDMyNDYsImV4cCI6MjA2ODg3OTI0Nn0.IcY6tymXTxsuQGk7xHJWMkgtoP808i0sPTWLLTb6jPI';

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugContract35() {
  console.log('🔍 DEBUG DO CONTRATO 35 - FAIXA DE CRÉDITO');
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

    if (!contract) {
      console.log('❌ Contrato 35 não encontrado');
      return;
    }

    console.log('✅ Contrato 35 encontrado:');
    console.log(`   ID: ${contract.id}`);
    console.log(`   Status: ${contract.status}`);
    console.log(`   Credit Amount: R$ ${(contract.credit_amount || 0).toLocaleString('pt-BR')}`);
    console.log(`   Commission Table ID: ${contract.commission_table_id}`);
    console.log(`   Cliente: ${contract.clients?.full_name || 'N/A'}`);

    // 2. Buscar commission_table
    console.log('\n📊 2. BUSCANDO COMMISSION TABLE...');
    
    const { data: commissionTable, error: commissionError } = await supabase
      .from('commission_tables')
      .select(`
        id,
        name,
        plan_id
      `)
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
    console.log(`   ID: ${commissionTable.id}`);
    console.log(`   Name: ${commissionTable.name}`);
    console.log(`   Plan ID: ${commissionTable.plan_id}`);

    // 3. Buscar plano
    console.log('\n📋 3. BUSCANDO PLANO...');
    
    const { data: plan, error: planError } = await supabase
      .from('planos')
      .select(`
        id,
        nome,
        ativo
      `)
      .eq('id', commissionTable.plan_id)
      .single();

    if (planError) {
      console.error('❌ Erro ao buscar plano:', planError);
      return;
    }

    if (!plan) {
      console.log('❌ Plano não encontrado');
      return;
    }

    console.log('✅ Plano encontrado:');
    console.log(`   ID: ${plan.id}`);
    console.log(`   Nome: ${plan.nome}`);
    console.log(`   Ativo: ${plan.ativo}`);

    // 4. Buscar faixas de crédito
    console.log('\n💰 4. BUSCANDO FAIXAS DE CRÉDITO...');
    
    const { data: creditRanges, error: creditRangesError } = await supabase
      .from('faixas_de_credito')
      .select(`
        id,
        plan_id,
        valor_credito,
        ativo
      `)
      .eq('plan_id', plan.id)
      .eq('ativo', true)
      .order('valor_credito');

    if (creditRangesError) {
      console.error('❌ Erro ao buscar faixas de crédito:', creditRangesError);
      return;
    }

    console.log(`✅ Faixas de crédito encontradas: ${creditRanges.length}`);
    
    if (creditRanges.length > 0) {
      console.log('   Faixas disponíveis:');
      creditRanges.forEach(range => {
        console.log(`     - ID: ${range.id}, Valor: R$ ${range.valor_credito.toLocaleString('pt-BR')}, Ativo: ${range.ativo}`);
      });
    } else {
      console.log('   ❌ NENHUMA FAIXA DE CRÉDITO ENCONTRADA!');
    }

    // 5. Verificar se existe faixa para o valor do contrato
    console.log('\n🎯 5. VERIFICANDO COMPATIBILIDADE...');
    
    const contractValue = contract.credit_amount || 0;
    const matchingRange = creditRanges.find(range => range.valor_credito === contractValue);
    
    if (matchingRange) {
      console.log(`✅ Faixa compatível encontrada: R$ ${matchingRange.valor_credito.toLocaleString('pt-BR')}`);
    } else {
      console.log(`❌ Nenhuma faixa compatível para R$ ${contractValue.toLocaleString('pt-BR')}`);
      console.log('   Valores disponíveis:');
      creditRanges.forEach(range => {
        console.log(`     - R$ ${range.valor_credito.toLocaleString('pt-BR')}`);
      });
    }

    // 6. Buscar todas as faixas de crédito do sistema
    console.log('\n🔍 6. BUSCANDO TODAS AS FAIXAS DE CRÉDITO DO SISTEMA...');
    
    const { data: allCreditRanges, error: allCreditRangesError } = await supabase
      .from('faixas_de_credito')
      .select(`
        id,
        plan_id,
        valor_credito,
        ativo,
        planos (
          id,
          nome
        )
      `)
      .eq('ativo', true)
      .order('valor_credito');

    if (allCreditRangesError) {
      console.error('❌ Erro ao buscar todas as faixas:', allCreditRangesError);
    } else {
      console.log(`✅ Total de faixas ativas no sistema: ${allCreditRanges.length}`);
      
      if (allCreditRanges.length > 0) {
        console.log('   Todas as faixas ativas:');
        allCreditRanges.forEach(range => {
          console.log(`     - Plano: ${range.planos?.nome || 'N/A'} (ID: ${range.plan_id}), Valor: R$ ${range.valor_credito.toLocaleString('pt-BR')}`);
        });
      }
    }

    // 7. Recomendações
    console.log('\n💡 7. RECOMENDAÇÕES:');
    console.log('=' .repeat(60));
    
    if (creditRanges.length === 0) {
      console.log('❌ PROBLEMA: Nenhuma faixa de crédito ativa para este plano');
      console.log('   SOLUÇÃO: Criar faixas de crédito para o plano ID ' + plan.id);
    } else if (!matchingRange) {
      console.log('❌ PROBLEMA: Nenhuma faixa compatível com o valor do contrato');
      console.log('   SOLUÇÃO: Criar faixa de crédito para R$ ' + contractValue.toLocaleString('pt-BR'));
    } else {
      console.log('✅ Tudo parece estar correto - investigar código do serviço');
    }

  } catch (error) {
    console.error('❌ ERRO GERAL:', error);
  }
}

// Executar debug
debugContract35();


