// ================================
// UPLOAD SERVER + ASAAS PROXY API
// ================================
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
// import { fetch } from 'node-fetch'; // Node v18+ has built-in fetch

// Node.js crypto module
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3001;

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.static('uploads'));

// ================================
// MULTER CONFIGURATION
// ================================
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = 'uploads/temp/';
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1E9)}-${file.originalname}`;
    cb(null, uniqueName);
  }
});

const upload = multer({ storage: storage });

// Document type mapping for proper folder structure
const documentTypeMap = {
  'Certidão Civil': 'certidao_civil',
  'Certidão Criminal (PF)': 'certidao_criminal_pf',
  'Cartão do CNPJ': 'cartao_cnpj',
  'Comprovante Residência': 'comprovante_residencia',
};

// ================================
// UPLOAD ROUTES
// ================================

// Rota de upload de documentos
app.post('/api/documents/upload/:documentType', upload.single('file'), async (req, res) => {
  try {
    const documentType = req.params.documentType || req.body.documentType || 'Outros';
    
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Nenhum arquivo enviado'
      });
    }

    // Criar estrutura de diretórios se não existir
    const documentFolder = documentTypeMap[documentType] || 'outros';
    const finalDir = path.join('uploads', documentFolder);
    const directory = path.resolve(finalDir);

    if (!fs.existsSync(directory)) {
      fs.mkdirSync(directory, { recursive: true });
    }

    // Mover arquivo do diretório temporário para o diretório final
    const tempFilePath = req.file.path;
    const fileName = req.file.filename;
    const finalFilePath = path.join(directory, fileName);
    
    // Mover arquivo
    fs.renameSync(tempFilePath, finalFilePath);
    
    // Criar URL do arquivo
    const fileUrl = `uploads/${documentFolder}/${fileName}`;
    const relativePath = path.relative(process.cwd(), finalFilePath);
    
    console.log('📁 Document uploaded:', {
      type: documentType,
      folder: documentFolder,
      fileName: fileName,
      url: fileUrl
    });

    res.json({
      success: true,
      message: 'Arquivo enviado com sucesso',
      fileData: {
        fileName: fileName,
        fileSize: req.file.size,
        fileType: req.file.mimetype,
        path: relativePath,
        url: fileUrl,
        documentType: documentType,
        directory: documentFolder,
        timestamp: new Date().toISOString(),
      }
    });

  } catch (error) {
    console.error('❌ Upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      details: error.message
    });
  }
});

// ================================
// ASAAS PROXY API ROUTES
// ================================

// Test Asaas connection
app.post('/api/test-asaas', async (req, res) => {
  try {
    const { apiKey, environment, baseUrl } = req.body;
    
    console.log('🧪 Testing Asaas connection:', {
      environment,
      apiKey: apiKey ? `${apiKey.substring(0, 10)}...` : 'not provided',
      baseUrl
    });

    if (!apiKey) {
      return res.status(400).json({
        success: false,
        message: 'API Key não fornecida'
      });
    }

    // Prepare headers for Asaas API
    const headers = {
      'access_token': apiKey,
      'Content-Type': 'application/json',
      'accept': 'application/json'
    };

    // Test with myAccount endpoint (real authentication test)
    const testUrl = `${baseUrl}/myAccount`;
    
    console.log(`🔗 Calling Asaas API: ${testUrl}`);
    
    const response = await fetch(testUrl, {
      method: 'GET',
      headers: headers,
      timeout: 10000 // 10 second timeout
    });

    const responseData = await response.text();
    console.log(`📊 Asaas API Response Status: ${response.status}`);
    console.log(`📊 Asaas API Response:`, responseData?.substring(0, 200) + (responseData?.length > 200 ? '...' : ''));

    if (response.ok) {
      try {
        const data = JSON.parse(responseData);
        return res.json({
          success: true,
          message: `✅ Conexão com Asaas bem-sucedida!\n\n📊 Dados da conta:\n• Nome: ${data.name || 'N/A'}\n• Email: ${data.email || 'N/A'}\n• CPF/CNPJ: ${data.cpfCnpj || 'N/A'}\n• Tipo: ${data.personType || 'N/A'}\n\n🔧 Configuração:\n• Ambiente: ${environment}\n• URL: ${baseUrl}\n• API Key: Válida`
        });
      } catch (parseError) {
        return res.json({
          success: true,
          message: `✅ Conexão com Asaas bem-sucedida!\n\n📊 Resposta recebida do servidor\n🔧 Configuração:\n• Ambiente: ${environment}\n• URL: ${baseUrl}\n• API Key: Válida\n\n⚠️ Nota: Resposta não é JSON válido mas conexão foi estabelecida`
        });
      }
    } else if (response.status === 401) {
      return res.status(401).json({
        success: false,
        message: `❌ API Key inválida ou expirada!\n\n🔍 Status HTTP: ${response.status}\n📝 Resposta: ${responseData}\n\n💡 Verifique se:\n• A chave está correta\n• Não expirou\n• Tem permissões necessárias\n• Está no ambiente correto (${environment})`
      });
    } else if (response.status === 403) {
      return res.status(403).json({
        success: false,
        message: `❌ Acesso negado!\n\n🔍 Status HTTP: ${response.status}\n📝 Resposta: ${responseData}\n\n💡 Verifique se:\n• A conta tem permissões\n• API Key tem permissões necessárias\n• Não está bloqueada`
      });
    } else {
      return res.status(response.status).json({
        success: false,
        message: `❌ Erro na API Asaas!\n\n🔍 Status HTTP: ${response.status}\n📝 Resposta: ${responseData}\n\n💡 Possíveis causas:\n• Servidor temporariamente indisponível\n• Configuração incorreta\n• Problema de rede`
      });
    }

  } catch (error) {
    console.error('❌ Asaas proxy error:', error);
    
    if (error.name === 'FetchError' && error.message.includes('timeout')) {
      return res.status(408).json({
        success: false,
        message: `⏱️ Timeout na conexão!\n\n📝 O servidor Asaas demorou muito para responder\n💡 Tente novamente ou verifique sua conexão`
      });
    }
    
    return res.status(500).json({
      success: false,
      message: `❌ Erro interno do proxy!\n\n📝 Detalhes: ${error.message}\n\n💡 Verifique se:\n• Conectividade com internet\n• URL da API está correta\n• Formato da configuração`
    });
  }
});

// Create customer proxy
app.post('/api/asaas/customer', async (req, res) => {
  try {
    const { apiKey, environment, baseUrl, customerData } = req.body;
    
    if (!apiKey || !customerData) {
      return res.status(400).json({
        success: false,
        message: 'API Key e dados do cliente são obrigatórios'
      });
    }

    const headers = {
      'access_token': apiKey,
      'Content-Type': 'application/json'
    };

    const response = await fetch(`${baseUrl}/customers`, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(customerData)
    });

    const responseData = await response.text();
    
    if (response.ok) {
      return res.json({
        success: true,
        data: JSON.parse(responseData)
      });
    } else {
      return res.status(response.status).json({
        success: false,
        message: `Erro ao criar cliente: ${responseData}`
      });
    }

  } catch (error) {
    console.error('Customer creation error:', error);
    return res.status(500).json({
      success: false,
      message: `Erro interno: ${error.message}`
    });
  }
});

// Create payment proxy
app.post('/api/asaas/payment', async (req, res) => {
  try {
    const { apiKey, environment, baseUrl, paymentData } = req.body;
    
    if (!apiKey || !paymentData) {
      return res.status(400).json({
        success: false,
        message: 'API Key e dados do pagamento são obrigatórios'
      });
    }

    const headers = {
      'access_token': apiKey,
      'Content-Type': 'application/json'
    };

    const response = await fetch(`${baseUrl}/payments`, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(paymentData)
    });

    const responseData = await response.text();
    
    if (response.ok) {
      return res.json({
        success: true,
        data: JSON.parse(responseData)
      });
    } else {
      return res.status(response.status).json({
        success: false,
        message: `Erro ao criar pagamento: ${responseData}`
      });
    }

  } catch (error) {
    console.error('Payment creation error:', error);
    return res.status(500).json({
      success: false,
      message: `Erro interno: ${error.message}`
    });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'API Running',
    timestamp: new Date().toISOString(),
    services: {
      upload: 'active',
      asaas_proxy: 'active'
    }
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Upload Server + Asaas Proxy running on port ${PORT}`);
  console.log(`📁 Upload endpoint: http://localhost:${PORT}/api/documents/upload/:documentType`);
  console.log(`🔗 Asaas test endpoint: http://localhost:${PORT}/api/test-asaas`);
  console.log(`❤️ Health check: http://localhost:${PORT}/api/health`);
});