const { createClient } = require('@supabase/supabase-js');

// Configuração do Supabase
const supabaseUrl = 'https://cgystsylstnkgfgbqoel.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNneXN0c3lsc3Rua2dmZ2Jxb2VsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMzMDMyNDYsImV4cCI6MjA2ODg3OTI0Nn0.IcY6tymXTxsuQGk7xHJWMkgtoP808i0sPTWLLTb6jPI';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testClientsRLSAfterFix() {
  console.log('🧪 Testando políticas RLS para clients APÓS correção...');
  
  try {
    // 1. Verificar se a tabela clients está acessível
    console.log('\n📋 Verificando acesso à tabela clients...');
    
    const { data: existingClients, error: selectError } = await supabase
      .from('clients')
      .select('id, full_name, email')
      .limit(3);
    
    if (selectError) {
      console.error('❌ Erro ao acessar tabela clients:', selectError);
      return;
    }
    
    console.log('✅ Tabela clients acessível');
    console.log(`📊 Clientes existentes: ${existingClients.length}`);
    existingClients.forEach((client, index) => {
      console.log(`   ${index + 1}. ${client.full_name} (${client.email})`);
    });
    
    // 2. Testar inserção de cliente
    console.log('\n🧪 Testando inserção de cliente...');
    
    const testClient = {
      full_name: 'Cliente Teste RLS Fix',
      email: 'teste-rls-fix@exemplo.com',
      phone: '(11) 99999-9999',
      cpf_cnpj: '123.456.789-01',
      address: 'Rua Teste Fix, 123, Centro, São Paulo, SP, 01234-567'
    };
    
    // Primeiro, verificar se já existe um cliente com esse email
    const { data: existingClient } = await supabase
      .from('clients')
      .select('id, email')
      .eq('email', testClient.email)
      .single();
    
    if (existingClient) {
      console.log('⚠️ Cliente de teste já existe, removendo...');
      const { error: deleteError } = await supabase
        .from('clients')
        .delete()
        .eq('id', existingClient.id);
      
      if (deleteError) {
        console.log('⚠️ Erro ao remover cliente existente:', deleteError);
      } else {
        console.log('🧹 Cliente existente removido');
      }
    }
    
    // Tentar inserir o cliente de teste
    const { data: newClient, error: insertError } = await supabase
      .from('clients')
      .insert([testClient])
      .select('id, full_name, email, address')
      .single();
    
    if (insertError) {
      console.error('❌ Erro ao inserir cliente:', insertError);
      console.log('🔍 Código do erro:', insertError.code);
      console.log('🔍 Mensagem:', insertError.message);
      console.log('🔍 Detalhes:', insertError.details);
      console.log('🔍 Hint:', insertError.hint);
      
      if (insertError.code === '42501') {
        console.log('\n🚨 PROBLEMA: Políticas RLS ainda não foram aplicadas!');
        console.log('📝 Execute o script fix-clients-rls-simple.sql no Supabase');
        return;
      }
    } else {
      console.log('✅ Cliente inserido com sucesso:', newClient);
      
      // Testar atualização
      console.log('\n🔄 Testando atualização de cliente...');
      const { error: updateError } = await supabase
        .from('clients')
        .update({ full_name: 'Cliente Teste RLS Fix - Atualizado' })
        .eq('id', newClient.id);
      
      if (updateError) {
        console.error('❌ Erro ao atualizar cliente:', updateError);
      } else {
        console.log('✅ Cliente atualizado com sucesso');
      }
      
      // Limpar o cliente de teste
      console.log('\n🧹 Limpando cliente de teste...');
      const { error: deleteError } = await supabase
        .from('clients')
        .delete()
        .eq('id', newClient.id);
      
      if (deleteError) {
        console.log('⚠️ Erro ao limpar cliente de teste:', deleteError);
      } else {
        console.log('✅ Cliente de teste removido');
      }
    }
    
    // 3. Testar criação de contrato (simulação)
    console.log('\n📋 Testando simulação de criação de contrato...');
    
    // Simular dados que seriam usados na criação de contrato
    const contractClientData = {
      full_name: 'Cliente Contrato Teste',
      email: 'contrato-teste@exemplo.com',
      phone: '(11) 88888-8888',
      cpf_cnpj: '987.654.321-00',
      address: 'Rua Contrato, 456, Centro, São Paulo, SP, 01234-567'
    };
    
    // Verificar se já existe
    const { data: existingContractClient } = await supabase
      .from('clients')
      .select('id, email')
      .eq('email', contractClientData.email)
      .single();
    
    if (existingContractClient) {
      console.log('⚠️ Cliente de contrato já existe, removendo...');
      await supabase
        .from('clients')
        .delete()
        .eq('id', existingContractClient.id);
    }
    
    // Tentar inserir cliente para contrato
    const { data: contractClient, error: contractClientError } = await supabase
      .from('clients')
      .insert([contractClientData])
      .select('id')
      .single();
    
    if (contractClientError) {
      console.error('❌ Erro ao inserir cliente para contrato:', contractClientError);
      console.log('🚨 PROBLEMA: Criação de contrato falhará!');
    } else {
      console.log('✅ Cliente para contrato inserido com sucesso');
      
      // Limpar
      await supabase
        .from('clients')
        .delete()
        .eq('id', contractClient.id);
      
      console.log('✅ Cliente de contrato removido');
      console.log('🎉 Criação de contrato deve funcionar agora!');
    }
    
    console.log('\n🎉 Teste de RLS após correção concluído!');
    
  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

testClientsRLSAfterFix();
