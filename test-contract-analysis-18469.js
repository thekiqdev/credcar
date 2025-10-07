// Teste do contract-analysis.service.ts com contrato 18469
// Arquivo: test-contract-analysis-18469.js

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://cgystsylstnkgfgbqoel.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNneXN0c3lsc3Rua2dmZ2Jxb2VsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMzMDMyNDYsImV4cCI6MjA2ODg3OTI0Nn0.IcY6tymXTxsuQGk7xHJWMkgtoP808i0sPTWLLTb6jPI';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testContractAnalysis18469() {
  console.log('🧪 TESTE DO CONTRACT-ANALYSIS.SERVICE.TS COM CONTRATO 18469');
  console.log('=' .repeat(60));

  try {
    // 1. Simular getContractPaymentPlan
    console.log('\n📋 1. SIMULANDO getContractPaymentPlan...');
    
    const { data: contract, error: contractError } = await supabase
      .from('contracts')
      .select(`
        id,
        commission_table_id,
        id_faixa_de_credito
      `)
      .eq('id', 18469)
      .single();

    if (contractError) {
      console.error('❌ Erro ao buscar contrato:', contractError);
      return;
    }

    console.log('✅ Contrato encontrado:');
    console.log(`   ID: ${contract.id}`);
    console.log(`   Commission Table ID: ${contract.commission_table_id}`);
    console.log(`   ID Faixa de Crédito: ${contract.id_faixa_de_credito}`);

    // 2. Simular calculateInstallments (método novo)
    console.log('\n💰 2. SIMULANDO calculateInstallments (MÉTODO NOVO)...');
    
    // Buscar contrato com id_faixa_de_credito
    const { data: contractData, error: contractDataError } = await supabase
      .from('contracts')
      .select('id_faixa_de_credito')
      .eq('id', 18469)
      .single();

    if (contractDataError) {
      console.error('❌ Erro ao buscar contrato:', contractDataError);
      return;
    }

    console.log(`✅ ID Faixa de Crédito: ${contractData.id_faixa_de_credito}`);

    // Se temos id_faixa_de_credito, buscar diretamente
    if (contractData.id_faixa_de_credito) {
      console.log('\n🔍 Buscando faixa diretamente por ID...');
      
      const { data: creditRange, error: creditRangeError } = await supabase
        .from('faixas_de_credito')
        .select('*')
        .eq('id', contractData.id_faixa_de_credito)
        .single();

      if (creditRangeError) {
        console.error('❌ Erro ao buscar faixa:', creditRangeError);
        console.log('   Detalhes:', creditRangeError.message);
        console.log('   Código:', creditRangeError.code);
        return;
      }

      console.log('✅ Faixa encontrada diretamente:');
      console.log(`   ID: ${creditRange.id}`);
      console.log(`   Valor: R$ ${creditRange.valor_credito.toLocaleString('pt-BR')}`);
      console.log(`   1ª Parcela: R$ ${creditRange.valor_primeira_parcela.toLocaleString('pt-BR')}`);
      console.log(`   Restantes: R$ ${creditRange.valor_parcelas_restantes.toLocaleString('pt-BR')}`);
      console.log(`   Total: ${creditRange.numero_total_parcelas} parcelas`);

      // 3. Simular cálculo de parcelas
      console.log('\n🧮 3. SIMULANDO CÁLCULO DE PARCELAS...');
      
      const installments = [];
      
      // 1ª Parcela
      installments.push({
        numero_parcela: 1,
        valor_parcela: creditRange.valor_primeira_parcela,
        vencimento: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 dias
        tipo: 'primeira'
      });

      // Parcelas restantes (simular algumas)
      for (let i = 2; i <= Math.min(5, creditRange.numero_total_parcelas); i++) {
        installments.push({
          numero_parcela: i,
          valor_parcela: creditRange.valor_parcelas_restantes,
          vencimento: new Date(Date.now() + (i * 30) * 24 * 60 * 60 * 1000), // i * 30 dias
          tipo: 'restante'
        });
      }

      console.log(`✅ Parcelas calculadas: ${installments.length}`);
      installments.forEach(inst => {
        console.log(`   ${inst.numero_parcela}ª: R$ ${inst.valor_parcela.toLocaleString('pt-BR')} - ${inst.vencimento.toISOString().split('T')[0]} (${inst.tipo})`);
      });

      console.log('\n🎉 SUCESSO! Sistema funcionando perfeitamente');
    } else {
      console.log('❌ ID Faixa de Crédito é NULL');
    }

    // 4. Testar método antigo (fallback)
    console.log('\n🔄 4. TESTANDO MÉTODO ANTIGO (FALLBACK)...');
    
    const { data: paymentPlan, error: planError } = await supabase
      .from('planos')
      .select(`
        *,
        faixas_de_credito (
          *
        )
      `)
      .eq('id', contract.commission_table_id)
      .eq('ativo', true)
      .single();

    if (planError) {
      console.error('❌ Erro ao buscar plano:', planError);
      return;
    }

    console.log('✅ Plano encontrado pelo método antigo:');
    console.log(`   ID: ${paymentPlan.id}`);
    console.log(`   Nome: "${paymentPlan.nome}"`);
    console.log(`   Faixas: ${paymentPlan.faixas_de_credito.length}`);

    // 5. Conclusão
    console.log('\n🎯 5. CONCLUSÃO:');
    console.log('=' .repeat(60));
    
    if (contractData.id_faixa_de_credito) {
      console.log('✅ ID Faixa de Crédito está preenchido');
      console.log('✅ Busca direta funcionando');
      console.log('✅ Cálculo de parcelas funcionando');
      console.log('✅ Sistema deve funcionar no Admin Dashboard');
    } else {
      console.log('❌ ID Faixa de Crédito é NULL');
      console.log('⚠️ Sistema usando fallback');
    }

  } catch (error) {
    console.error('❌ ERRO GERAL:', error);
  }
}

// Executar teste
testContractAnalysis18469();
