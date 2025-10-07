// Teste da correção após atualização dos contratos
// Arquivo: test-contract-40-fix.js

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://cgystsylstnkgfgbqoel.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNneXN0c3lsc3Rua2dmZ2Jxb2VsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMzMDMyNDYsImV4cCI6MjA2ODg3OTI0Nn0.IcY6tymXTxsuQGk7xHJWMkgtoP808i0sPTWLLTb6jPI';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testContract40Fix() {
  console.log('🧪 TESTE DA CORREÇÃO DO CONTRATO 40');
  console.log('=' .repeat(60));

  try {
    // 1. Verificar contrato 40
    console.log('\n📋 1. VERIFICANDO CONTRATO 40...');
    
    const { data: contract, error: contractError } = await supabase
      .from('contracts')
      .select('id, id_faixa_de_credito, commission_table_id, credit_amount')
      .eq('id', 40)
      .single();

    if (contractError) {
      console.error('❌ Erro ao buscar contrato 40:', contractError);
      return;
    }

    console.log('✅ Contrato 40:');
    console.log(`   ID: ${contract.id}`);
    console.log(`   ID Faixa de Crédito: ${contract.id_faixa_de_credito || 'NULL'}`);
    console.log(`   Commission Table ID: ${contract.commission_table_id}`);
    console.log(`   Credit Amount: R$ ${(contract.credit_amount || 0).toLocaleString('pt-BR')}`);

    // 2. Se id_faixa_de_credito existe, buscar faixa diretamente
    if (contract.id_faixa_de_credito) {
      console.log('\n💰 2. BUSCANDO FAIXA DE CRÉDITO DIRETAMENTE...');
      
      const { data: creditRange, error: creditRangeError } = await supabase
        .from('faixas_de_credito')
        .select('*')
        .eq('id', contract.id_faixa_de_credito)
        .single();

      if (creditRangeError) {
        console.error('❌ Erro ao buscar faixa:', creditRangeError);
        return;
      }

      console.log('✅ Faixa de crédito encontrada:');
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

      console.log('\n🎉 SUCESSO! Sistema funcionando com id_faixa_de_credito');
    } else {
      console.log('\n⚠️ 2. ID_FAIXA_DE_CREDITO NÃO ENCONTRADO');
      console.log('   Execute o script update-existing-contracts-faixa.sql');
      
      // Fallback: tentar método antigo
      console.log('\n🔄 3. TENTANDO MÉTODO ANTIGO (FALLBACK)...');
      
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

      const creditRange = paymentPlan.faixas_de_credito.find(
        faixa => faixa.valor_credito == contract.credit_amount
      );

      if (creditRange) {
        console.log('✅ Faixa encontrada pelo método antigo:');
        console.log(`   ID: ${creditRange.id}`);
        console.log(`   Valor: R$ ${creditRange.valor_credito.toLocaleString('pt-BR')}`);
      } else {
        console.log('❌ Nenhuma faixa encontrada pelo método antigo');
      }
    }

    // 4. Conclusão
    console.log('\n🎯 4. CONCLUSÃO:');
    console.log('=' .repeat(60));
    
    if (contract.id_faixa_de_credito) {
      console.log('✅ Contrato 40 tem id_faixa_de_credito');
      console.log('✅ Sistema funcionando corretamente');
      console.log('✅ Botão "Gerar Faturas" deve funcionar');
    } else {
      console.log('⚠️ Contrato 40 precisa de id_faixa_de_credito');
      console.log('⚠️ Execute o script update-existing-contracts-faixa.sql');
      console.log('⚠️ Sistema funcionará após atualização');
    }

  } catch (error) {
    console.error('❌ ERRO GERAL:', error);
  }
}

// Executar teste
testContract40Fix();


