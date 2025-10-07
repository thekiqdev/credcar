/**
 * Script para testar upload de arquivos vazios
 * Verifica se o servidor está rejeitando arquivos vazios corretamente
 */

const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
const FormData = require('form-data');

// Criar arquivo de teste vazio
const emptyFilePath = path.join(__dirname, 'test-empty-file.pdf');
fs.writeFileSync(emptyFilePath, ''); // Arquivo vazio

// Criar arquivo de teste muito pequeno
const smallFilePath = path.join(__dirname, 'test-small-file.pdf');
fs.writeFileSync(smallFilePath, 'a'); // Arquivo com apenas 1 byte

// Criar arquivo de teste válido
const validFilePath = path.join(__dirname, 'test-valid-file.pdf');
fs.writeFileSync(validFilePath, 'Teste de arquivo válido com conteúdo suficiente para passar na validação de tamanho mínimo.');

console.log('🧪 Testando upload de arquivos...');

async function testUpload(filePath, fileName, description) {
  try {
    const form = new FormData();
    
    form.append('file', fs.createReadStream(filePath), {
      filename: fileName,
      contentType: 'application/pdf'
    });
    form.append('cpfCnpj', '12345678901');
    form.append('documentType', 'cartilha de credenciamento preenchida');

    const response = await fetch('http://localhost:3001/api/upload-document', {
      method: 'POST',
      body: form,
      headers: form.getHeaders()
    });

    const result = await response.json();
    
    console.log(`\n📋 ${description}:`);
    console.log(`   Status: ${response.status}`);
    console.log(`   Success: ${result.success}`);
    console.log(`   Message: ${result.message}`);
    
    if (result.error) {
      console.log(`   Error: ${result.error}`);
    }
    
    if (result.data) {
      console.log(`   File Path: ${result.data.filePath}`);
      console.log(`   File Size: ${result.data.size} bytes`);
    }

    return {
      success: result.success,
      status: response.status,
      error: result.error
    };

  } catch (error) {
    console.error(`❌ Erro no teste ${description}:`, error.message);
    return {
      success: false,
      status: 500,
      error: error.message
    };
  }
}

async function runTests() {
  console.log('🚀 Iniciando testes de validação de arquivos...\n');

  // Teste 1: Arquivo vazio
  const test1 = await testUpload(emptyFilePath, 'empty-file.pdf', 'Arquivo Vazio (0 bytes)');
  
  // Teste 2: Arquivo muito pequeno
  const test2 = await testUpload(smallFilePath, 'small-file.pdf', 'Arquivo Muito Pequeno (1 byte)');
  
  // Teste 3: Arquivo válido
  const test3 = await testUpload(validFilePath, 'valid-file.pdf', 'Arquivo Válido');

  console.log('\n📊 RESUMO DOS TESTES:');
  console.log('='.repeat(50));
  console.log(`Arquivo Vazio: ${test1.success ? '❌ ACEITO (PROBLEMA!)' : '✅ REJEITADO (CORRETO)'}`);
  console.log(`Arquivo Pequeno: ${test2.success ? '❌ ACEITO (PROBLEMA!)' : '✅ REJEITADO (CORRETO)'}`);
  console.log(`Arquivo Válido: ${test3.success ? '✅ ACEITO (CORRETO)' : '❌ REJEITADO (PROBLEMA!)'}`);

  // Limpeza
  try {
    fs.unlinkSync(emptyFilePath);
    fs.unlinkSync(smallFilePath);
    fs.unlinkSync(validFilePath);
    console.log('\n🧹 Arquivos de teste removidos');
  } catch (error) {
    console.log('\n⚠️ Erro ao remover arquivos de teste:', error.message);
  }

  console.log('\n✅ Testes concluídos!');
}

// Executar testes
runTests().catch(console.error);
