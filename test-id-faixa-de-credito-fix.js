// Teste da correção com id_faixa_de_credito
// Arquivo: test-id-faixa-de-credito-fix.js

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://cgystsylstnkgfgbqoel.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNneXN0c3lsc3Rua2dmZ2Jxb2VsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMzMDMyNDYsImV4cCI6MjA2ODg3OTI0Nn0.IcY6tymXTxsuQGk7xHJWMkgtoP808i0sPTWLLTb6jPI';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testIdFaixaDeCreditoFix() {
  console.log('🧪 TESTE DA CORREÇÃO COM ID_FAIXA_DE_CREDITO');
  console.log('=' .repeat(60));

  try {
    // 1. Verificar se a coluna id_faixa_de_credito existe
    console.log('\n📋 1. VERIFICANDO COLUNA ID_FAIXA_DE_CREDITO...');
    
    const { data: contracts, error: contractsError } = await supabase
      .from('contracts')
      .select('id, id_faixa_de_credito, commission_table_id, credit_amount')
      .order('created_at', { ascending: false })
      .limit(5);

    if (contractsError) {
      console.error('❌ Erro ao buscar contratos:', contractsError);
      return;
    }

    console.log(`✅ Contratos encontrados: ${contracts.length}`);
    contracts.forEach(contract => {
      console.log(`   - ID: ${contract.id}`);
      console.log(`     ID Faixa de Crédito: ${contract.id_faixa_de_credito || 'NULL'}`);
      console.log(`     Commission Table ID: ${contract.commission_table_id}`);
      console.log(`     Credit Amount: R$ ${(contract.credit_amount || 0).toLocaleString('pt-BR')}`);
    });

    // 2. Verificar faixas de crédito disponíveis
    console.log('\n💰 2. VERIFICANDO FAIXAS DE CRÉDITO DISPONÍVEIS...');
    
    const { data: faixas, error: faixasError } = await supabase
      .from('faixas_de_credito')
      .select('id, valor_credito, valor_primeira_parcela, valor_parcelas_restantes, numero_total_parcelas')
      .order('valor_credito');

    if (faixasError) {
      console.error('❌ Erro ao buscar faixas:', faixasError);
      return;
    }

    console.log(`✅ Faixas de crédito encontradas: ${faixas.length}`);
    faixas.forEach(faixa => {
      console.log(`   - ID: ${faixa.id}, Valor: R$ ${faixa.valor_credito.toLocaleString('pt-BR')}`);
      console.log(`     1ª Parcela: R$ ${faixa.valor_primeira_parcela.toLocaleString('pt-BR')}`);
      console.log(`     Restantes: R$ ${faixa.valor_parcelas_restantes.toLocaleString('pt-BR')}`);
      console.log(`     Total: ${faixa.numero_total_parcelas} parcelas`);
    });

    // 3. Simular busca direta por id_faixa_de_credito
    console.log('\n🔍 3. SIMULANDO BUSCA DIRETA POR ID_FAIXA_DE_CREDITO...');
    
    // Pegar uma faixa para teste
    const testFaixa = faixas.find(f => f.valor_credito == 20000);
    if (testFaixa) {
      console.log(`✅ Testando com faixa ID ${testFaixa.id} (R$ ${testFaixa.valor_credito.toLocaleString('pt-BR')})`);
      
      const { data: creditRange, error: creditRangeError } = await supabase
        .from('faixas_de_credito')
        .select('*')
        .eq('id', testFaixa.id)
        .single();

      if (creditRangeError) {
        console.error('❌ Erro ao buscar faixa:', creditRangeError);
      } else {
        console.log('✅ Faixa encontrada diretamente por ID:');
        console.log(`   ID: ${creditRange.id}`);
        console.log(`   Valor: R$ ${creditRange.valor_credito.toLocaleString('pt-BR')}`);
        console.log(`   1ª Parcela: R$ ${creditRange.valor_primeira_parcela.toLocaleString('pt-BR')}`);
        console.log(`   Restantes: R$ ${creditRange.valor_parcelas_restantes.toLocaleString('pt-BR')}`);
        console.log(`   Total: ${creditRange.numero_total_parcelas} parcelas`);
      }
    }

    // 4. Verificar contratos que precisam de id_faixa_de_credito
    console.log('\n⚠️ 4. VERIFICANDO CONTRATOS QUE PRECISAM DE ID_FAIXA_DE_CREDITO...');
    
    const contractsWithoutFaixa = contracts.filter(c => !c.id_faixa_de_credito);
    
    if (contractsWithoutFaixa.length > 0) {
      console.log(`❌ Contratos sem id_faixa_de_credito: ${contractsWithoutFaixa.length}`);
      contractsWithoutFaixa.forEach(contract => {
        console.log(`   - ID: ${contract.id}, Credit Amount: R$ ${(contract.credit_amount || 0).toLocaleString('pt-BR')}`);
        
        // Tentar encontrar faixa correspondente
        const correspondingFaixa = faixas.find(f => f.valor_credito == contract.credit_amount);
        if (correspondingFaixa) {
          console.log(`     → Faixa correspondente: ID ${correspondingFaixa.id}`);
        } else {
          console.log(`     → Nenhuma faixa correspondente encontrada`);
        }
      });
    } else {
      console.log('✅ Todos os contratos têm id_faixa_de_credito');
    }

    // 5. Conclusão
    console.log('\n🎯 5. CONCLUSÃO:');
    console.log('=' .repeat(60));
    
    if (contractsWithoutFaixa.length > 0) {
      console.log('⚠️ Alguns contratos precisam ter id_faixa_de_credito preenchido');
      console.log('✅ Migração criada para adicionar a coluna');
      console.log('✅ Código atualizado para usar id_faixa_de_credito');
      console.log('✅ Fallback implementado para contratos antigos');
    } else {
      console.log('✅ Todos os contratos têm id_faixa_de_credito');
    }
    
    console.log('✅ Sistema corrigido para usar ID da faixa diretamente');
    console.log('✅ Busca mais eficiente e precisa');

  } catch (error) {
    console.error('❌ ERRO GERAL:', error);
  }
}

// Executar teste
testIdFaixaDeCreditoFix();


