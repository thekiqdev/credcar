import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'YOUR_SUPABASE_URL';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY';

if (supabaseUrl === 'YOUR_SUPABASE_URL' || supabaseAnonKey === 'YOUR_SUPABASE_ANON_KEY') {
  console.error("❌ Supabase URL or Anon Key not configured. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your environment.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function debugInvoiceDates() {
  console.log("🔍 Debugando datas de faturas...");
  
  try {
    // 1. Verificar configurações do sistema
    console.log("\n📋 Verificando configurações do sistema:");
    const { data: configs, error: configError } = await supabase
      .from('system_config')
      .select('key, value')
      .in('key', [
        'payment.invoice.generation.fixed.day',
        'payment.invoice.generation.days.advance'
      ]);
    
    if (configError) {
      console.error("❌ Erro ao buscar configurações:", configError);
      return;
    }
    
    let fixedDay = 20;
    let daysAdvance = 15;
    
    if (configs) {
      configs.forEach(config => {
        if (config.key === 'payment.invoice.generation.fixed.day') {
          fixedDay = parseInt(config.value) || 20;
        }
        if (config.key === 'payment.invoice.generation.days.advance') {
          daysAdvance = parseInt(config.value) || 15;
        }
      });
    }
    
    console.log(`   - Dia Fixo de Vencimento: ${fixedDay}`);
    console.log(`   - Dias de Antecedência: ${daysAdvance}`);
    
    // 2. Verificar faturas com next_invoice_date
    console.log("\n📊 Faturas com next_invoice_date:");
    const { data: invoices, error: invoiceError } = await supabase
      .from('invoices')
      .select('id, contract_id, installment_number, due_date, next_invoice_date, status')
      .not('next_invoice_date', 'is', null)
      .order('contract_id, installment_number')
      .limit(10);
    
    if (invoiceError) {
      console.error("❌ Erro ao buscar faturas:", invoiceError);
      return;
    }
    
    if (invoices && invoices.length > 0) {
      invoices.forEach(invoice => {
        console.log(`   - Contrato ${invoice.contract_id}, Parcela ${invoice.installment_number}:`);
        console.log(`     Vencimento: ${invoice.due_date}`);
        console.log(`     Next Invoice Date: ${invoice.next_invoice_date}`);
        console.log(`     Status: ${invoice.status}`);
        
        // Calcular o que deveria ser o next_invoice_date
        const dueDate = new Date(invoice.due_date);
        const nextDueDate = new Date(dueDate);
        nextDueDate.setMonth(nextDueDate.getMonth() + 1);
        nextDueDate.setDate(fixedDay);
        
        const expectedNextInvoiceDate = new Date(nextDueDate);
        expectedNextInvoiceDate.setDate(expectedNextInvoiceDate.getDate() - daysAdvance);
        
        console.log(`     Esperado Next Invoice Date: ${expectedNextInvoiceDate.toISOString().split('T')[0]}`);
        console.log(`     Diferença: ${invoice.next_invoice_date === expectedNextInvoiceDate.toISOString().split('T')[0] ? '✅ Correto' : '❌ Incorreto'}`);
        console.log('');
      });
    } else {
      console.log("   Nenhuma fatura com next_invoice_date encontrada");
    }
    
    // 3. Simular cálculo manual
    console.log("\n🧮 Simulação manual:");
    const today = new Date();
    console.log(`Data atual: ${today.toISOString().split('T')[0]}`);
    
    // Primeira fatura
    const firstDueDate = new Date(today);
    firstDueDate.setDate(firstDueDate.getDate() + 2);
    console.log(`Primeira fatura - Vencimento: ${firstDueDate.toISOString().split('T')[0]}`);
    
    // Segunda fatura
    const secondDueDate = new Date(today);
    secondDueDate.setMonth(secondDueDate.getMonth() + 1);
    secondDueDate.setDate(fixedDay);
    
    const secondGenerationDate = new Date(secondDueDate);
    secondGenerationDate.setDate(secondGenerationDate.getDate() - daysAdvance);
    
    console.log(`Segunda fatura - Vencimento: ${secondDueDate.toISOString().split('T')[0]}`);
    console.log(`Segunda fatura - Geração: ${secondGenerationDate.toISOString().split('T')[0]}`);
    
  } catch (error) {
    console.error("❌ Erro no debug:", error);
  }
}

debugInvoiceDates();
