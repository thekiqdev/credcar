const FormData = require('form-data');
const fs = require('fs');
const fetch = require('node-fetch');

async function testUpload() {
  try {
    console.log('🧪 Testando upload local...');
    
    // Criar arquivo de teste
    const testContent = 'Teste de upload - arquivo de 1MB';
    const testFile = 'test-upload.txt';
    fs.writeFileSync(testFile, testContent.repeat(100000)); // ~1MB
    
    console.log('📁 Arquivo de teste criado:', testFile);
    console.log('📊 Tamanho do arquivo:', fs.statSync(testFile).size, 'bytes');
    
    // Criar FormData
    const form = new FormData();
    form.append('file', fs.createReadStream(testFile));
    form.append('representativeId', 'test-123');
    form.append('documentType', 'cartilha de credenciamento preenchida');
    form.append('cpfCnpj', '12345678901');
    
    console.log('🚀 Enviando requisição...');
    
    // Fazer upload
    const response = await fetch('http://localhost:3001/api/upload-document', {
      method: 'POST',
      body: form
    });
    
    console.log('📥 Status:', response.status);
    console.log('📥 Status Text:', response.statusText);
    
    if (response.ok) {
      const result = await response.json();
      console.log('✅ Upload bem-sucedido!');
      console.log('📊 Resultado:', result);
    } else {
      const errorText = await response.text();
      console.log('❌ Erro no upload:');
      console.log('📄 Resposta:', errorText);
    }
    
    // Limpar arquivo de teste
    fs.unlinkSync(testFile);
    console.log('🧹 Arquivo de teste removido');
    
  } catch (error) {
    console.error('❌ Erro no teste:', error.message);
  }
}

testUpload();
