// ================================
// TESTE SIMPLIFICADO BACKEND ASAAS
// ================================
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 3001;

// Middlewares básicos
app.use(cors());
app.use(express.json());

// Health check simples
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Backend Asaas Proxy funcionando!',
    timestamp: new Date().toISOString(),
  });
});

// Test Asaas connection simplificado
app.post('/api/test-asaas', async (req, res) => {
  try {
    const { apiKey, environment, baseUrl } = req.body;
    
    console.log('🧪 Teste Asaas recebido:', {
      environment,
      apiKey: apiKey ? `${apiKey.substring(0, 10)}...` : 'não fornecida',
      baseUrl
    });

    if (!apiKey) {
      return res.status(400).json({
        success: false,
        message: '❌ API Key não fornecida'
      });
    }

    // Validar formato básico da API Key
    const apiKeyPattern = /^\$[a-z]+\_[a-z]+\_[A-Za-z0-9]+$/;
    if (!apiKeyPattern.test(apiKey)) {
      return res.json({
        success: false,
        message: `❌ Formato da API Key inválido!\n\n🔍 Formato esperado: $act_test_xxxxxxxxxx\n📋 Recebida: ${apiKey}\n\n💡 Verifique a chave no painel Asaas`
      });
    }

    // Simular chamada real com delay
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Simular resposta baseada no formato da chave
    const isTestKey = apiKey.startsWith('$act_test_') || apiKey.startsWith('$act_hmlg_');
    
    if (isTestKey) {
      return res.json({
        success: true,
        message: `✅ Conexão com Asaas bem-sucedida!\n\n📊 Dados da conta (simulado):\n• Nome: Empresa Teste\n• Email: admin@test.com\n• CPF/CNPJ: 12345678000199\n• Tipo: JURIDICA\n\n🔧 Configuração:\n• Ambiente: ${environment}\n• URL: ${baseUrl}\n• API Key: Válida\n\n⚠️ Nota: Em produção, dados serão reais via /myAccount`
      });
    } else {
      return res.json({
        success: false,
        message: `❌ API Key parece ser de produção mas estamos em ${environment}!\n\n💡 Para ambiente ${environment}, use uma chave que comece com:\n• $act_test_ (sandbox)\n• $act_hmlg_ (homologação)\n\n🔍 Sua chave: ${apiKey.substring(0, 15)}...`
      });
    }

  } catch (error) {
    console.error('❌ Erro no teste Asaas:', error);
    return res.status(500).json({
      success: false,
      message: `❌ Erro interno: ${error.message}`
    });
  }
});

// Start server
const server = app.listen(PORT, () => {
  console.log(`🚀 Test Backend Asaas Proxy rodando na porta ${PORT}`);
  console.log(`❤️ Health: http://localhost:${PORT}/api/health`);
  console.log(`🔗 Test Asaas: http://localhost:${PORT}/api/test-asaas`);
  console.log(`📋 Aguardando testes...`);
});
