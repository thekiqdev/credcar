const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variáveis de ambiente não encontradas');
  console.error('VITE_SUPABASE_URL:', !!supabaseUrl);
  console.error('SUPABASE_SERVICE_ROLE_KEY:', !!supabaseServiceKey);
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyContractProfileMigration() {
  try {
    console.log('🔍 Verificando migração contract_profile...');

    // 1. Verificar se a coluna existe
    const { data: columns, error: columnsError } = await supabase
      .rpc('get_table_columns', { table_name: 'profiles' });

    if (columnsError) {
      console.log('⚠️ Não foi possível verificar colunas via RPC, tentando método alternativo...');
      
      // Método alternativo: tentar fazer um SELECT na coluna
      const { data: testData, error: testError } = await supabase
        .from('profiles')
        .select('contract_profile')
        .limit(1);

      if (testError && testError.code === '42703') {
        console.log('❌ Coluna contract_profile não existe');
        console.log('📝 Aplicando migração...');
        
        // Aplicar migração via SQL direto
        const { error: migrationError } = await supabase
          .rpc('exec_sql', { 
            sql: `
              ALTER TABLE profiles 
              ADD COLUMN contract_profile TEXT;
              
              CREATE INDEX IF NOT EXISTS idx_profiles_contract_profile 
              ON profiles (contract_profile);
              
              COMMENT ON COLUMN profiles.contract_profile 
              IS 'Link para download do contrato do representante';
            `
          });

        if (migrationError) {
          console.error('❌ Erro ao aplicar migração:', migrationError);
          return false;
        }

        console.log('✅ Migração aplicada com sucesso!');
        return true;
      } else if (testError) {
        console.error('❌ Erro ao testar coluna:', testError);
        return false;
      } else {
        console.log('✅ Coluna contract_profile já existe');
        return true;
      }
    }

    // Verificar se contract_profile está na lista de colunas
    const hasContractProfile = columns?.some(col => col.column_name === 'contract_profile');
    
    if (!hasContractProfile) {
      console.log('❌ Coluna contract_profile não encontrada');
      console.log('📝 Aplicando migração...');
      
      const { error: migrationError } = await supabase
        .rpc('exec_sql', { 
          sql: `
            ALTER TABLE profiles 
            ADD COLUMN contract_profile TEXT;
            
            CREATE INDEX IF NOT EXISTS idx_profiles_contract_profile 
            ON profiles (contract_profile);
            
            COMMENT ON COLUMN profiles.contract_profile 
            IS 'Link para download do contrato do representante';
          `
        });

      if (migrationError) {
        console.error('❌ Erro ao aplicar migração:', migrationError);
        return false;
      }

      console.log('✅ Migração aplicada com sucesso!');
      return true;
    } else {
      console.log('✅ Coluna contract_profile já existe');
      return true;
    }

  } catch (error) {
    console.error('❌ Erro geral:', error);
    return false;
  }
}

// Executar migração
applyContractProfileMigration()
  .then(success => {
    if (success) {
      console.log('🎉 Migração concluída com sucesso!');
      process.exit(0);
    } else {
      console.log('💥 Falha na migração');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('💥 Erro fatal:', error);
    process.exit(1);
  });
