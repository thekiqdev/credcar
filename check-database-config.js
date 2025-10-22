// Script para verificar configurações no banco de dados
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'YOUR_SUPABASE_URL';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY';

if (supabaseUrl === 'YOUR_SUPABASE_URL' || supabaseAnonKey === 'YOUR_SUPABASE_ANON_KEY') {
  console.error("❌ Supabase URL or Anon Key not configured. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your environment.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkDatabaseConfig() {
  console.log("🔍 Verificando configurações no banco de dados...");
  
  try {
    // Buscar configurações de pagamento
    const { data: configs, error } = await supabase
      .from('system_config')
      .select('key, value, description')
      .in('key', [
        'payment.invoice.generation.fixed.day',
        'payment.invoice.generation.days.advance'
      ]);
    
    if (error) {
      console.error("❌ Erro ao buscar configurações:", error);
      return;
    }
    
    console.log("\n📋 Configurações encontradas:");
    if (configs && configs.length > 0) {
      configs.forEach(config => {
        console.log(`   ${config.key}: ${config.value} (${config.description})`);
      });
    } else {
      console.log("   Nenhuma configuração encontrada!");
    }
    
    // Buscar todas as configurações de pagamento
    console.log("\n📋 Todas as configurações de pagamento:");
    const { data: allConfigs, error: allError } = await supabase
      .from('system_config')
      .select('key, value, description')
      .like('key', 'payment.%')
      .order('key');
    
    if (!allError && allConfigs) {
      allConfigs.forEach(config => {
        console.log(`   ${config.key}: ${config.value}`);
      });
    }
    
    // Verificar faturas existentes para debug
    console.log("\n📊 Faturas existentes (últimas 5):");
    const { data: invoices, error: invoiceError } = await supabase
      .from('invoices')
      .select('id, contract_id, installment_number, due_date, next_invoice_date, status')
      .order('id', { ascending: false })
      .limit(5);
    
    if (!invoiceError && invoices) {
      invoices.forEach(invoice => {
        console.log(`   Fatura ${invoice.id}: Contrato ${invoice.contract_id}, Parcela ${invoice.installment_number}`);
        console.log(`     Vencimento: ${invoice.due_date}`);
        console.log(`     Next Invoice Date: ${invoice.next_invoice_date || 'N/A'}`);
        console.log(`     Status: ${invoice.status}`);
      });
    }
    
  } catch (error) {
    console.error("❌ Erro no check:", error);
  }
}

checkDatabaseConfig();
