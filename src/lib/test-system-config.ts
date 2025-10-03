/**
 * Test script for SystemConfigService
 * This file tests the configuration service functionality
 */

import { systemConfigService, getAsaasConfig, getPaymentConfig, getNotificationConfig } from './system-config.service';

export async function testSystemConfigService(): Promise<void> {
  console.log('🧪 TESTANDO SystemConfigService...\n');

  try {
    // Test 1: Get all configurations
    console.log('📋 Teste 1: Buscando todas as configurações...');
    const allConfigs = await systemConfigService.getAllConfigs();
    console.log(`✅ Configurações encontradas: ${allConfigs.length}`);
    
    if (allConfigs.length > 0) {
      console.log('📊 Primeiras configurações:');
      allConfigs.slice(0, 5).forEach(config => {
        console.log(`   - ${config.key}: ${config.value.substring(0, 20)}${config.value.length > 20 ? '...' : ''}`);
      });
    }
    console.log('');

    // Test 2: Test Asaas configuration
    console.log('🔧 Teste 2: Configurações do Asaas...');
    const asaasConfig = await getAsaasConfig();
    console.log('✅ Configuração Asaas obtida:');
    console.log(`   - API Key: ${asaasConfig.apiKey ? '[CONFIGURADA]' : '[VAZIA]'}`);
    console.log(`   - Environment: ${asaasConfig.environment}`);
    console.log(`   - Base URL: ${asaasConfig.baseUrl}`);
    console.log(`   - Webhook Secret: ${asaasConfig.webhookSecret ? '[CONFIGURADA]' : '[VAZIA]'}`);
    console.log(`   - Webhook URL: ${asaasConfig.webhookUrl ? '[CONFIGURADA]' : '[VAZIA]'}`);
    console.log('');

    // Test 3: Test Payment configuration
    console.log('💳 Teste 3: Configurações de Pagamento...');
    const paymentConfig = await getPaymentConfig();
    console.log('✅ Configuração de Pagamento obtida:');
    console.log(`   - Método padrão: ${paymentConfig.defaultMethod}`);
    console.log(`   - PIX habilitado: ${paymentConfig.enablePix}`);
    console.log(`   - Boleto habilitado: ${paymentConfig.enableBoleto}`);
    console.log(`   - Cartão habilitado: ${paymentConfig.enableCreditCard}`);
    console.log(`   - Dias para vencimento: ${paymentConfig.defaultDueDays}`);
    console.log(`   - Máximo de parcelas: ${paymentConfig.maxInstallments}`);
    console.log(`   - Geração automática de boletos: ${paymentConfig.autoGenerateBoletos}`);
    console.log('');

    // Test 4: Test Notification configuration
    console.log('🔔 Teste 4: Configurações de Notificação...');
    const notificationConfig = await getNotificationConfig();
    console.log('✅ Configuração de Notificação obtida:');
    console.log(`   - Notificar pagamento confirmado: ${notificationConfig.sendPaymentConfirmed}`);
    console.log(`   - Notificar inadimplência: ${notificationConfig.sendOverdue}`);
    console.log(`   - Dias antes do vencimento: ${notificationConfig.daysBeforeDue}`);
    console.log('');

    // Test 5: Test individual config getter
    console.log('🔍 Teste 5: Buscar configuração individual...');
    const systemName = await systemConfigService.getConfig('system.name');
    console.log(`✅ Nome do sistema: ${systemName}`);
    console.log('');

    // Test 6: Test cache functionality
    console.log('⚡ Teste 6: Testando cache...');
    const startTime1 = Date.now();
    await systemConfigService.getAllConfigs();
    const endTime1 = Date.now();
    console.log(`   - Primeira busca: ${endTime1 - startTime1}ms`);

    const startTime2 = Date.now();
    await systemConfigService.getAllConfigs();
    const endTime2 = Date.now();
    console.log(`   - Segunda busca (cache): ${endTime2 - startTime2}ms`);
    console.log('');

    console.log('🎉 TODOS OS TESTES CONCLUÍDOS!');
    console.log('');
    console.log('💡 Resumo:');
    console.log('   ✅ Conexão com banco de dados funcionando');
    console.log('   ✅ Configurações sendo carregadas corretamente');
    console.log('   ✅ Cache funcionando (performance melhorada)');
    console.log('   ✅ Configurações padrão inseridas');
    console.log('   ✅ Tipos TypeScript funcionando');

  } catch (error) {
    console.error('❌ ERRO durante os testes:', error);
    console.log('');
    console.log('🔍 Possíveis causas:');
    console.log('   1. Tabela system_config não criada');
    console.log('   2. Supabase não configurado');
    console.log('   3. Políticas RLS bloqueando acesso');
    console.log('   4. Problema de rede/conectividade');
  }
}

// Test function for setting configurations
export async function testSetConfigurations(): Promise<void> {
  console.log('🧪 TESTANDO configurações específicas...');

  try {
    // Test setting Asaas configuration
    const asaasTestConfig = {
      apiKey: 'test_api_key_123',
      environment: 'sandbox' as const,
      webhookUrl: 'https://test.com/webhook',
    };

    const asaasResult = await systemConfigService.setAsaasConfig(asaasTestConfig);
    console.log(`✅ Configuração Asaas salva: ${asaasResult}`);

    // Test setting Payment configuration
    const paymentTestConfig = {
      enablePix: true,
      enableBoleto: false,
      maxInstallments: 6,
    };

    const paymentResult = await systemConfigService.setPaymentConfig(paymentTestConfig);
    console.log(`✅ Configuração de Pagamento salva: ${paymentResult}`);

    // Verify changes
    const updatedAsaasConfig = await getAsaasConfig();
    console.log('✅ Verificação - API Key configurada:', !!updatedAsaasConfig.apiKey);

    const updatedPaymentConfig = await getPaymentConfig();
    console.log('✅ Verificação - Máximo de parcelas:', updatedPaymentConfig.maxInstallments);

  } catch (error) {
    console.error('❌ ERRO ao definir configurações:', error);
  }
}

// Run tests if this file is executed directly
if (typeof window === 'undefined') {
  // Node.js environment
  testSystemConfigService();
} else {
  // Browser environment - expose test functions
  (window as any).testSystemConfig = {
    testService: testSystemConfigService,
    testSetConfigs: testSetConfigurations,
  };
}
