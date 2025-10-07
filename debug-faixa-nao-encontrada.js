// Teste específico do erro "Faixa de crédito não encontrada"
// Arquivo: debug-faixa-nao-encontrada.js

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://cgystsylstnkgfgbqoel.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNneXN0c3lsc3Rua2dmZ2Jxb2VsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMzMDMyNDYsImV4cCI6MjA2ODg3OTI0Nn0.IcY6tymXTxsuQGk7xHJWMkgtoP808i0sPTWLLTb6jPI';

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugFaixaNaoEncontrada() {
  console.log('🔍 DEBUG: FAIXA DE CRÉDITO NÃO ENCONTRADA');
  console.log('=' .repeat(60));

  try {
    // 1. Verificar contrato 18469
    console.log('\n📋 1. VERIFICANDO CONTRATO 18469...');
    
    const { data: contract, error: contractError } = await supabase
      .from('contracts')
      .select('id, id_faixa_de_credito, commission_table_id, credit_amount')
      .eq('id', 18469)
      .single();

    if (contractError) {
      console.error('❌ Erro ao buscar contrato:', contractError);
      return;
    }

    console.log('✅ Contrato 18469:');
    console.log(`   ID: ${contract.id}`);
    console.log(`   ID Faixa de Crédito: ${contract.id_faixa_de_credito}`);
    console.log(`   Commission Table ID: ${contract.commission_table_id}`);
    console.log(`   Credit Amount: R$ ${(contract.credit_amount || 0).toLocaleString('pt-BR')}`);

    // 2. Testar busca direta da faixa
    console.log('\n🔍 2. TESTANDO BUSCA DIRETA DA FAIXA...');
    
    if (contract.id_faixa_de_credito) {
      console.log(`   Buscando faixa ID: ${contract.id_faixa_de_credito}`);
      
      const { data: creditRange, error: creditRangeError } = await supabase
        .from('faixas_de_credito')
        .select('*')
        .eq('id', contract.id_faixa_de_credito)
        .single();

      if (creditRangeError) {
        console.error('❌ ERRO AO BUSCAR FAIXA:', creditRangeError);
        console.log('   Detalhes:', creditRangeError.message);
        console.log('   Código:', creditRangeError.code);
        console.log('   Hint:', creditRangeError.hint);
        
        // Verificar se a faixa existe
        console.log('\n🔍 Verificando se a faixa existe...');
        const { data: allFaixas, error: allFaixasError } = await supabase
          .from('faixas_de_credito')
          .select('id, valor_credito, plano_id')
          .eq('id', contract.id_faixa_de_credito);

        if (allFaixasError) {
          console.error('❌ Erro ao verificar faixas:', allFaixasError);
        } else {
          console.log(`✅ Faixas encontradas: ${allFaixas.length}`);
          allFaixas.forEach(faixa => {
            console.log(`   - ID: ${faixa.id}, Valor: R$ ${faixa.valor_credito.toLocaleString('pt-BR')}, Plano: ${faixa.plano_id}`);
          });
        }
        
        return;
      }

      console.log('✅ Faixa encontrada:');
      console.log(`   ID: ${creditRange.id}`);
      console.log(`   Valor: R$ ${creditRange.valor_credito.toLocaleString('pt-BR')}`);
      console.log(`   Plano ID: ${creditRange.plano_id}`);
      console.log(`   1ª Parcela: R$ ${creditRange.valor_primeira_parcela.toLocaleString('pt-BR')}`);
      console.log(`   Restantes: R$ ${creditRange.valor_parcelas_restantes.toLocaleString('pt-BR')}`);
      console.log(`   Total: ${creditRange.numero_total_parcelas} parcelas`);
    } else {
      console.log('❌ ID Faixa de Crédito é NULL');
    }

    // 3. Verificar se há problema de relacionamento
    console.log('\n🔗 3. VERIFICANDO RELACIONAMENTOS...');
    
    // Verificar se a faixa pertence ao plano do contrato
    if (contract.id_faixa_de_credito && contract.commission_table_id) {
      const { data: faixaComPlano, error: faixaComPlanoError } = await supabase
        .from('faixas_de_credito')
        .select(`
          id,
          valor_credito,
          plano_id,
          planos!inner (
            id,
            nome
          )
        `)
        .eq('id', contract.id_faixa_de_credito)
        .eq('plano_id', contract.commission_table_id)
        .single();

      if (faixaComPlanoError) {
        console.error('❌ ERRO DE RELACIONAMENTO:', faixaComPlanoError);
        console.log('   A faixa não pertence ao plano do contrato!');
        
        // Buscar faixas do plano do contrato
        console.log('\n🔍 Buscando faixas do plano do contrato...');
        const { data: faixasDoPlano, error: faixasDoPlanoError } = await supabase
          .from('faixas_de_credito')
          .select('id, valor_credito, plano_id')
          .eq('plano_id', contract.commission_table_id)
          .order('valor_credito');

        if (faixasDoPlanoError) {
          console.error('❌ Erro ao buscar faixas do plano:', faixasDoPlanoError);
        } else {
          console.log(`✅ Faixas do plano ${contract.commission_table_id}: ${faixasDoPlano.length}`);
          faixasDoPlano.forEach(faixa => {
            console.log(`   - ID: ${faixa.id}, Valor: R$ ${faixa.valor_credito.toLocaleString('pt-BR')}`);
          });
        }
      } else {
        console.log('✅ Relacionamento correto:');
        console.log(`   Faixa ID: ${faixaComPlano.id}`);
        console.log(`   Plano: "${faixaComPlano.planos.nome}" (ID: ${faixaComPlano.planos.id})`);
      }
    }

    // 4. Conclusão
    console.log('\n🎯 4. CONCLUSÃO:');
    console.log('=' .repeat(60));
    
    if (contract.id_faixa_de_credito) {
      console.log('✅ ID Faixa de Crédito está preenchido');
      console.log('✅ Busca direta deve funcionar');
      console.log('⚠️ Verificar se há problema de relacionamento');
    } else {
      console.log('❌ ID Faixa de Crédito é NULL');
      console.log('⚠️ Contrato foi criado sem salvar a faixa');
    }

  } catch (error) {
    console.error('❌ ERRO GERAL:', error);
  }
}

// Executar debug
debugFaixaNaoEncontrada();


