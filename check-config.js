// Script para verificar configurações do sistema
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://cgystsylstnkgfgbqoel.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNneXN0c3lsc3Rua2dmZ2Jxb2VsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzU2NzQ4NzQsImV4cCI6MjA1MTI1MDg3NH0.8QZ8QZ8QZ8QZ8QZ8QZ8QZ8QZ8QZ8QZ8QZ8QZ8QZ8QZ8';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkConfigurations() {
  console.log('🔍 Verificando configurações do sistema...\n');

  try {
    // Verificar configurações de pagamento
    const { data: paymentConfigs, error: paymentError } = await supabase
      .from('system_config')
      .select('*')
      .eq('category', 'payment')
      .order('key');

    if (paymentError) {
      console.error('❌ Erro ao buscar configurações de pagamento:', paymentError);
      return;
    }

    console.log('📋 Configurações de Pagamento:');
    console.log('================================');
    
    if (paymentConfigs && paymentConfigs.length > 0) {
      paymentConfigs.forEach(config => {
        console.log(`${config.key}: ${config.value} (${config.description})`);
      });
    } else {
      console.log('❌ Nenhuma configuração de pagamento encontrada');
    }

    console.log('\n🔍 Verificando configurações específicas de geração de faturas:');
    console.log('============================================================');

    // Verificar configurações específicas
    const specificKeys = [
      'payment.invoice.generation.fixed.day',
      'payment.invoice.generation.days.advance'
    ];

    for (const key of specificKeys) {
      const { data: config, error } = await supabase
        .from('system_config')
        .select('*')
        .eq('key', key)
        .single();

      if (error) {
        console.log(`❌ ${key}: Não encontrado`);
      } else {
        console.log(`✅ ${key}: ${config.value} (${config.description})`);
      }
    }

  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

checkConfigurations();
