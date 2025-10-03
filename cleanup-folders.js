import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Mapear nomes incorretos para corretos
const folderNameMap = {
  'cart_o_do_cnpj_cpf': 'cartao_cnpj_cpf',
  'certid_o_de_antecedente_criminal': 'certidao_antecedente_criminal',
  'certid_o_negativa_civil': 'certidao_negativa_civil',
  'comprovante_de_endere_o': 'comprovante_endereco'
};

function cleanUpFolders() {
  const documentosDir = path.join(__dirname, 'documentos');
  
  if (!fs.existsSync(documentosDir)) {
    console.log('❌ Diretório documentos não encontrado');
    return;
  }

  console.log('🧹 Iniciando limpeza de pastas com nomes incorretos...');

  // Percorrer todas as pastas de CPF/CNPJ
  const cpfFolders = fs.readdirSync(documentosDir);
  
  cpfFolders.forEach(cpfFolder => {
    const cpfPath = path.join(documentosDir, cpfFolder);
    
    if (fs.statSync(cpfPath).isDirectory()) {
      console.log(`\n📁 Processando pasta: ${cpfFolder}`);
      
      // Ler pastas de documentos
      const docFolders = fs.readdirSync(cpfPath);
      
      docFolders.forEach(docFolder => {
        const docPath = path.join(cpfPath, docFolder);
        
        if (fs.statSync(docPath).isDirectory()) {
          const correctName = folderNameMap[docFolder];
          
          if (correctName) {
            const correctPath = path.join(cpfPath, correctName);
            
            console.log(`  🔄 Renomeando: ${docFolder} → ${correctName}`);
            
            try {
              // Se a pasta correta já existe, mover arquivos
              if (fs.existsSync(correctPath)) {
                console.log(`    📁 Pasta ${correctName} já existe, movendo arquivos...`);
                const files = fs.readdirSync(docPath);
                files.forEach(file => {
                  const oldFile = path.join(docPath, file);
                  const newFile = path.join(correctPath, file);
                  fs.renameSync(oldFile, newFile);
                  console.log(`      📄 Movido: ${file}`);
                });
                // Remover pasta vazia
                fs.rmdirSync(docPath);
                console.log(`    🗑️ Removida pasta vazia: ${docFolder}`);
              } else {
                // Renomear pasta
                fs.renameSync(docPath, correctPath);
                console.log(`    ✅ Pasta renomeada com sucesso`);
              }
            } catch (error) {
              console.error(`    ❌ Erro ao renomear ${docFolder}:`, error.message);
            }
          } else {
            console.log(`  ✅ Nome correto: ${docFolder}`);
          }
        }
      });
    }
  });

  console.log('\n🎉 Limpeza concluída!');
}

// Executar limpeza
cleanUpFolders();

