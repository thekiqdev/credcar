#!/usr/bin/env node

/**
 * Teste simples dos métodos de customer usando fetch direto
 */

const TEST_CUSTOMER = {
  name: 'Kaique Santos',
  email: 'thekiq@icloud.com',
  cpfCnpj: '428.131.088-63',
  phone: '11981169950',
  mobilePhone: '11981169950',
  postalCode: '00000-000',
  address: 'Endereço de Teste',
  city: 'São Paulo',
  state: 'SP',
  externalReference: 'credcar-test-001'
};

async function testAsaasCustomer() {
  console.log('🧪 TESTE ASAAS CUSTOMER - GESTÃO DE CLIENTES');
  console.log('📋 Dados do teste:', TEST_CUSTOMER);
  console.log('');

  try {
    // API Key (usar a que está funcionando)
    const apiKey = '$aact_hmlg_000MzkwODA2MWY2OGM3MWRlMDU2NWM3MzJlNzZmNGZhZGY6OmNhZWFkOGRhLThjYWQtNDcyMS04NTk3LTlkMDkxY2ZlNmI2ZDo6JGFhY2hfOWU3MjdlZDYtNTg5NC00OWYwLWJjMzgtNWUwZDZjZTdiMjM1';
    
    // 1. Buscar cliente por CPF
    console.log('🔍 1. Buscando cliente por CPF...');
    const cpfClean = TEST_CUSTOMER.cpfCnpj.replace(/\D/g, '');
    
    const searchResponse = await fetch('https://sandbox.asaas.com/api/v3/customers?cpfCnpj=' + cpfClean, {
      headers: {
        'access_token': apiKey,
        'Content-Type': 'application/json'
      }
    });
    
    const searchResult = await searchResponse.json();
    console.log('📊 Resultado da busca:', {
      status: searchResponse.status,
      count: searchResult.data?.length || 0,
      hasData: Array.isArray(searchResult.data)
    });
    
    if (searchResult.data && searchResult.data.length > 0) {
      console.log('✅ Cliente encontrado:', {
        id: searchResult.data[0].id,
        name: searchResult.data[0].name,
        email: searchResult.data[0].email
      });
      
      console.log('🎉 TESTE CONCLUÇO - Cliente já existe!');
      return;
    }
    
    console.log('ℹ️ Cliente não encontrado, criando novo...');
    console.log('');

    // 2. Criar novo cliente
    console.log('👤 2. Criando novo cliente...');
    const createResponse = await fetch('https://sandbox.asaas.com/api/v3/customers', {
      method: 'POST',
      headers: {
        'access_token': apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(TEST_CUSTOMER)
    });
    
    const createResult = await createResponse.json();
    console.log('📊 Resultado da criação:', {
      status: createResponse.status,
      ok: createResponse.ok
    });
    
    if (createResponse.ok) {
      console.log('✅ Cliente criado com sucesso:', {
        id: createResult.id,
        name: createResult.name,
        email: createResult.email,
        cpfCnpj: createResult.cpfCnpj
      });
      console.log('');
      console.log('🎉 TESTE CONCLUÍDO COM SUCESSO!');
      
    } else {
      console.log('❌ Erro ao criar cliente:', createResult);
      
      // Mostrar erros específicos
      if (createResult.errors && createResult.errors.length > 0) {
        console.log('📝 Erros detalhados:');
        createResult.errors.forEach((error, index) => {
          console.log(`   ${index + 1}. ${error.code}: ${error.description}`);
        });
      }
    }

  } catch (error) {
    console.error('❌ ERRO NO TESTE:', error);
    console.log('');
    console.log('💡 Possíveis causas:');
    console.log('- Problema de rede/internet');
    console.log('- API Key incorreta');
    console.log('- Servidor ASAAS indisponível');
  }
}

// Executar teste
testAsaasCustomer().catch(console.error);
