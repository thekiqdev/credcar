/**
 * Script de Limpeza de Arquivos Antigos
 * 
 * Este script:
 * 1. Busca registros duplicados no banco
 * 2. Identifica arquivos antigos que podem ser deletados
 * 3. Move arquivos para pasta de backup antes de deletar
 * 4. Deleta arquivos físicos obsoletos
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Configuração do Supabase
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://cgystsylstnkgfgbqoel.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNneXN0c3lsc3Rua2dmZ2Jxb2VsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjgzMjI0MzgsImV4cCI6MjA0Mzg5ODQzOH0.aAsjke_DEqMfKTMt8pjVE1lN9VCNaHt5PnQCnWa15pM';
const supabase = createClient(supabaseUrl, supabaseKey);

// Configurações
const DRY_RUN = true; // true = apenas simula, false = executa de verdade
const BASE_DIR = path.join(__dirname, 'documentos');
const BACKUP_DIR = path.join(__dirname, 'documentos_backup_deleted');

// Cores para console
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

/**
 * Buscar registros duplicados no banco
 */
async function findDuplicateDocuments() {
  try {
    log('\n📋 Buscando registros duplicados no banco...', 'cyan');
    
    // Buscar todos os documentos
    const { data: allDocs, error } = await supabase
      .from('representative_documents')
      .select('*')
      .order('representative_id, document_type, uploaded_at');

    if (error) {
      throw error;
    }

    // Agrupar por representative_id + document_type
    const grouped = {};
    allDocs.forEach(doc => {
      const key = `${doc.representative_id}_${doc.document_type}`;
      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(doc);
    });

    // Filtrar apenas grupos com duplicatas
    const duplicates = Object.entries(grouped)
      .filter(([_, docs]) => docs.length > 1)
      .map(([key, docs]) => {
        // Ordenar por data decrescente
        docs.sort((a, b) => new Date(b.uploaded_at) - new Date(a.uploaded_at));
        return {
          key,
          representative_id: docs[0].representative_id,
          document_type: docs[0].document_type,
          total: docs.length,
          newest: docs[0],
          oldOnes: docs.slice(1)
        };
      });

    log(`✅ Encontrados ${duplicates.length} conjuntos de documentos duplicados`, 'green');
    log(`📊 Total de registros duplicados: ${duplicates.reduce((sum, d) => sum + d.oldOnes.length, 0)}`, 'yellow');

    return duplicates;

  } catch (error) {
    log(`❌ Erro ao buscar duplicatas: ${error.message}`, 'red');
    throw error;
  }
}

/**
 * Criar pasta de backup se não existir
 */
function ensureBackupDir() {
  if (!fs.existsSync(BACKUP_DIR)) {
    log(`📁 Criando pasta de backup: ${BACKUP_DIR}`, 'cyan');
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }
}

/**
 * Mover arquivo para backup
 */
function moveToBackup(filePath) {
  const fullPath = path.join(BASE_DIR, filePath);
  
  if (!fs.existsSync(fullPath)) {
    log(`⚠️  Arquivo não existe: ${filePath}`, 'yellow');
    return false;
  }

  const backupPath = path.join(BACKUP_DIR, filePath);
  const backupDirPath = path.dirname(backupPath);

  // Criar diretório de backup se não existir
  if (!fs.existsSync(backupDirPath)) {
    fs.mkdirSync(backupDirPath, { recursive: true });
  }

  if (DRY_RUN) {
    log(`   [DRY RUN] Moveria: ${filePath} -> backup/`, 'yellow');
    return true;
  }

  try {
    fs.renameSync(fullPath, backupPath);
    log(`   ✅ Movido para backup: ${filePath}`, 'green');
    return true;
  } catch (error) {
    log(`   ❌ Erro ao mover arquivo: ${error.message}`, 'red');
    return false;
  }
}

/**
 * Deletar arquivo físico
 */
function deleteFile(filePath) {
  const fullPath = path.join(BASE_DIR, filePath);
  
  if (!fs.existsSync(fullPath)) {
    log(`⚠️  Arquivo não existe: ${filePath}`, 'yellow');
    return false;
  }

  if (DRY_RUN) {
    log(`   [DRY RUN] Deletaria: ${filePath}`, 'yellow');
    return true;
  }

  try {
    fs.unlinkSync(fullPath);
    log(`   ✅ Deletado: ${filePath}`, 'green');
    return true;
  } catch (error) {
    log(`   ❌ Erro ao deletar arquivo: ${error.message}`, 'red');
    return false;
  }
}

