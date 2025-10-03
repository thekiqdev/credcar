const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// Health check
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'OK', port: PORT });
});

// Test endpoint
app.post('/api/test-asaas', (req, res) => {
  console.log('POST /api/test-asaas recebido:', req.body);
  
  const { apiKey, environment } = req.body;
  
  if (!apiKey) {
    return res.status(400).json({
      success: false,
      message: 'API Key não fornecida'
    });
  }
  
  res.json({
    success: true,
    message: `✅ Teste funcionando!\n\n🔧 Configuração recebida:\n• Ambiente: ${environment || 'sandbox'}\n• API Key: ${apiKey.substring(0, 10)}...\n\n🎯 Backend proxy funcionando corretamente!`,
    environment: environment || 'sandbox',
    apiKeyConfigured: true
  });
});

console.log(`🚀 Iniciando servidor na porta ${PORT}...`);
app.listen(PORT, () => {
  console.log(`✅ Servidor rodando: http://localhost:${PORT}`);
  console.log(`🔗 Teste: POST http://localhost:${PORT}/api/test-asaas`);
});
