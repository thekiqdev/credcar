// Diagnóstico do contrato 18469
// Arquivo: debug-contract-18469.js

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://cgystsylstnkgfgbqoel.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNneXN0c3lsc3Rua2dmZ2Jxb2VsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMzMDMyNDYsImV4cCI6MjA2ODg3OTI0Nn0.IcY6tymXTxsuQGk7xHJWMkgtoP808i0sPTWLLTb6jPI';

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugContract18469() {
  console.log('🔍 DIAGNÓSTICO DO CONTRATO 18469');
  console.log('=' .repeat(60));

  try {
    // 1. Buscar contrato 18469
    console.log('\n📋 1. BUSCANDO CONTRATO 18469...');
    
    const { data: contract, error: contractError } = await supabase
      .from('contracts')
      .select(`
        id,
        contract_code,
        commission_table_id,
        id_faixa_de_credito,
        credit_amount,
        status,
        created_at
      `)
      .eq('id', 18469)
      .single();

    if (contractError) {
      console.error('❌ Erro ao buscar contrato:', contractError);
      return;
    }

    console.log('✅ Contrato 18469:');
    console.log(`   ID: ${contract.id}`);
    console.log(`   Código: ${contract.contract_code}`);
    console.log(`   Commission Table ID: ${contract.commission_table_id}`);
    console.log(`   ID Faixa de Crédito: ${contract.id_faixa_de_credito || 'NULL'}`);
    console.log(`   Credit Amount: R$ ${(contract.credit_amount || 0).toLocaleString('pt-BR')}`);
    console.log(`   Status: ${contract.status}`);
    console.log(`   Criado em: ${contract.created_at}`);

    // 2. Verificar se commission_table_id corresponde a um plano
    console.log('\n📊 2. VERIFICANDO PLANO...');
    
    if (contract.commission_table_id) {
      const { data: plano, error: planoError } = await supabase
        .from('planos')
        .select('id, nome, ativo')
        .eq('id', contract.commission_table_id)
        .single();

      if (planoError) {
        console.error('❌ Erro ao buscar plano:', planoError);
      } else {
        console.log('✅ Plano encontrado:');
        console.log(`   ID: ${plano.id}`);
        console.log(`   Nome: "${plano.nome}"`);
        console.log(`   Ativo: ${plano.ativo}`);
      }
    } else {
      console.log('❌ Commission Table ID é NULL');
    }

    // 3. Verificar faixas de crédito disponíveis para o plano
    console.log('\n💰 3. VERIFICANDO FAIXAS DE CRÉDITO...');
    
    if (contract.commission_table_id) {
      const { data: faixas, error: faixasError } = await supabase
        .from('faixas_de_credito')
        .select('id, valor_credito, valor_primeira_parcela, valor_parcelas_restantes')
        .eq('plano_id', contract.commission_table_id)
        .order('valor_credito');

      if (faixasError) {
        console.error('❌ Erro ao buscar faixas:', faixasError);
      } else {
        console.log(`✅ Faixas encontradas: ${faixas.length}`);
        faixas.forEach(faixa => {
          console.log(`   - ID: ${faixa.id}, Valor: R$ ${faixa.valor_credito.toLocaleString('pt-BR')}`);
        });

        // Verificar se há faixa para o valor do contrato
        const contractValue = parseFloat(contract.credit_amount || 0);
        const matchingFaixa = faixas.find(faixa => faixa.valor_credito == contractValue);
        
        if (matchingFaixa) {
          console.log(`\n✅ Faixa correspondente encontrada:`);
          console.log(`   ID: ${matchingFaixa.id}`);
          console.log(`   Valor: R$ ${matchingFaixa.valor_credito.toLocaleString('pt-BR')}`);
          console.log(`   1ª Parcela: R$ ${matchingFaixa.valor_primeira_parcela.toLocaleString('pt-BR')}`);
          console.log(`   Restantes: R$ ${matchingFaixa.valor_parcelas_restantes.toLocaleString('pt-BR')}`);
        } else {
          console.log(`\n❌ Nenhuma faixa encontrada para R$ ${contractValue.toLocaleString('pt-BR')}`);
        }
      }
    }

    // 4. Verificar se id_faixa_de_credito está NULL
    console.log('\n⚠️ 4. VERIFICANDO ID_FAIXA_DE_CREDITO...');
    
    if (!contract.id_faixa_de_credito) {
      console.log('❌ ID Faixa de Crédito é NULL');
      console.log('   Isso causa o erro "Faixa de crédito não encontrada"');
      console.log('   O contrato foi criado sem salvar o ID da faixa selecionada');
      
      // Tentar encontrar faixa correspondente para atualizar
      if (contract.commission_table_id && contract.credit_amount) {
        const { data: faixas, error: faixasError } = await supabase
          .from('faixas_de_credito')
          .select('id, valor_credito')
          .eq('plano_id', contract.commission_table_id)
          .order('valor_credito');

        if (!faixasError && faixas.length > 0) {
          const contractValue = parseFloat(contract.credit_amount);
          const matchingFaixa = faixas.find(faixa => faixa.valor_credito == contractValue);
          
          if (matchingFaixa) {
            console.log(`\n💡 SOLUÇÃO: Atualizar contrato com ID da faixa ${matchingFaixa.id}`);
            
            // Atualizar contrato
            const { error: updateError } = await supabase
              .from('contracts')
              .update({ id_faixa_de_credito: matchingFaixa.id })
              .eq('id', contract.id);

            if (updateError) {
              console.error('❌ Erro ao atualizar contrato:', updateError);
            } else {
              console.log('✅ Contrato atualizado com sucesso!');
              console.log(`   ID Faixa de Crédito: ${matchingFaixa.id}`);
            }
          }
        }
      }
    } else {
      console.log('✅ ID Faixa de Crédito está preenchido');
    }

    // 5. Conclusão
    console.log('\n🎯 5. CONCLUSÃO:');
    console.log('=' .repeat(60));
    
    if (!contract.id_faixa_de_credito) {
      console.log('❌ Contrato criado sem id_faixa_de_credito');
      console.log('⚠️ Problema na criação do contrato');
      console.log('⚠️ Campo id_faixa_de_credito não está sendo salvo');
      console.log('💡 Verificar ContractCreationFlow.tsx');
    } else {
      console.log('✅ Contrato tem id_faixa_de_credito');
      console.log('✅ Sistema deve funcionar normalmente');
    }

  } catch (error) {
    console.error('❌ ERRO GERAL:', error);
  }
}

// Executar diagnóstico
debugContract18469();


