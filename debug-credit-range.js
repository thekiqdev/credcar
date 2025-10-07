// Debug da faixa de crédito
// Arquivo: debug-credit-range.js

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://cgystsylstnkgfgbqoel.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNneXN0c3lsc3Rua2dmZ2Jxb2VsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMzMDMyNDYsImV4cCI6MjA2ODg3OTI0Nn0.IcY6tymXTxsuQGk7xHJWMkgtoP808i0sPTWLLTb6jPI';

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugCreditRange() {
  console.log('🔍 DEBUG DA FAIXA DE CRÉDITO');
  console.log('=' .repeat(60));

  try {
    // 1. Buscar contrato 35
    console.log('\n📋 1. BUSCANDO CONTRATO 35...');
    
    const { data: contract, error: contractError } = await supabase
      .from('contracts')
      .select('id, credit_amount')
      .eq('id', 35)
      .single();

    if (contractError) {
      console.error('❌ Erro ao buscar contrato:', contractError);
      return;
    }

    console.log('✅ Contrato 35:');
    console.log(`   ID: ${contract.id}`);
    console.log(`   Credit Amount: ${contract.credit_amount} (tipo: ${typeof contract.credit_amount})`);

    // 2. Buscar faixa de crédito específica
    console.log('\n💰 2. BUSCANDO FAIXA DE CRÉDITO ESPECÍFICA...');
    
    const { data: faixa, error: faixaError } = await supabase
      .from('faixas_de_credito')
      .select('*')
      .eq('id', 62)
      .single();

    if (faixaError) {
      console.error('❌ Erro ao buscar faixa:', faixaError);
      return;
    }

    console.log('✅ Faixa de crédito ID 62:');
    console.log(`   Valor Crédito: ${faixa.valor_credito} (tipo: ${typeof faixa.valor_credito})`);
    console.log(`   Primeira Parcela: ${faixa.valor_primeira_parcela}`);
    console.log(`   Parcelas Restantes: ${faixa.valor_parcelas_restantes}`);
    console.log(`   Total Parcelas: ${faixa.numero_total_parcelas}`);

    // 3. Comparar valores
    console.log('\n🔍 3. COMPARANDO VALORES...');
    
    const contractValue = contract.credit_amount;
    const faixaValue = faixa.valor_credito;
    
    console.log(`   Contrato: ${contractValue} (${typeof contractValue})`);
    console.log(`   Faixa: ${faixaValue} (${typeof faixaValue})`);
    console.log(`   Igual (===): ${contractValue === faixaValue}`);
    console.log(`   Igual (==): ${contractValue == faixaValue}`);
    console.log(`   String: "${String(contractValue)}" === "${String(faixaValue)}"`);

    // 4. Buscar faixas com diferentes critérios
    console.log('\n🔍 4. BUSCANDO FAIXAS COM DIFERENTES CRITÉRIOS...');
    
    // Buscar por valor exato
    const { data: faixasExato, error: exatoError } = await supabase
      .from('faixas_de_credito')
      .select('id, valor_credito, plano_id')
      .eq('valor_credito', contractValue);

    console.log(`   Busca por valor exato (${contractValue}): ${faixasExato?.length || 0} faixas`);
    if (faixasExato && faixasExato.length > 0) {
      faixasExato.forEach(f => {
        console.log(`     - ID: ${f.id}, Valor: ${f.valor_credito}, Plano: ${f.plano_id}`);
      });
    }

    // Buscar por valor como string
    const { data: faixasString, error: stringError } = await supabase
      .from('faixas_de_credito')
      .select('id, valor_credito, plano_id')
      .eq('valor_credito', String(contractValue));

    console.log(`   Busca por valor como string ("${contractValue}"): ${faixasString?.length || 0} faixas`);
    if (faixasString && faixasString.length > 0) {
      faixasString.forEach(f => {
        console.log(`     - ID: ${f.id}, Valor: ${f.valor_credito}, Plano: ${f.plano_id}`);
      });
    }

    // 5. Testar busca no plano 44
    console.log('\n🎯 5. TESTANDO BUSCA NO PLANO 44...');
    
    const { data: faixasPlano44, error: plano44Error } = await supabase
      .from('faixas_de_credito')
      .select('id, valor_credito, plano_id')
      .eq('plano_id', 44)
      .eq('valor_credito', contractValue);

    console.log(`   Busca no plano 44 por valor ${contractValue}: ${faixasPlano44?.length || 0} faixas`);
    if (faixasPlano44 && faixasPlano44.length > 0) {
      faixasPlano44.forEach(f => {
        console.log(`     - ID: ${f.id}, Valor: ${f.valor_credito}, Plano: ${f.plano_id}`);
      });
    }

    // 6. Buscar todas as faixas do plano 44
    console.log('\n📊 6. TODAS AS FAIXAS DO PLANO 44...');
    
    const { data: todasFaixas44, error: todas44Error } = await supabase
      .from('faixas_de_credito')
      .select('id, valor_credito')
      .eq('plano_id', 44)
      .order('valor_credito');

    if (todas44Error) {
      console.error('❌ Erro ao buscar todas as faixas:', todas44Error);
    } else {
      console.log(`   Total de faixas no plano 44: ${todasFaixas44.length}`);
      console.log('   Valores disponíveis:');
      todasFaixas44.forEach(f => {
        const isMatch = f.valor_credito === contractValue;
        console.log(`     - ID: ${f.id}, Valor: ${f.valor_credito}${isMatch ? ' ← MATCH!' : ''}`);
      });
    }

  } catch (error) {
    console.error('❌ ERRO GERAL:', error);
  }
}

// Executar debug
debugCreditRange();
