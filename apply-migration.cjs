const { createClient } = require('@supabase/supabase-js');

// Configuração do Supabase (substitua pelas suas credenciais)
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://cgystsylstnkgfgbqoel.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNneXN0c3lsc3Rua2dmZ2Jxb2VsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzM2MjQ4MDAsImV4cCI6MjA0OTIwMDgwMH0.8QZQZQZQZQZQZQZQZQZQZQZQZQZQZQZQZQZQZQZQ';

const supabase = createClient(supabaseUrl, supabaseKey);

async function applyMigration() {
  try {
    console.log('🔄 Aplicando migration de payment tracking...');
    
    // 1. Criar o tipo ENUM se não existir
    const { error: enumError } = await supabase.rpc('exec_sql', {
      sql: `
        DO $$ 
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_status') THEN
                CREATE TYPE payment_status AS ENUM ('Não Pago', 'Pago');
            END IF;
        END $$;
      `
    });
    
    if (enumError) {
      console.log('⚠️ Tipo ENUM já existe ou erro:', enumError.message);
    } else {
      console.log('✅ Tipo ENUM payment_status criado');
    }
    
    // 2. Adicionar colunas
    const { error: alterError } = await supabase.rpc('exec_sql', {
      sql: `
        ALTER TABLE withdrawal_requests
        ADD COLUMN IF NOT EXISTS payment_status payment_status DEFAULT 'Não Pago',
        ADD COLUMN IF NOT EXISTS payment_date TIMESTAMP WITH TIME ZONE;
      `
    });
    
    if (alterError) {
      console.log('⚠️ Colunas já existem ou erro:', alterError.message);
    } else {
      console.log('✅ Colunas payment_status e payment_date adicionadas');
    }
    
    // 3. Criar índices
    const { error: indexError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_payment_status 
        ON withdrawal_requests (payment_status);
        
        CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_payment_date 
        ON withdrawal_requests (payment_date);
      `
    });
    
    if (indexError) {
      console.log('⚠️ Índices já existem ou erro:', indexError.message);
    } else {
      console.log('✅ Índices criados');
    }
    
    // 4. Verificar se as colunas foram criadas
    const { data, error: verifyError } = await supabase
      .from('withdrawal_requests')
      .select('payment_status, payment_date')
      .limit(1);
    
    if (verifyError) {
      console.log('❌ Erro ao verificar colunas:', verifyError.message);
    } else {
      console.log('✅ Migration aplicada com sucesso!');
      console.log('📊 Colunas verificadas:', data);
    }
    
  } catch (error) {
    console.error('❌ Erro ao aplicar migration:', error);
  }
}

applyMigration();
