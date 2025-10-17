import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Script para migrar documentos de sócios das pastas raiz para as pastas específicas de cada sócio
 * 
 * Estrutura atual (incorreta):
 * documentos/44444444444444/socio/tipo_documento/
 * 
 * Estrutura correta:
 * documentos/44444444444444/socio/cpf_socio/tipo_documento/
 */

const baseDir = path.join(__dirname, 'documentos', '44444444444444', 'socio');

// Mapeamento de tipos de documentos para sócios
const socioDocTypes = [
  'cartilha_credenciamento_pf',
  'comprovante_endereco_socio',
  'certidao_antecedentes_criminais',
  'certidao_negativa_civel_1grau',
  'certidao_negativa_criminal_1grau',
  'foto_identidade_frente',
  'foto_identidade_verso'
];

// CPFs dos sócios conhecidos
const partnerCpfs = ['1234567811', '42813102811'];

function migrateDocuments() {
  console.log('🔄 Iniciando migração completa de documentos de sócios...');
  console.log('📂 Diretório base:', baseDir);
  
  let totalMoved = 0;
  let totalErrors = 0;
  
  // Verificar se o diretório base existe
  if (!fs.existsSync(baseDir)) {
    console.error('❌ Diretório base não encontrado:', baseDir);
    return;
  }
  
  // Listar todos os itens no diretório socio
  const socioItems = fs.readdirSync(baseDir);
  console.log('📁 Itens encontrados no diretório socio:', socioItems);
  
  // Para cada tipo de documento
  socioDocTypes.forEach(docType => {
    const docTypePath = path.join(baseDir, docType);
    
    // Verificar se existe pasta do tipo de documento na raiz
    if (fs.existsSync(docTypePath) && fs.statSync(docTypePath).isDirectory()) {
      console.log(`\n📁 Processando tipo de documento: ${docType}`);
      
      // Listar arquivos na pasta do tipo de documento
      const files = fs.readdirSync(docTypePath);
      console.log(`📄 Encontrados ${files.length} arquivos em ${docType}`);
      
      files.forEach(file => {
        const sourcePath = path.join(docTypePath, file);
        
        // Verificar se é um arquivo (não diretório)
        if (fs.statSync(sourcePath).isFile()) {
          console.log(`\n📄 Processando arquivo: ${file}`);
          
          // Tentar determinar qual sócio pertence este arquivo
          // Por enquanto, vamos mover para o primeiro sócio disponível
          // Em um cenário real, você precisaria de uma lógica mais sofisticada
          const targetPartnerCpf = partnerCpfs[0]; // Usar primeiro sócio como padrão
          const targetDir = path.join(baseDir, targetPartnerCpf, docType);
          const targetPath = path.join(targetDir, file);
          
          try {
            // Criar diretório de destino se não existir
            if (!fs.existsSync(targetDir)) {
              fs.mkdirSync(targetDir, { recursive: true });
              console.log(`✅ Criado diretório: ${targetDir}`);
            }
            
            // Verificar se arquivo já existe no destino
            if (fs.existsSync(targetPath)) {
              console.log(`⚠️ Arquivo já existe no destino: ${targetPath}`);
              // Adicionar timestamp para evitar conflito
              const timestamp = Date.now();
              const ext = path.extname(file);
              const name = path.basename(file, ext);
              const newFileName = `${name}_migrated_${timestamp}${ext}`;
              const newTargetPath = path.join(targetDir, newFileName);
              
              fs.copyFileSync(sourcePath, newTargetPath);
              console.log(`✅ Arquivo copiado como: ${newFileName}`);
            } else {
              // Mover arquivo
              fs.copyFileSync(sourcePath, targetPath);
              console.log(`✅ Arquivo movido para: ${targetPath}`);
            }
            
            // Remover arquivo original
            fs.unlinkSync(sourcePath);
            console.log(`🗑️ Arquivo original removido: ${sourcePath}`);
            
            totalMoved++;
            
          } catch (error) {
            console.error(`❌ Erro ao mover arquivo ${file}:`, error.message);
            totalErrors++;
          }
        }
      });
      
      // Verificar se a pasta do tipo de documento está vazia e removê-la
      try {
        const remainingFiles = fs.readdirSync(docTypePath);
        if (remainingFiles.length === 0) {
          fs.rmdirSync(docTypePath);
          console.log(`🗑️ Pasta vazia removida: ${docTypePath}`);
        }
      } catch (error) {
        console.error(`❌ Erro ao remover pasta vazia ${docTypePath}:`, error.message);
      }
    }
  });
  
  // Verificar se há outras pastas que não são de sócios específicos
  const remainingItems = fs.readdirSync(baseDir);
  const nonPartnerFolders = remainingItems.filter(item => {
    const itemPath = path.join(baseDir, item);
    return fs.statSync(itemPath).isDirectory() && !partnerCpfs.includes(item);
  });
  
  if (nonPartnerFolders.length > 0) {
    console.log(`\n⚠️ Encontradas ${nonPartnerFolders.length} pastas não relacionadas a sócios:`, nonPartnerFolders);
    console.log('📋 Estas pastas podem conter documentos que precisam ser migrados manualmente.');
  }
  
  console.log('\n📊 Resumo da migração:');
  console.log(`✅ Arquivos movidos: ${totalMoved}`);
  console.log(`❌ Erros: ${totalErrors}`);
  console.log('🎉 Migração concluída!');
  
  // Mostrar estrutura final
  console.log('\n📁 Estrutura final:');
  partnerCpfs.forEach(cpf => {
    const partnerPath = path.join(baseDir, cpf);
    if (fs.existsSync(partnerPath)) {
      console.log(`\n👤 Sócio ${cpf}:`);
      const docTypes = fs.readdirSync(partnerPath);
      docTypes.forEach(docType => {
        const docPath = path.join(partnerPath, docType);
        if (fs.statSync(docPath).isDirectory()) {
          const files = fs.readdirSync(docPath);
          console.log(`  📁 ${docType}: ${files.length} arquivos`);
        }
      });
    }
  });
}

// Executar migração
migrateDocuments();
