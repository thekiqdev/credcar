import fetch from 'node-fetch';
import FormData from 'form-data';
import fs from 'fs';

const testUpload = async () => {
  try {
    console.log('🧪 Testando upload local...');
    
    const form = new FormData();
    form.append('file', fs.createReadStream('credenciamento.pdf'));
    form.append('representativeId', 'test-id');
    form.append('documentType', 'cartilha de credenciamento preenchida');
    form.append('cpfCnpj', '42103715000110');
    
    console.log('📤 Enviando requisição...');
    
    const response = await fetch('http://localhost:3001/api/upload-document', {
      method: 'POST',
      body: form
    });
    
    console.log('📥 Status:', response.status);
    console.log('📥 Status Text:', response.statusText);
    
    const result = await response.text();
    console.log('📥 Response:', result);
    
    if (response.ok) {
      console.log('✅ Upload bem-sucedido!');
    } else {
      console.log('❌ Upload falhou!');
    }
    
  } catch (error) {
    console.error('❌ Erro no teste:', error.message);
  }
};

testUpload();
