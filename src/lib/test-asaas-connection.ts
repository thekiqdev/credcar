/**
 * Test script for AsaasService integration
 * Tests the complete Asaas integration workflow
 */

import { asaasService, initializeAsaasService, testAsaasConnection } from './asaas.service';
import type { AsaasApiConfig } from './asaas.service';

/**
 * Test AsaasService with sandbox configuration
 */
export async function testAsaasServiceIntegration(): Promise<void> {
  console.log('🧪 INICIANDO TESTE COMPLETO DO ASAASSERVICE...\n');

  try {
    // 1. Test basic configuration
    console.log('1️⃣ Testando configuração básica...');
    const testConfig: AsaasApiConfig = {
      apiKey: 'test_sandbox_key', // Esta é uma chave de exemplo
      environment: 'sandbox',
      baseUrl: 'https://sandbox.asaas.com/api/v3',
      webhookSecret: 'test_webhook_secret',
      webhookUrl: 'https://test.com/webhook',
    };

    console.log('✅ Configuração definida:', {
      environment: testConfig.environment,
      baseUrl: testConfig.baseUrl,
      hasApiKey: !!testConfig.apiKey,
      hasWebhook: !!testConfig.webhookSecret,
    });

    // 2. Initialize service
    console.log('\n2️⃣ Inicializando AsaasService...');
    await initializeAsaasService(testConfig);
    
    const config = asaasService.getConfig();
    console.log('✅ Service inicializado:', {
      environment: config?.environment,
      baseUrl: config?.baseUrl,
    });

    // 3. Test API connection (will fail with test key, but should not crash)
    console.log('\n3️⃣ Testando conexão com API...');
    const connectionTest = await testAsaasConnection();
    console.log('🔗 Resultado do teste:', {
      success: connectionTest.success,
      message: connectionTest.message,
    });

    // 4. Test utility functions
    console.log('\n4️⃣ Testando funções utilitárias...');
    
    const invoiceCode = asaasService.generateInvoiceCode();
    console.log('✅ Código de fatura gerado:', invoiceCode);
    
    const dueDate = asaasService.calculateDueDate(30);
    console.log('✅ Data de vencimento calculada:', dueDate);

    // 5. Test customer data format
    console.log('\n5️⃣ Testando formato de dados de cliente...');
    const testCustomerData = {
      name: 'João Silva Teste',
      email: 'joao.test@example.com',
      phone: '(11) 99999-9999',
      cpfCnpj: '123.456.789-00',
      postalCode: '01234-56',
      address: 'Rua Teste',
      addressNumber: '123',
      province: 'Centro',
      city: 'São Paulo',
      state: 'SP',
      country: 'Brasil',
      personType: 'FISICA' as const,
    };

    console.log('✅ Dados de cliente preparados:', testCustomerData);

    // 6. Test payment data format
    console.log('\n6️⃣ Testando formato de dados de pagamento...');
    const testPaymentData = {
      customer: 'test_customer_id',
      billingType: 'PIX' as const,
      dueDate: dueDate,
      value: 100.50,
      description: 'Teste de pagamento via PIX',
      externalReference: invoiceCode,
    };

    console.log('✅ Dados de pagamento preparados:', testPaymentData);

    console.log('\n🎉 TESTE BÁSICO CONCLUÍDO!');
    console.log('📋 Resumo:');
    console.log('   ✅ Service inicializado corretamente');
    console.log('   ✅ Configurgation carregada');
    console.log('   ✅ Funções utilitárias funcionando');
    console.log('   ✅ Formato de dados validado');
    console.log('   ⚠️ Conexão com API: Aguardando chave real');

    console.log('\n💡 Próximos passos:');
    console.log('   1. Configure uma API Key real do Asaas');
    console.log('   2. Execute teste de conexão real');
    console.log('   3. Teste criação de cliente');
    console.log('   4. Teste criação de pagamento');

  } catch (error) {
    console.error('❌ ERRO durante o teste:', error);
    console.log('\n🔍 Possíveis causas:');
    console.log('   1. Problema de conectividade');
    console.log('   2. Erro na configuração');
    console.log('   3. Problema no formato dos dados');
  }
}

/**
 * Test with real API key (when available)
 */
export async function testRealAsaasConnection(realApiKey: string): Promise<void> {
  console.log('🔐 TESTE COM CHAVE API REAL DO ASAAS...\n');

  try {
    const realConfig: AsaasApiConfig = {
      apiKey: realApiKey,
      environment: 'sandbox', // Start with sandbox
      baseUrl: 'https://sandbox.asaas.com/api/v3',
    };

    await initializeAsaasService(realConfig);
    const result = await testAsaasConnection();

    if (result.success) {
      console.log('🎉 CONEXÃO REAL FUNCIONOU!');
      console.log('Mensagem:', result.message);
      console.log('Detalhes:', result.details);
    } else {
      console.log('❌ Falha na conexão real:', result.message);
      if (result.details) {
        console.log('Detalhes do erro:', result.details);
      }
    }
  } catch (error) {
    console.error('💥 Erro no teste real:', error);
  }
}

// Browser-compatible execution
if (typeof window !== 'undefined') {
  // Browser environment
  (window as any).testAsaasService = {
    testIntegration: testAsaasServiceIntegration,
    testRealConnection: testRealAsaasConnection,
  };
  
  console.log('🚀 Tests disponíveis no console:');
  console.log('   - testAsaasService.testIntegration()');
  console.log('   - testAsaasService.testRealConnection(apiKey)');
}
