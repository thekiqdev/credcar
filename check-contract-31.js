// Verificar faturas do contrato 31
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://cgystsylstnkgfgbqoel.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNneXN0c3lsc3Rua2dmZ2Jxb2VsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMzMDMyNDYsImV4cCI6MjA2ODg3OTI0Nn0.IcY6tymXTxsuQGk7xHJWMkgtoP808i0sPTWLLTb6jPI';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkContract31() {
  console.log('🔍 VERIFICANDO CONTRATO ID: 31');
  
  const { data: invoices, error } = await supabase
    .from('invoices')
    .select('id, invoice_code, value, status, installment_number')
    .eq('contract_id', 31)
    .order('installment_number');

  if (error) {
    console.error('❌ Erro:', error);
  } else {
    console.log(`✅ Faturas encontradas: ${invoices.length}`);
    if (invoices.length > 0) {
      console.log('   Faturas:');
      invoices.forEach(invoice => {
        console.log(`     ${invoice.installment_number}ª: ${invoice.invoice_code} - R$ ${invoice.value.toLocaleString('pt-BR')} (${invoice.status})`);
      });
    } else {
      console.log('   Nenhuma fatura encontrada - sistema pronto para criar faturas automaticamente');
    }
  }
}

checkContract31();