/**
 * Processar documentos duplicados
 */
async function processDocuments(duplicates) {
  log('\n🔄 Processando documentos duplicados...', 'cyan');
  
  ensureBackupDir();

  let stats = {
    totalProcessed: 0,
    filesMovedToBackup: 0,
    filesDeleted: 0,
    emptyRecords: 0,
    errors: 0
  };

  for (const duplicate of duplicates) {
    log(`\n📄 Documento: ${duplicate.document_type}`, 'blue');
    log(`   Representative: ${duplicate.representative_id}`, 'blue');
    log(`   Total de registros: ${duplicate.total}`, 'blue');
    log(`   Mantendo: ID ${duplicate.newest.id} (${duplicate.newest.uploaded_at})`, 'green');
    log(`   Removendo ${duplicate.oldOnes.length} registro(s) antigo(s):`, 'yellow');

    for (const oldDoc of duplicate.oldOnes) {
      stats.totalProcessed++;
      
      log(`\n   🗑️  ID: ${oldDoc.id}`, 'yellow');
      log(`      Data: ${oldDoc.uploaded_at}`, 'yellow');
      log(`      File URL: ${oldDoc.file_url || '(vazio)'}`, 'yellow');

      if (oldDoc.file_url && oldDoc.file_url.trim() !== '') {
        // Arquivo existe, mover para backup
        if (moveToBackup(oldDoc.file_url)) {
          stats.filesMovedToBackup++;
        } else {
          stats.errors++;
        }
      } else {
        // Registro sem arquivo
        stats.emptyRecords++;
        log(`      ℹ️  Registro sem arquivo associado`, 'cyan');
      }
    }
  }

  return stats;
}

/**
 * Exibir resumo
 */
function displaySummary(stats) {
  log('\n' + '='.repeat(60), 'cyan');
  log('📊 RESUMO DA LIMPEZA', 'cyan');
  log('='.repeat(60), 'cyan');
  log(`Total de registros processados: ${stats.totalProcessed}`, 'blue');
  log(`Arquivos movidos para backup: ${stats.filesMovedToBackup}`, 'green');
  log(`Registros sem arquivo: ${stats.emptyRecords}`, 'yellow');
  log(`Erros: ${stats.errors}`, stats.errors > 0 ? 'red' : 'green');
  log('='.repeat(60), 'cyan');

  if (DRY_RUN) {
    log('\n⚠️  MODO DRY RUN ATIVO', 'yellow');
    log('Nenhuma alteração foi feita!', 'yellow');
    log('Para executar de verdade, altere DRY_RUN = false no script', 'yellow');
  } else {
    log('\n✅ LIMPEZA CONCLUÍDA!', 'green');
    log(`📁 Arquivos de backup em: ${BACKUP_DIR}`, 'cyan');
  }
}

/**
 * Função principal
 */
async function main() {
  try {
    log('\n' + '='.repeat(60), 'cyan');
    log('🧹 SCRIPT DE LIMPEZA DE ARQUIVOS ANTIGOS', 'cyan');
    log('='.repeat(60), 'cyan');
    log(`Modo: ${DRY_RUN ? 'DRY RUN (simulação)' : 'EXECUÇÃO REAL'}`, DRY_RUN ? 'yellow' : 'red');
    log(`Diretório base: ${BASE_DIR}`, 'cyan');
    log(`Diretório backup: ${BACKUP_DIR}`, 'cyan');
    log('='.repeat(60), 'cyan');

    // Buscar duplicatas
    const duplicates = await findDuplicateDocuments();

    if (duplicates.length === 0) {
      log('\n✅ Nenhum documento duplicado encontrado!', 'green');
      return;
    }

    // Processar documentos
    const stats = await processDocuments(duplicates);

    // Exibir resumo
    displaySummary(stats);

    log('\n💡 PRÓXIMOS PASSOS:', 'cyan');
    log('1. Revise os arquivos movidos para backup', 'blue');
    log('2. Execute o script SQL para deletar registros do banco', 'blue');
    log('3. Se tudo estiver OK, delete a pasta de backup manualmente', 'blue');

  } catch (error) {
    log(`\n❌ Erro fatal: ${error.message}`, 'red');
    console.error(error);
    process.exit(1);
  }
}

// Executar
main();

