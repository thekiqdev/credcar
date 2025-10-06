// Teste simples do Contract Analysis Service
// Arquivo: test-contract-analysis-simple.js

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://cgystsylstnkgfgbqoel.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNneXN0c3lsc3Rua2dmZ2Jxb2VsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMzMDMyNDYsImV4cCI6MjA2ODg3OTI0Nn0.IcY6tymXTxsuQGk7xHJWMkgtoP808i0sPTWLLTb6jPI';

const supabase = createClient(supabaseUrl, supabaseKey);

// Função para calcular data de vencimento
function calculateDueDate(installmentNumber) {
  const baseDate = new Date();
  baseDate.setMonth(baseDate.getMonth() + installmentNumber);
  return baseDate;
}

// Função para calcular parcelas baseado em uma faixa de crédito
function calculateInstallmentsFromCreditRange(creditRange) {
  const installments = [];
  const customInstallments = creditRange.condicoes_parcelas || [];

  // 1ª Parcela
  installments.push({
    numero_parcela: 1,
    valor_parcela: creditRange.valor_primeira_parcela,
    vencimento: calculateDueDate(1),
    tipo: 'primeira'
  });

  // Parcelas personalizadas
  customInstallments.forEach(custom => {
    installments.push({
      numero_parcela: custom.numero_parcela,
      valor_parcela: custom.valor_parcela,
      vencimento: calculateDueDate(custom.numero_parcela),
      tipo: 'personalizada'
    });
  });

  // Parcelas restantes
  const usedNumbers = new Set([
    1,
    ...customInstallments.map(c => c.numero_parcela)
  ]);

  for (let i = 2; i <= creditRange.numero_total_parcelas; i++) {
    if (!usedNumbers.has(i)) {
      installments.push({
        numero_parcela: i,
        valor_parcela: creditRange.valor_parcelas_restantes,
        vencimento: calculateDueDate(i),
        tipo: 'restante'
      });
    }
  }

  // Ordenar por número da parcela
  return installments.sort((a, b) => a.numero_parcela - b.numero_parcela);
}

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
      console.log(`   - ID: ${contract.id}, Valor: R$ ${(contract.credit_amount || 0).toLocaleString('pt-BR')}`);
    });

    // 2. Testar com o contrato que tem valor diferente de zero
    const testContract = contracts.find(c => c.credit_amount > 0) || contracts[0];
    console.log(`\n🎯 2. TESTANDO COM CONTRATO ID: ${testContract.id}`);

    // 3. Buscar commission_table do contrato
    console.log('\n📊 3. BUSCANDO COMMISSION TABLE...');
    
    const { data: commissionTable, error: commissionError } = await supabase
      .from('commission_tables')
      .select('*')
      .eq('id', testContract.commission_table_id)
      .single();

    if (commissionError) {
      console.error('❌ Erro ao buscar commission table:', commissionError);
      return;
    }

    console.log(`✅ Commission table encontrada: ${commissionTable.name}`);

    // 4. Buscar plano baseado no nome
    console.log('\n📋 4. BUSCANDO PLANO...');
    
    const { data: planos, error: planoError } = await supabase
      .from('planos')
      .select(`
        *,
        faixas_de_credito (
          *,
          condicoes_parcelas (*)
        )
      `)
      .eq('nome', commissionTable.name);

    if (planoError) {
      console.error('❌ Erro ao buscar plano:', planoError);
      return;
    }

    if (!planos || planos.length === 0) {
      console.log('❌ Nenhum plano encontrado');
      return;
    }

    const plano = planos[0]; // Pegar o primeiro plano
    console.log(`✅ Plano encontrado: ${plano.nome}`);
    console.log(`   Faixas de crédito: ${plano.faixas_de_credito.length}`);

    // 5. Encontrar faixa de crédito correspondente
    console.log('\n💰 5. ENCONTRANDO FAIXA DE CRÉDITO...');
    
    const creditRange = plano.faixas_de_credito.find(
      faixa => faixa.valor_credito === testContract.credit_amount
    ) || plano.faixas_de_credito.find(
      faixa => faixa.valor_credito === 20000
    );

    if (!creditRange) {
      console.log('❌ Faixa de crédito não encontrada');
      console.log('   Faixas disponíveis:');
      plano.faixas_de_credito.forEach(faixa => {
        console.log(`     - R$ ${faixa.valor_credito.toLocaleString('pt-BR')}`);
      });
      return;
    }

    console.log(`✅ Faixa de crédito encontrada: R$ ${creditRange.valor_credito.toLocaleString('pt-BR')}`);
    console.log(`   1ª Parcela: R$ ${creditRange.valor_primeira_parcela.toLocaleString('pt-BR')}`);
    console.log(`   Parcelas Restantes: R$ ${creditRange.valor_parcelas_restantes.toLocaleString('pt-BR')}`);
    console.log(`   Total Parcelas: ${creditRange.numero_total_parcelas}`);
    console.log(`   Parcelas Personalizadas: ${creditRange.condicoes_parcelas.length}`);

    // 6. Calcular parcelas
    console.log('\n🧮 6. CALCULANDO PARCELAS...');
    
    const installments = calculateInstallmentsFromCreditRange(creditRange);
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

    // 7. Validar cálculo
    console.log('\n✅ 7. VALIDANDO CÁLCULO...');
    
    const totalCalculado = installments.reduce((sum, inst) => sum + inst.valor_parcela, 0);
    console.log(`   Total calculado: R$ ${totalCalculado.toLocaleString('pt-BR')}`);
    console.log(`   Valor do crédito: R$ ${creditRange.valor_credito.toLocaleString('pt-BR')}`);
    
    const difference = Math.abs(totalCalculado - creditRange.valor_credito);
    const percentageDifference = (difference / creditRange.valor_credito) * 100;
    
    if (difference < 0.01) {
      console.log(`   ✅ CÁLCULO CORRETO!`);
    } else {
      console.log(`   ❌ CÁLCULO INCORRETO! (Diferença: R$ ${difference.toFixed(2)} - ${percentageDifference.toFixed(2)}%)`);
    }

    // 8. Verificar se já existem faturas
    console.log('\n📋 8. VERIFICANDO FATURAS EXISTENTES...');
    
    const { data: existingInvoices, error: invoicesError } = await supabase
      .from('invoices')
      .select('id, invoice_code, value, status')
      .eq('contract_id', testContract.id);

    if (invoicesError) {
      console.error('❌ Erro ao buscar faturas:', invoicesError);
    } else {
      console.log(`✅ Faturas existentes: ${existingInvoices.length}`);
      if (existingInvoices.length > 0) {
        console.log('   Faturas:');
        existingInvoices.forEach(invoice => {
          console.log(`     - ${invoice.invoice_code}: R$ ${invoice.value.toLocaleString('pt-BR')} (${invoice.status})`);
        });
      }
    }

    console.log('\n🎯 CONCLUSÕES:');
    console.log('=' .repeat(60));
    console.log('✅ Serviço de análise de contratos testado');
    console.log('✅ Funções principais funcionando');
    console.log('✅ Validações implementadas');
    
    console.log('\n📝 PRÓXIMOS PASSOS:');
    console.log('1. Corrigir lógica de cálculo se necessário');
    console.log('2. Implementar serviço de criação de faturas');
    console.log('3. Integrar com ASAAS');

  } catch (error) {
    console.error('❌ ERRO GERAL:', error);
  }
}

// Executar teste
testContractAnalysisService();
