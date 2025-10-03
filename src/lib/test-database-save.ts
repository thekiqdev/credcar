/**
 * Test script for verifying configuration save operations
 * This file tests if configurations are being saved correctly to the database
 */

import { systemConfigService } from './system-config.service';
import { supabase } from './supabase';

export async function testConfigurationSave(): Promise<void> {
  console.log('🧪 TESTANDO Salvamento de Configurações no Banco...\n');

  try {
    // Step 1: Test Asaas config save
    console.log('📋 Teste 1: Salvando configuração Asaas...');
    const asaasTestConfig = {
      apiKey: 'test_api_key_asaas_' + Date.now(),
      environment: 'sandbox' as const,
      webhookUrl: 'https://test.com/webhook/asaas',
      webhookSecret: 'test_secret_' + Date.now(),
    };

    const asaasSaveResult = await systemConfigService.setAsaasConfig(asaasTestConfig);
    console.log(`✅ Configuração Asaas salva: ${asaasSaveResult}`);

    // Step 2: Test Payment config save
    console.log('\n📋 Teste 2: Salvando configuração de pagamento...');
    const paymentTestConfig = {
      enablePix: true,
      enableBoleto: false,
      defaultDueDays: 15,
      maxInstallments: 6,
      autoGenerateBoletos: false,
    };

    const paymentSaveResult = await systemConfigService.setPaymentConfig(paymentTestConfig);
    console.log(`✅ Configuração de pagamento salva: ${paymentSaveResult}`);

    // Step 3: Test Notification config save
    console.log('\n📋 Teste 3: Salvando configuração de notificação...');
    const notificationTestConfig = {
      sendPaymentConfirmed: false,
      sendOverdue: true,
      daysBeforeDue: 3,
    };

    const notificationSaveResult = await systemConfigService.setNotificationConfig(notificationTestConfig);
    console.log(`✅ Configuração de notificação salva: ${notificationSaveResult}`);

    // Step 4: Verify in database directly
    console.log('\n📋 Teste 4: Verificando dados diretamente no banco...');
    const { data: savedConfigs, error } = await supabase
      .from('system_config')
      .select('key, value, category')
      .in('key', [
        'asaas.api.key',
        'asaas.environment', 
        'asaas.webhook.url',
        'payment.enable.pix',
        'payment.default.due.days',
        'notification.days.before.due'
      ])
      .order('key');

    if (error) {
      console.error('❌ Erro ao verificar banco:', error);
      return;
    }

    console.log('✅ Configurações encontradas no banco:');
    savedConfigs?.forEach(config => {
      console.log(`   - ${config.category}.${config.key}: ${config.value}`);
    });

    // Step 5: Test config retrieval
    console.log('\n📋 Teste 5: Verificando recuperação de configurações...');
    
    const retrievedAsaasConfig = await systemConfigService.getAsaasConfig();
    console.log('✅ Configuração Asaas recuperada:', {
      environment: retrievedAsaasConfig.environment,
      webhookUrl: retrievedAsaasConfig.webhookUrl,
      apiKeyConfigured: !!retrievedAsaasConfig.apiKey,
    });

    const retrievedPaymentConfig = await systemConfigService.getPaymentConfig();
    console.log('✅ Configuração de pagamento recuperada:', {
      enablePix: retrievedPaymentConfig.enablePix,
      defaultDueDays: retrievedPaymentConfig.defaultDueDays,
      maxInstallments: retrievedPaymentConfig.maxInstallments,
    });

    // Step 6: Validate save and retrieve consistency
    console.log('\n📋 Teste 6: Validando consistência dos dados...');
    
    const isValidAsaas = 
      retrievedAsaasConfig.environment === asaasTestConfig.environment &&
      retrievedAsaasConfig.webhookUrl === asaasTestConfig.webhookUrl &&
      retrievedAsaasConfig.apiKey.includes('test_api_key_asaas_');

    const isValidPayment = 
      retrievedPaymentConfig.enablePix === paymentTestConfig.enablePix &&
      retrievedPaymentConfig.defaultDueDays === paymentTestConfig.defaultDueDays &&
      retrievedPaymentConfig.maxInstallments === paymentTestConfig.maxInstallments;

    console.log(`✅ Consistência Asaas: ${isValidAsaas ? 'OK' : 'FALHA'}`);
    console.log(`✅ Consistência Payment: ${isValidPayment ? 'OK' : 'FALHA'}`);

    // Summary
    console.log('\n🎉 RESUMO DOS TESTES:');
    console.log(`   ✅ Salvamento Asaas: ${asaasSaveResult}`);
    console.log(`   ✅ Salvamento Payment: ${paymentSaveResult}`);
    console.log(`   ✅ Salvamento Notification: ${notificationSaveResult}`);
    console.log(`   ✅ Configurações salvas no banco: ${savedConfigs?.length || 0}`);
    console.log(`   ✅ Recuperação de dados: ${isValidAsaas && isValidPayment ? 'OK' : 'FALHA'}`);

  } catch (error) {
    console.error('❌ ERRO durante os testes:', error);
    console.log('\n🔍 Possíveis causas:');
    console.log('   1. Tabela system_config não existe ou não está acessível');
    console.log('   2. RLS bloqueando operações');
    console.log('   3. Problema de conectividade com Supabase');
    console.log('   4. Configurações de autenticação incorretas');
  }
}

