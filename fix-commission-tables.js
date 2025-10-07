// Verificar e corrigir commission_tables
// Arquivo: fix-commission-tables.js

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://cgystsylstnkgfgbqoel.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNneXN0c3lsc3Rua2dmZ2Jxb2VsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMzMDMyNDYsImV4cCI6MjA2ODg3OTI0Nn0.IcY6tymXTxsuQGk7xHJWMkgtoP808i0sPTWLLTb6jPI';

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixCommissionTables() {
  console.log('🔧 CORRIGINDO COMMISSION_TABLES');
  console.log('=' .repeat(60));

  try {
    // 1. Verificar commission_tables existentes
    console.log('\n📋 1. VERIFICANDO COMMISSION_TABLES EXISTENTES...');
    
    const { data: commissionTables, error: commissionError } = await supabase
      .from('commission_tables')
      .select('*')
      .order('id');

    if (commissionError) {
      console.error('❌ Erro ao buscar commission_tables:', commissionError);
      return;
    }

    console.log(`✅ Commission tables encontradas: ${commissionTables.length}`);
    commissionTables.forEach(table => {
      console.log(`   - ID: ${table.id}, Nome: "${table.name}"`);
    });

    // 2. Verificar se existe ID 44
    console.log('\n🔍 2. VERIFICANDO SE EXISTE ID 44...');
    
    const commissionTable44 = commissionTables.find(table => table.id == 44);
    
    if (commissionTable44) {
      console.log('✅ Commission table ID 44 existe:');
      console.log(`   Nome: "${commissionTable44.name}"`);
    } else {
      console.log('❌ Commission table ID 44 não existe');
      
      // 3. Criar commission_table com ID 44
      console.log('\n🔧 3. CRIANDO COMMISSION_TABLE ID 44...');
      
      const { data: newCommissionTable, error: createError } = await supabase
        .from('commission_tables')
        .insert({
          id: 44,
          name: 'TABELA A',
          description: 'Tabela de comissão para plano TABELA A',
          commission_percentage: 4,
          payment_installments: 80,
          payment_details: '80X'
        })
        .select()
        .single();

      if (createError) {
        console.error('❌ Erro ao criar commission_table:', createError);
        return;
      }

      console.log('✅ Commission table criada:');
      console.log(`   ID: ${newCommissionTable.id}`);
      console.log(`   Nome: "${newCommissionTable.name}"`);
    }

    // 4. Agora atualizar o contrato
    console.log('\n🔧 4. ATUALIZANDO CONTRATO 35...');
    
    const { data: updatedContract, error: updateError } = await supabase
      .from('contracts')
      .update({ commission_table_id: 44 })
      .eq('id', 35)
      .select()
      .single();

    if (updateError) {
      console.error('❌ Erro ao atualizar contrato:', updateError);
      return;
    }

    console.log('✅ Contrato atualizado com sucesso:');
    console.log(`   ID: ${updatedContract.id}`);
    console.log(`   Commission Table ID: ${updatedContract.commission_table_id}`);

    // 5. Testar se funciona agora
    console.log('\n🧪 5. TESTANDO SISTEMA...');
    
    // Simular busca do plano
    const { data: plano, error: planoError } = await supabase
      .from('planos')
      .select(`
        *,
        faixas_de_credito (
          *,
          condicoes_parcelas (
            *
          )
        )
      `)
      .eq('id', 44)
      .eq('ativo', true)
      .single();

    if (planoError) {
      console.error('❌ Erro ao buscar plano:', planoError);
      return;
    }

    const faixa = plano.faixas_de_credito.find(
      faixa => faixa.valor_credito == updatedContract.credit_amount
    );

    if (faixa) {
      console.log('🎉 SUCESSO! Sistema funcionando:');
      console.log(`   Plano: ID ${plano.id}, Nome: "${plano.nome}"`);
      console.log(`   Faixa: ID ${faixa.id}, Valor: R$ ${faixa.valor_credito.toLocaleString('pt-BR')}`);
      console.log(`   Primeira parcela: R$ ${faixa.valor_primeira_parcela.toLocaleString('pt-BR')}`);
      console.log(`   Parcelas restantes: R$ ${faixa.valor_parcelas_restantes.toLocaleString('pt-BR')}`);
      
      console.log('\n✅ Agora teste o botão "Gerar Faturas"!');
    } else {
      console.log('❌ Faixa não encontrada');
    }

  } catch (error) {
    console.error('❌ ERRO GERAL:', error);
  }
}

// Executar correção
fixCommissionTables();
