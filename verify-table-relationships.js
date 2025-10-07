// Verificação do relacionamento correto entre tabelas
// Arquivo: verify-table-relationships.js

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://cgystsylstnkgfgbqoel.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNneXN0c3lsc3Rua2dmZ2Jxb2VsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMzMDMyNDYsImV4cCI6MjA2ODg3OTI0Nn0.IcY6tymXTxsuQGk7xHJWMkgtoP808i0sPTWLLTb6jPI';

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyTableRelationships() {
  console.log('🔍 VERIFICAÇÃO DOS RELACIONAMENTOS ENTRE TABELAS');
  console.log('=' .repeat(60));

  try {
    // 1. Verificar contrato 18469
    console.log('\n📋 1. VERIFICANDO CONTRATO 18469...');
    
    const { data: contract, error: contractError } = await supabase
      .from('contracts')
      .select('id, commission_table_id, id_faixa_de_credito, credit_amount')
      .eq('id', 18469)
      .single();

    if (contractError) {
      console.error('❌ Erro ao buscar contrato:', contractError);
      return;
    }

    console.log('✅ Contrato 18469:');
    console.log(`   ID: ${contract.id}`);
    console.log(`   Commission Table ID: ${contract.commission_table_id}`);
    console.log(`   ID Faixa de Crédito: ${contract.id_faixa_de_credito}`);
    console.log(`   Credit Amount: R$ ${(contract.credit_amount || 0).toLocaleString('pt-BR')}`);

    // 2. Verificar se commission_table_id aponta para planos
    console.log('\n📊 2. VERIFICANDO SE COMMISSION_TABLE_ID APONTA PARA PLANOS...');
    
    if (contract.commission_table_id) {
      const { data: plano, error: planoError } = await supabase
        .from('planos')
        .select('id, nome, ativo')
        .eq('id', contract.commission_table_id)
        .single();

      if (planoError) {
        console.error('❌ Erro ao buscar plano:', planoError);
        console.log('   Commission Table ID não aponta para planos!');
      } else {
        console.log('✅ Plano encontrado:');
        console.log(`   ID: ${plano.id}`);
        console.log(`   Nome: "${plano.nome}"`);
        console.log(`   Ativo: ${plano.ativo}`);
      }
    }

    // 3. Verificar faixas_de_credito com plano_id
    console.log('\n💰 3. VERIFICANDO FAIXAS_DE_CREDITO COM PLANO_ID...');
    
    if (contract.commission_table_id) {
      const { data: faixas, error: faixasError } = await supabase
        .from('faixas_de_credito')
        .select('id, valor_credito, plano_id, valor_primeira_parcela, valor_parcelas_restantes')
        .eq('plano_id', contract.commission_table_id)
        .order('valor_credito');

      if (faixasError) {
        console.error('❌ Erro ao buscar faixas:', faixasError);
      } else {
        console.log(`✅ Faixas encontradas para plano ${contract.commission_table_id}: ${faixas.length}`);
        faixas.forEach(faixa => {
          console.log(`   - ID: ${faixa.id}, Valor: R$ ${faixa.valor_credito.toLocaleString('pt-BR')}, Plano: ${faixa.plano_id}`);
        });

        // Verificar se há faixa para o valor do contrato
        const contractValue = parseFloat(contract.credit_amount || 0);
        const matchingFaixa = faixas.find(faixa => faixa.valor_credito == contractValue);
        
        if (matchingFaixa) {
          console.log(`\n✅ Faixa correspondente encontrada:`);
          console.log(`   ID: ${matchingFaixa.id}`);
          console.log(`   Valor: R$ ${matchingFaixa.valor_credito.toLocaleString('pt-BR')}`);
          console.log(`   Plano ID: ${matchingFaixa.plano_id}`);
          console.log(`   1ª Parcela: R$ ${matchingFaixa.valor_primeira_parcela.toLocaleString('pt-BR')}`);
          console.log(`   Restantes: R$ ${matchingFaixa.valor_parcelas_restantes.toLocaleString('pt-BR')}`);
        } else {
          console.log(`\n❌ Nenhuma faixa encontrada para R$ ${contractValue.toLocaleString('pt-BR')}`);
        }
      }
    }

    // 4. Verificar se id_faixa_de_credito está correto
    console.log('\n🔍 4. VERIFICANDO ID_FAIXA_DE_CREDITO...');
    
    if (contract.id_faixa_de_credito) {
      const { data: faixaEspecifica, error: faixaEspecificaError } = await supabase
        .from('faixas_de_credito')
        .select('id, valor_credito, plano_id')
        .eq('id', contract.id_faixa_de_credito)
        .single();

      if (faixaEspecificaError) {
        console.error('❌ Erro ao buscar faixa específica:', faixaEspecificaError);
        console.log('   ID Faixa de Crédito não existe!');
      } else {
        console.log('✅ Faixa específica encontrada:');
        console.log(`   ID: ${faixaEspecifica.id}`);
        console.log(`   Valor: R$ ${faixaEspecifica.valor_credito.toLocaleString('pt-BR')}`);
        console.log(`   Plano ID: ${faixaEspecifica.plano_id}`);
        
        // Verificar se a faixa pertence ao plano do contrato
        if (faixaEspecifica.plano_id == contract.commission_table_id) {
          console.log('✅ Faixa pertence ao plano do contrato');
        } else {
          console.log('❌ PROBLEMA: Faixa não pertence ao plano do contrato!');
          console.log(`   Faixa Plano ID: ${faixaEspecifica.plano_id}`);
          console.log(`   Contrato Plano ID: ${contract.commission_table_id}`);
        }
      }
    } else {
      console.log('❌ ID Faixa de Crédito é NULL');
    }

    // 5. Simular busca correta
    console.log('\n🧪 5. SIMULANDO BUSCA CORRETA...');
    
    // Método correto: buscar faixa por id_faixa_de_credito
    if (contract.id_faixa_de_credito) {
      const { data: creditRange, error: creditRangeError } = await supabase
        .from('faixas_de_credito')
        .select('*')
        .eq('id', contract.id_faixa_de_credito)
        .single();

      if (creditRangeError) {
        console.error('❌ ERRO NA BUSCA CORRETA:', creditRangeError);
        console.log('   Detalhes:', creditRangeError.message);
        console.log('   Código:', creditRangeError.code);
      } else {
        console.log('✅ Busca correta funcionando:');
        console.log(`   ID: ${creditRange.id}`);
        console.log(`   Valor: R$ ${creditRange.valor_credito.toLocaleString('pt-BR')}`);
        console.log(`   Plano ID: ${creditRange.plano_id}`);
        console.log(`   1ª Parcela: R$ ${creditRange.valor_primeira_parcela.toLocaleString('pt-BR')}`);
        console.log(`   Restantes: R$ ${creditRange.valor_parcelas_restantes.toLocaleString('pt-BR')}`);
        console.log(`   Total: ${creditRange.numero_total_parcelas} parcelas`);
      }
    }

    // 6. Conclusão
    console.log('\n🎯 6. CONCLUSÃO:');
    console.log('=' .repeat(60));
    
    if (contract.id_faixa_de_credito) {
      console.log('✅ ID Faixa de Crédito está preenchido');
      console.log('✅ Busca direta deve funcionar');
      console.log('⚠️ Verificar se o código está usando a busca correta');
    } else {
      console.log('❌ ID Faixa de Crédito é NULL');
      console.log('⚠️ Contrato foi criado sem salvar a faixa');
    }

  } catch (error) {
    console.error('❌ ERRO GERAL:', error);
  }
}

// Executar verificação
verifyTableRelationships();


