import { createClient } from '@supabase/supabase-js';
import { systemConfigService } from './src/lib/system-config.service.ts';

// Initialize Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'YOUR_SUPABASE_URL';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY';

if (supabaseUrl === 'YOUR_SUPABASE_URL' || supabaseAnonKey === 'YOUR_SUPABASE_ANON_KEY') {
  console.error("❌ Supabase URL or Anon Key not configured. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your environment.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testInvoiceDateCalculation() {
  console.log("🔍 Testando cálculo de datas de faturas...");
  
  try {
    // 1. Verificar configurações atuais
    const paymentConfig = await systemConfigService.getPaymentConfig();
    console.log("📋 Configurações atuais:");
    console.log(`   - Dia Fixo de Vencimento: ${paymentConfig.invoiceGenerationFixedDay}`);
    console.log(`   - Dias de Antecedência: ${paymentConfig.invoiceGenerationDaysAdvance}`);
    
    // 2. Simular cálculo para diferentes parcelas
    const today = new Date();
    console.log(`\n📅 Data atual: ${today.toISOString().split('T')[0]}`);
    
    // Simular cálculo para primeira fatura
    console.log("\n🔢 Primeira fatura (parcela 1):");
    const firstDueDate = new Date(today);
    firstDueDate.setDate(firstDueDate.getDate() + 2);
    console.log(`   - Vencimento: ${firstDueDate.toISOString().split('T')[0]} (2 dias)`);
    console.log(`   - Geração: ${today.toISOString().split('T')[0]} (imediata)`);
    
    // Simular cálculo para segunda fatura
    console.log("\n🔢 Segunda fatura (parcela 2):");
    const secondDueDate = new Date(today);
    secondDueDate.setMonth(secondDueDate.getMonth() + 1);
    secondDueDate.setDate(paymentConfig.invoiceGenerationFixedDay);
    
    const secondGenerationDate = new Date(secondDueDate);
    secondGenerationDate.setDate(secondGenerationDate.getDate() - paymentConfig.invoiceGenerationDaysAdvance);
    
    console.log(`   - Vencimento: ${secondDueDate.toISOString().split('T')[0]} (dia ${paymentConfig.invoiceGenerationFixedDay})`);
    console.log(`   - Geração: ${secondGenerationDate.toISOString().split('T')[0]} (${paymentConfig.invoiceGenerationDaysAdvance} dias antes)`);
    
    // 3. Verificar faturas existentes
    console.log("\n📊 Faturas existentes:");
    const { data: invoices, error } = await supabase
      .from('invoices')
      .select('id, contract_id, installment_number, due_date, next_invoice_date, status')
      .order('contract_id, installment_number')
      .limit(10);
    
    if (error) {
      console.error("❌ Erro ao buscar faturas:", error);
      return;
    }
    
    if (invoices && invoices.length > 0) {
      invoices.forEach(invoice => {
        console.log(`   - Contrato ${invoice.contract_id}, Parcela ${invoice.installment_number}:`);
        console.log(`     Vencimento: ${invoice.due_date}`);
        console.log(`     Next Invoice Date: ${invoice.next_invoice_date || 'N/A'}`);
        console.log(`     Status: ${invoice.status}`);
      });
    } else {
      console.log("   Nenhuma fatura encontrada");
    }
    
  } catch (error) {
    console.error("❌ Erro no teste:", error);
  }
}

testInvoiceDateCalculation();
