import { createClient } from '@supabase/supabase-js';

// Configuração do Supabase
const supabaseUrl = 'https://your-project.supabase.co'; // Substitua pela sua URL
const supabaseKey = 'your-anon-key'; // Substitua pela sua chave

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkPartnerDocuments() {
  try {
    console.log('🔍 Verificando documentos de sócios...');
    
    // Buscar todos os documentos de sócios
    const { data: allDocs, error: allError } = await supabase
      .from('partner_documents')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (allError) {
      console.error('❌ Erro ao buscar documentos:', allError);
      return;
    }
    
    console.log('📋 Total de documentos encontrados:', allDocs?.length || 0);
    
    if (allDocs && allDocs.length > 0) {
      console.log('📄 Documentos encontrados:');
      allDocs.forEach((doc, index) => {
        console.log(`${index + 1}. Partner ID: ${doc.partner_id}`);
        console.log(`   Tipo: ${doc.document_type}`);
        console.log(`   Status: ${doc.status}`);
        console.log(`   URL: ${doc.file_url}`);
        console.log(`   Criado em: ${doc.created_at}`);
        console.log('---');
      });
    } else {
      console.log('⚠️ Nenhum documento encontrado na tabela partner_documents');
    }
    
    // Buscar sócios específicos
    const partnerIds = ['247e6f8d-7c95-4b4e-8b28-9f240b07b49c']; // IDs dos sócios conhecidos
    
    for (const partnerId of partnerIds) {
      console.log(`\n🔍 Verificando documentos do sócio: ${partnerId}`);
      
      const { data: partnerDocs, error: partnerError } = await supabase
        .from('partner_documents')
        .select('*')
        .eq('partner_id', partnerId);
      
      if (partnerError) {
        console.error(`❌ Erro ao buscar documentos do sócio ${partnerId}:`, partnerError);
        continue;
      }
      
      console.log(`📄 Documentos do sócio ${partnerId}:`, partnerDocs?.length || 0);
      
      if (partnerDocs && partnerDocs.length > 0) {
        partnerDocs.forEach((doc, index) => {
          console.log(`  ${index + 1}. ${doc.document_type} - ${doc.status}`);
        });
      }
    }
    
  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

// Executar verificação
checkPartnerDocuments();
