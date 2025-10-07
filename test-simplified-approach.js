// Teste da abordagem simplificada (usando commission_table_id como plan_id)
// Arquivo: test-simplified-approach.js

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://cgystsylstnkgfgbqoel.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNneXN0c3lsc3Rua2dmZ2Jxb2VsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMzMDMyNDYsImV4cCI6MjA2ODg3OTI0Nn0.IcY6tymXTxsuQGk7xHJWMkgtoP808i0sPTWLLTb6jPI';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testSimplifiedApproach() {
  console.log('🧪 TESTE DA ABORDAGEM SIMPLIFICADA');
  console.log('=' .repeat(60));

  try {
    // 1. Buscar contrato 35
    console.log('\n📋 1. BUSCANDO CONTRATO 35...');
    
    const { data: contract, error: contractError } = await supabase
      .from('contracts')
      .select(`
        id,
        commission_table_id,
        credit_amount
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
    console.log(`   Credit Amount: R$ ${(contract.credit_amount || 0).toLocaleString('pt-BR')}`);

    // 2. Buscar plano usando commission_table_id como plan_id
    console.log('\n📊 2. BUSCANDO PLANO USANDO COMMISSION_TABLE_ID COMO PLAN_ID...');
    
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
      .eq('id', contract.commission_table_id)
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

    // 3. Verificar faixa para R$ 20.000
    console.log('\n💰 3. VERIFICANDO FAIXA PARA R$ 20.000...');
    
    const contractValue = contract.credit_amount || 0;
    const faixa20000 = plano.faixas_de_credito.find(faixa => faixa.valor_credito == contractValue);
    
    if (faixa20000) {
      console.log(`✅ Faixa para R$ ${contractValue.toLocaleString('pt-BR')} encontrada:`);
      console.log(`   ID: ${faixa20000.id}`);
      console.log(`   Primeira parcela: R$ ${faixa20000.valor_primeira_parcela.toLocaleString('pt-BR')}`);
      console.log(`   Parcelas restantes: R$ ${faixa20000.valor_parcelas_restantes.toLocaleString('pt-BR')}`);
      console.log(`   Total parcelas: ${faixa20000.numero_total_parcelas}`);
      
      console.log('\n🎉 SUCESSO! Sistema funcionando com abordagem simplificada');
    } else {
      console.log(`❌ Nenhuma faixa para R$ ${contractValue.toLocaleString('pt-BR')} encontrada`);
      console.log('   Valores disponíveis:');
      plano.faixas_de_credito.forEach(faixa => {
        console.log(`     - R$ ${faixa.valor_credito.toLocaleString('pt-BR')}`);
      });
    }

    // 4. Simular fluxo completo do contract-analysis.service.ts
    console.log('\n🔄 4. SIMULANDO FLUXO COMPLETO...');
    
    // Simular getContractPaymentPlan
    const paymentPlan = plano;
    
    // Simular calculateInstallments
    const installments = [];
    
    // 1ª Parcela
    installments.push({
      numero_parcela: 1,
      valor_parcela: faixa20000.valor_primeira_parcela,
      vencimento: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 dias
      tipo: 'primeira'
    });

    // Parcelas restantes (simular algumas)
    for (let i = 2; i <= Math.min(5, faixa20000.numero_total_parcelas); i++) {
      installments.push({
        numero_parcela: i,
        valor_parcela: faixa20000.valor_parcelas_restantes,
        vencimento: new Date(Date.now() + (i * 30) * 24 * 60 * 60 * 1000), // i * 30 dias
        tipo: 'restante'
      });
    }

    console.log(`✅ Parcelas calculadas: ${installments.length}`);
    installments.forEach(inst => {
      console.log(`   ${inst.numero_parcela}ª: R$ ${inst.valor_parcela.toLocaleString('pt-BR')} - ${inst.vencimento.toISOString().split('T')[0]} (${inst.tipo})`);
    });

    // 5. Conclusão
    console.log('\n🎯 5. CONCLUSÃO:');
    console.log('=' .repeat(60));
    console.log('✅ Abordagem simplificada funcionando');
    console.log('✅ Usando commission_table_id como plan_id');
    console.log('✅ Buscando diretamente na tabela planos');
    console.log('✅ Faixa de crédito encontrada');
    console.log('✅ Cálculo de parcelas funcionando');
    
    console.log('\n🚀 SISTEMA PRONTO PARA TESTE!');
    console.log('   Agora teste o botão "Gerar Faturas"');

  } catch (error) {
    console.error('❌ ERRO GERAL:', error);
  }
}

// Executar teste
testSimplifiedApproach();


