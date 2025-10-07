// Verificar estrutura da tabela clients
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://cgystsylstnkgfgbqoel.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNneXN0c3lsc3Rua2dmZ2Jxb2VsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMzMDMyNDYsImV4cCI6MjA2ODg3OTI0Nn0.IcY6tymXTxsuQGk7xHJWMkgtoP808i0sPTWLLTb6jPI';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkClientsTable() {
  console.log('🔍 VERIFICANDO ESTRUTURA DA TABELA CLIENTS...');
  
  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .limit(1);

  if (error) {
    console.error('❌ Erro:', error);
  } else {
    console.log('✅ Estrutura da tabela clients:');
    if (data && data.length > 0) {
      Object.keys(data[0]).forEach(key => {
        console.log(`   - ${key}`);
      });
    } else {
      console.log('   Tabela vazia');
    }
  }
}

checkClientsTable();
