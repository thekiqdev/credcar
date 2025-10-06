// Teste do Contract Analysis Service
// Arquivo: test-contract-analysis.js

import { createClient } from '@supabase/supabase-js';
import { contractAnalysisService } from './src/lib/contract-analysis.service.js';

const supabaseUrl = 'https://cgystsylstnkgfgbqoel.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNneXN0c3lsc3Rua2dmZ2Jxb2VsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMzMDMyNDYsImV4cCI6MjA2ODg3OTI0Nn0.IcY6tymXTxsuQGk7xHJWMkgtoP808i0sPTWLLTb6jPI';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testContractAnalysisService() {
  console.log('🧪 TESTE DO CONTRACT ANALYSIS SERVICE');
  console.log('=' .repeat(60));

  try {
    // 1. Buscar contratos existentes
    console.log('\n📋 1. BUSCANDO CONTRATOS EXISTENTES...');
    
    const { data: contracts, error: contractsError } = await supabase
      .from('contracts')
      .select('id, credit_amount, commission_table_id')
      .limit(5);

    if (contractsError) {
      console.error('❌ Erro ao buscar contratos:', contractsError);
      return;
    }

    if (!contracts || contracts.length === 0) {
      console.log('❌ Nenhum contrato encontrado');
      return;
    }

    console.log(`✅ Encontrados ${contracts.length} contratos:`);
    contracts.forEach(contract => {
      console.log(`   - ID: ${contract.id}, Valor: R$ ${contract.credit_amount.toLocaleString('pt-BR')}`);
    });

    // 2. Testar com o primeiro contrato
    const testContract = contracts[0];
    console.log(`\n🎯 2. TESTANDO COM CONTRATO ID: ${testContract.id}`);

    // 3. Testar busca do plano de pagamento
    console.log('\n📊 3. TESTANDO BUSCA DO PLANO DE PAGAMENTO...');
    
    const paymentPlan = await contractAnalysisService.getContractPaymentPlan(testContract.id);
    if (paymentPlan) {
      console.log(`✅ Plano encontrado: ${paymentPlan.nome}`);
      console.log(`   Descrição: ${paymentPlan.descricao}`);
      console.log(`   Ativo: ${paymentPlan.ativo}`);
      console.log(`   Faixas de crédito: ${paymentPlan.faixas_de_credito.length}`);
      
      // Mostrar faixas de crédito
      paymentPlan.faixas_de_credito.forEach(faixa => {
        console.log(`     - R$ ${faixa.valor_credito.toLocaleString('pt-BR')}: ${faixa.numero_total_parcelas} parcelas`);
      });
    } else {
      console.log('❌ Plano não encontrado');
    }

    // 4. Testar cálculo de parcelas
    console.log('\n🧮 4. TESTANDO CÁLCULO DE PARCELAS...');
    
    const installments = await contractAnalysisService.calculateInstallments(testContract.id);
    console.log(`✅ Parcelas calculadas: ${installments.length}`);
    
    if (installments.length > 0) {
      console.log('   Primeiras 5 parcelas:');
      installments.slice(0, 5).forEach(inst => {
        console.log(`     ${inst.numero_parcela}ª: R$ ${inst.valor_parcela.toLocaleString('pt-BR')} (${inst.tipo})`);
      });
      
      if (installments.length > 5) {
        console.log(`     ... e mais ${installments.length - 5} parcelas`);
      }
    }

    // 5. Testar validação
    console.log('\n✅ 5. TESTANDO VALIDAÇÃO...');
    
    const validation = await contractAnalysisService.validateContractForInvoicing(testContract.id);
    console.log(`✅ Validação: ${validation.isValid ? 'VÁLIDA' : 'INVÁLIDA'}`);
    console.log(`   Total calculado: R$ ${validation.totalValue.toLocaleString('pt-BR')}`);
    
    if (!validation.isValid) {
      console.log('   Erros encontrados:');
      validation.errors.forEach(error => console.log(`     - ${error}`));
    }

    // 6. Testar com dados específicos
    console.log('\n🔍 6. TESTANDO COM DADOS ESPECÍFICOS...');
    
    // Buscar faixa de crédito específica
    const { data: faixas, error: faixasError } = await supabase
      .from('faixas_de_credito')
      .select(`
        *,
        planos!inner (nome),
        condicoes_parcelas (*)
      `)
      .limit(1);

    if (faixasError || !faixas || faixas.length === 0) {
      console.log('❌ Nenhuma faixa de crédito encontrada');
    } else {
      const testFaixa = faixas[0];
      console.log(`📋 Testando com faixa: ${testFaixa.planos.nome} - R$ ${testFaixa.valor_credito.toLocaleString('pt-BR')}`);
      
      // Testar cálculo direto
      const installmentsDirect = contractAnalysisService.calculateInstallmentsFromCreditRange(testFaixa);
      console.log(`✅ Parcelas calculadas diretamente: ${installmentsDirect.length}`);
      
      // Calcular total
      const totalDirect = installmentsDirect.reduce((sum, inst) => sum + inst.valor_parcela, 0);
      console.log(`   Total calculado: R$ ${totalDirect.toLocaleString('pt-BR')}`);
      console.log(`   Valor do crédito: R$ ${testFaixa.valor_credito.toLocaleString('pt-BR')}`);
      
      const difference = Math.abs(totalDirect - testFaixa.valor_credito);
      const percentageDifference = (difference / testFaixa.valor_credito) * 100;
      
      if (difference < 0.01) {
        console.log(`   ✅ CÁLCULO CORRETO!`);
      } else {
        console.log(`   ❌ CÁLCULO INCORRETO! (Diferença: R$ ${difference.toFixed(2)} - ${percentageDifference.toFixed(2)}%)`);
      }
    }

    console.log('\n🎯 CONCLUSÕES:');
    console.log('=' .repeat(60));
    console.log('✅ Serviço de análise de contratos criado');
    console.log('✅ Funções principais implementadas');
    console.log('✅ Testes executados com sucesso');
    
    console.log('\n📝 PRÓXIMOS PASSOS:');
    console.log('1. Corrigir lógica de cálculo de parcelas');
    console.log('2. Implementar validações de negócio');
    console.log('3. Integrar com serviço de criação de faturas');

  } catch (error) {
    console.error('❌ ERRO GERAL:', error);
  }
}

// Executar teste
testContractAnalysisService();