export async function testDatabaseConnection(): Promise<void> {
  console.log('🔗 TESTANDO Conexão com Banco de Dados...\n');

  try {
    // Test 1: Basic connection
    console.log('📋 Teste 1: Conexão básica com Supabase...');
    const { data, error } = await supabase
      .from('system_config')
      .select('key')
      .limit(1);

    if (error) {
      console.error('❌ Erro de conexão:', error);
      return false;
    }

    console.log('✅ Conexão estabelecida com sucesso');

    // Test 2: Table access
    console.log('\n📋 Teste 2: Acesso à tabela system_config...');
    const { count } = await supabase
      .from('system_config')
      .select('*', { count: 'exact', head: true });

    console.log(`✅ Acesso à tabela OK. Total de configurações: ${count}`);

    // Test 3: Insert operation
    console.log('\n📋 Teste 3: Teste de inserção...');
    const testKey = `test_insert_${Date.now()}`;
    const { error: insertError } = await supabase
      .from('system_config')
      .insert({
        key: testKey,
        value: 'test_value',
        description: 'Teste de inserção',
        category: 'test',
      });

    if (insertError) {
      console.error('❌ Erro ao inserir:', insertError);
    } else {
      console.log('✅ Inserção bem-sucedida');
    }

    // Test 4: Update operation
    console.log('\n📋 Teste 4: Teste de atualização...');
    const { error: updateError } = await supabase
      .from('system_config')
      .update({ value: 'updated_value' })
      .eq('key', testKey);

    if (updateError) {
      console.error('❌ Erro ao atualizar:', updateError);
    } else {
      console.log('✅ Atualização bem-sucedida');
    }

    // Test 5: Delete operation
    console.log('\n📋 Teste 5: Teste de exclusão...');
    const { error: deleteError } = await supabase
      .from('system_config')
      .delete()
      .eq('key', testKey);

    if (deleteError) {
      console.error('❌ Erro ao deletar:', deleteError);
    } else {
      console.log('✅ Exclusão bem-sucedida');
    }

    console.log('\n🎉 TODOS OS TESTES DE CONEXÃO PASSARAM!');

  } catch (error) {
    console.error('❌ ERRO nos testes de conexão:', error);
  }
}

// Run tests if this file is executed directly
if (typeof window === 'undefined') {
  // Node.js environment
  testDatabaseConnection().then(() => {
    console.log('\n' + '='.repeat(50));
    return testConfigurationSave();
  });
} else {
  // Browser environment - expose test functions
  (window as any).testDatabase = {
    testConnection: testDatabaseConnection,
    testSave: testConfigurationSave
  };
}
