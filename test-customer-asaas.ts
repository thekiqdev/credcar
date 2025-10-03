#!/usr/bin/env node

/**
 * Teste dos métodos de customer do AsaasService
 * Usando dados reais do Kaique Santos para teste
 */

import { asaasService } from './src/lib/asaas.service';

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

async function testCustomerOperations() {
  console.log('🧪 TESTE ASAAS SERVICE - GESTÃO DE CLIENTES');
  console.log('📋 Dados do teste:', TEST_CUSTOMER);
  console.log('');

  try {
    // 1. Teste de conexão primeiro
    console.log('🔗 1. Testando conexão com ASAAS...');
    const connectionTest = await asaasService.testConnection();
    
    if (!connectionTest.success) {
      console.error('❌ Conexão falhou:', connectionTest.message);
      return;
    }
    
    console.log('✅ Conexão OK!');
    console.log('');

    // 2. Buscar cliente existente
    console.log('🔍 2. Buscou cliente por CPF...');
    const existingCustomer = await asaasService.findCustomerByCpfCnpj(TEST_CUSTOMER.cpfCnpj);
    
    if (existingCustomer) {
      console.log('✅ Cliente encontrado:', {
        id: existingCustomer.id,
        name: existingCustomer.name,
        email: existingCustomer.email
      });
    } else {
      console.log('ℹ️ Cliente não encontrado, será criado novo');
    }
    console.log('');

    // 3. Criar ou buscar cliente
    console.log('👤 3. Criando/buscando cliente...');
    const customer = await asaasService.createOrFindCustomer(TEST_CUSTOMER);
    
    console.log('✅ Cliente obtido/criado:', {
      id: customer.id,
      name: customer.name,
      email: customer.email,
      cpfCnpj: customer.cpfCnpj
    });
    console.log('');

    // 4. Buscar cliente por ID
    if (customer.id) {
      console.log('🆔 4. Testando busca por ID...');
      const customerById = await asaasService.getCustomerById(customer.id);
      
      if (customerById) {
        console.log('✅ Cliente recuperado por ID:', customerById.name);
      } else {
        console.log('❌ Falha ao buscar por ID');
      }
      console.log('');
    }

    console.log('🎉 TESTE CONCLUÍDO COM SUCESSO!');
    console.log('');
    console.log('📊 Resumo:');
    console.log(`- Cliente ID: ${customer.id}`);
    console.log(`- Nome: ${customer.name}`);
    console.log(`- Email: ${customer.email}`);
    console.log(`- CPF: ${customer.cpfCnpj}`);

  } catch (error) {
    console.error('❌ ERRO NO TESTE:', error);
    console.log('');
    console.log('💡 Dicas para debug:');
    console.log('- Verifique se o servidor 3001 está rodando');
    console.log('- Confirme se a API Key está correta');
    console.log('- Verifique se está no ambiente sandbox');
  }
}

// Executar teste
if (require.main === module) {
  testCustomerOperations().catch(console.error);
}

export { testCustomerOperations };
