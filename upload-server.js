import express from 'express';
import multer from 'multer';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import fetch from 'node-fetch';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(helmet());
app.use(morgan('combined'));
app.use(express.json());

// Middleware de tratamento de erros
app.use((error, req, res, next) => {
  console.error('❌ Erro no servidor:', error);
  res.status(500).json({ 
    error: error.message || 'Erro interno do servidor',
    details: error.stack 
  });
});

// Configuração do multer para upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Para uploads multipart/form-data, os dados vêm do req.body
    // mas precisamos aguardar o multer processar primeiro
    const baseDir = path.join(__dirname, 'documentos');
    const tempPath = path.join(baseDir, 'temp');
    
    // Criar diretório temporário se não existir
    fs.mkdirSync(tempPath, { recursive: true });
    
    cb(null, tempPath);
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const extension = path.extname(file.originalname);
    const filename = `PRO_${String(timestamp).padStart(10, '0')}_${timestamp}${extension}`;
    cb(null, filename);
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/pdf',
      'image/jpeg', 
      'image/png', 
      'image/jpg',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    
    if (!allowedTypes.includes(file.mimetype)) {
      return cb(new Error('Tipo de arquivo não permitido. Formatos aceitos: PDF, JPG, PNG, DOC, DOCX.'), false);
    }
    
    // Validação de tamanho será feita após o upload
    cb(null, true);
  }
});

// Rota de health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    timestamp: new Date().toISOString(),
    port: PORT
  });
});

// Rota de webhook ASAAS
app.post('/api/webhooks/asaas', express.json({ limit: '10mb' }), async (req, res) => {
  try {
    console.log('🚀 Webhook ASAAS recebido:', req.body);
    console.log('📋 Headers recebidos:', req.headers);
    
    // Tentar diferentes tipos de assinatura que o ASAAS pode usar
    const signature = req.headers['asaas-access-token'] || 
                     req.headers['x-asaas-signature'] || 
                     req.headers['signature'] ||
                     req.headers['authorization'] ||
                     req.headers['x-webhook-signature'];
    
    console.log('🔐 Assinatura encontrada:', signature ? signature.substring(0, 20) + '...' : 'NENHUMA');
    
    // Por enquanto, aceitar webhooks mesmo sem assinatura para teste
    // TODO: Implementar validação real de assinatura quando soubermos o formato correto
    if (!signature) {
      console.warn('⚠️ Webhook sem assinatura - aceitando para teste');
    }

    console.log('📋 Processando webhook ASAAS...');
    console.log('🔍 Evento:', req.body.event);
    console.log('💳 Pagamento ID:', req.body.payment?.id);
    console.log('💰 Valor:', req.body.payment?.value);
    console.log('📅 Data Pagamento:', req.body.payment?.paymentDate);
    console.log('🏦 Status:', req.body.payment?.status);
    
    // Aqui você pode adicionar a lógica de processamento
    // Por enquanto, apenas logamos e retornamos sucesso
    
    res.json({ 
      message: 'Webhook processed successfully',
      timestamp: new Date().toISOString(),
      event: req.body.event,
      paymentId: req.body.payment?.id || 'N/A',
      status: req.body.payment?.status || 'N/A'
    });
    
  } catch (error) {
    console.error('❌ Erro no webhook ASAAS:', error);
    res.status(500).json({
      message: 'Internal Server Error',
      error: error.message
    });
  }
});

// ASAAS Proxy Route (sem CORS)
app.post('/api/proxy/asaas', express.json({ limit: '10mb' }), async (req, res) => {
  try {
    const { url, key, env, body, ...restParams } = req.body;

    if (!url || !key || !env) {
      return res.status(400).json({ 
        ok: false, 
        error: 'Missing required parameters: url, key, env' 
      });
    }

    let baseUrl = env === 'sandbox' ? 'https://sandbox.asaas.com/api/v3' : 'https://www.asaas.com/api/v3';
    const fullUrl = `${baseUrl}/${url}`;

    console.log(`🌐 ASAAS Proxy Request: ${req.body.method || 'GET'} ${fullUrl}`);
    console.log(`🔑 Key: ${key.substring(0, 10)}...`);
    console.log(`🌍 Environment: ${env}`);

    const fetchOptions = {
      method: req.body.method || 'GET',
      headers: { 
        'access_token': key, 
        'Content-Type': 'application/json' 
      }
    };

    // Add body for POST/PUT requests
    if ((req.body.method === 'POST' || req.body.method === 'PUT') && body) {
      fetchOptions.body = JSON.stringify(body);
    }

    const response = await fetch(fullUrl, fetchOptions);
    const responseText = await response.text();

    console.log(`📤 ASAAS Response: ${response.status} ${response.statusText}`);

    // Try to parse as JSON, fallback to plain text
    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch {
      responseData = responseText;
    }

    res.status(response.ok ? 200 : response.status).json({ 
      ok: response.ok, 
      status: response.status, 
      statusText: response.statusText,
      data: responseData 
    });
  } catch (err) {
    console.error('❌ ASAAS Proxy Error:', err);
    res.status(500).json({ 
      ok: false, 
      error: String(err),
      message: 'Proxy server error'
    });
  }
});

// Rota para criar estrutura de pastas
app.post('/api/create-folder', (req, res) => {
  try {
    const { cpfCnpj } = req.body;
    
    if (!cpfCnpj) {
      return res.status(400).json({ error: 'CPF/CNPJ é obrigatório para criar pasta' });
    }

    const baseDir = path.join(__dirname, 'documentos');
    const sanitizedCpfCnpj = cpfCnpj.replace(/[^a-zA-Z0-9]/g, '');
    const folderPath = path.join(baseDir, sanitizedCpfCnpj);

    // Criar estrutura de pastas para todos os tipos de documento (nova estrutura)
    const empresaDocs = [
      'cartilha_credenciamento_empresa',
      'cartao_cnpj',
      'contrato_social',
      'certificado_mei',
      'comprovante_endereco_empresa',
      'declaracao_endereco',
      'dados_bancarios'
    ];

    const socioDocs = [
      'cartilha_credenciamento_pf',
      'comprovante_endereco_socio',
      'certidao_antecedentes_criminais',
      'certidao_negativa_civel_1grau',
      'certidao_negativa_criminal_1grau',
      'foto_identidade_frente',
      'foto_identidade_verso'
    ];

    // Criar pastas empresa e socio
    const empresaPath = path.join(folderPath, 'empresa');
    const socioPath = path.join(folderPath, 'socio');
    fs.mkdirSync(empresaPath, { recursive: true });
    fs.mkdirSync(socioPath, { recursive: true });

    // Criar subpastas da empresa
    empresaDocs.forEach(docType => {
      const docPath = path.join(empresaPath, docType);
      fs.mkdirSync(docPath, { recursive: true });
    });

    // Criar subpastas do sócio
    socioDocs.forEach(docType => {
      const docPath = path.join(socioPath, docType);
      fs.mkdirSync(docPath, { recursive: true });
    });

    res.json({ 
      success: true, 
      message: 'Estrutura de pastas criada com sucesso',
      path: folderPath 
    });
  } catch (error) {
    console.error('Erro ao criar pasta:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Middleware para validar arquivo antes do processamento
const validateFile = (req, res, next) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Nenhum arquivo foi enviado' });
  }

  // Validação adicional: verificar se o arquivo não está vazio
  if (req.file.size === 0) {
    console.error('❌ Arquivo vazio detectado no servidor:', req.file.originalname);
    return res.status(400).json({ error: 'Arquivo vazio detectado. Selecione um arquivo válido.' });
  }

  // Validação adicional: verificar se o arquivo tem tamanho mínimo (1KB)
  if (req.file.size < 1024) {
    console.error(`❌ Arquivo muito pequeno detectado no servidor: ${req.file.originalname} (${req.file.size} bytes)`);
    return res.status(400).json({ error: 'Arquivo muito pequeno. Verifique se o arquivo foi selecionado corretamente.' });
  }

  next();
};

// Rota para upload de documentos
app.post('/api/upload-document', upload.single('file'), validateFile, (req, res) => {
  try {
    console.log('📤 Recebendo upload...');
    console.log('📋 Body:', req.body);
    console.log('📁 File:', req.file);
    
    const { cpfCnpj, documentType } = req.body;
    
    console.log('🔍 Document Type:', documentType);
    console.log('👤 CPF/CNPJ:', cpfCnpj);
    console.log('📏 File Size:', req.file.size, 'bytes');
    console.log('📄 MIME Type:', req.file.mimetype);
    
    if (!cpfCnpj || !documentType) {
      console.log('❌ Dados obrigatórios faltando:', { cpfCnpj, documentType });
      return res.status(400).json({ error: 'CPF/CNPJ e tipo de documento são obrigatórios' });
    }

    // Validações específicas por tipo de documento
    const documentValidations = {
      // Documentos da Empresa
      'cartilha de credenciamento preenchida': { maxSize: 5 * 1024 * 1024, requiredTypes: ['application/pdf'] },
      'cartão cnpj': { maxSize: 2 * 1024 * 1024, requiredTypes: ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'] },
      'contrato social e última alteração': { maxSize: 10 * 1024 * 1024, requiredTypes: ['application/pdf'] },
      'certificado de microempreendedor individual (mei)': { maxSize: 3 * 1024 * 1024, requiredTypes: ['application/pdf'] },
      'comprovante de endereço empresa': { maxSize: 2 * 1024 * 1024, requiredTypes: ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'] },
      'declaração de endereço': { maxSize: 2 * 1024 * 1024, requiredTypes: ['application/pdf'] },
      'dados bancários': { maxSize: 2 * 1024 * 1024, requiredTypes: ['application/pdf'] },
      
      // Documentos do Sócio
      'cartilha de credenciamento pf': { maxSize: 5 * 1024 * 1024, requiredTypes: ['application/pdf'] },
      'comprovante de endereço sócio': { maxSize: 2 * 1024 * 1024, requiredTypes: ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'] },
      'certidão de antecedentes criminais': { maxSize: 3 * 1024 * 1024, requiredTypes: ['application/pdf'] },
      'certidão negativa cível 1º grau': { maxSize: 3 * 1024 * 1024, requiredTypes: ['application/pdf'] },
      'certidão negativa criminal 1º grau': { maxSize: 3 * 1024 * 1024, requiredTypes: ['application/pdf'] },
      'foto identidade frente': { maxSize: 1 * 1024 * 1024, requiredTypes: ['image/jpeg', 'image/png', 'image/jpg'] },
      'foto identidade verso': { maxSize: 1 * 1024 * 1024, requiredTypes: ['image/jpeg', 'image/png', 'image/jpg'] }
    };

    const validation = documentValidations[documentType.toLowerCase()];
    if (validation) {
      // Verificar tamanho do arquivo
      if (req.file.size > validation.maxSize) {
        const maxSizeMB = validation.maxSize / (1024 * 1024);
        return res.status(400).json({ 
          error: `Arquivo muito grande. Tamanho máximo permitido: ${maxSizeMB}MB` 
        });
      }
      
      // Verificar tipo do arquivo
      if (!validation.requiredTypes.includes(req.file.mimetype)) {
        return res.status(400).json({ 
          error: `Tipo de arquivo não permitido para ${documentType}. Tipos aceitos: ${validation.requiredTypes.join(', ')}` 
        });
      }
    }

    // Criar estrutura de pastas correta
    const baseDir = path.join(__dirname, 'documentos');
    const sanitizedCpfCnpj = cpfCnpj.replace(/[^a-zA-Z0-9]/g, '');
    
    // Mapear tipos de documento para nomes corretos (nova estrutura)
    const documentTypeMap = {
      // Documentos da Empresa
      'cartilha de credenciamento preenchida': 'empresa/cartilha_credenciamento_empresa',
      'cartão cnpj': 'empresa/cartao_cnpj',
      'contrato social e última alteração': 'empresa/contrato_social',
      'comprovante de endereço em nome da empresa': 'empresa/comprovante_endereco_empresa',
      'dados bancários para recebimento das comissões': 'empresa/dados_bancarios_comissoes',
      
      // Documentos do Sócio
      'cartilha de credenciamento pf': 'socio/cartilha_credenciamento_pf',
      'comprovante de endereço em nome do sócio': 'socio/comprovante_endereco_socio',
      'certidão de antecedentes criminais': 'socio/certidao_antecedentes_criminais',
      'certidão negativa cível de 1º grau': 'socio/certidao_negativa_civel_1grau',
      'certidão negativa criminal de 1º grau': 'socio/certidao_negativa_criminal_1grau',
      'foto de identidade ou cnh (frente)': 'socio/foto_identidade_frente',
      'foto de identidade ou cnh (verso)': 'socio/foto_identidade_verso',
      
      // Compatibilidade com documentos antigos
      'certidão negativa civil': 'socio/certidao_negativa_civel_1grau',
      'comprovante de endereço': 'empresa/comprovante_endereco_empresa',
      'cartão do cnpj/cpf': 'empresa/cartao_cnpj',
      'certidão de antecedente criminal': 'socio/certidao_antecedentes_criminais'
    };
    
    console.log('🔍 Document Type Original:', documentType);
    console.log('🔍 Document Type Lowercase:', documentType.toLowerCase());
    console.log('🔍 Mapped Path:', documentTypeMap[documentType.toLowerCase()]);
    
    const mappedPath = documentTypeMap[documentType.toLowerCase()] || 
      documentType.toLowerCase().replace(/[^a-z0-9]/g, '_');
    
    console.log('🔍 Final Mapped Path:', mappedPath);
    
    const finalPath = path.join(baseDir, sanitizedCpfCnpj, mappedPath);
    console.log('🔍 Final Path:', finalPath);
    
    // Criar diretório final se não existir
    fs.mkdirSync(finalPath, { recursive: true });
    
    // Mover arquivo do temp para o local final
    const finalFilePath = path.join(finalPath, req.file.filename);
    console.log('🔍 Temp File Path:', req.file.path);
    console.log('🔍 Final File Path:', finalFilePath);
    
    fs.renameSync(req.file.path, finalFilePath);
    console.log('✅ Arquivo movido com sucesso!');

    const fileInfo = {
      originalName: req.file.originalname,
      filename: req.file.filename,
      filePath: finalFilePath,
      directory: finalFilePath,
      size: req.file.size,
      mimetype: req.file.mimetype,
      documentType: documentType,
      cpfCnpj: cpfCnpj,
      uploadedAt: new Date().toISOString()
    };

    console.log('📊 File Info Completo:', fileInfo);

    console.log('✅ Arquivo enviado com sucesso!');
    console.log('📁 Final Path:', finalFilePath);
    console.log('📊 File Info:', {
      originalName: fileInfo.originalName,
      filename: fileInfo.filename,
      size: fileInfo.size,
      mimetype: fileInfo.mimetype,
      documentType: fileInfo.documentType,
      cpfCnpj: fileInfo.cpfCnpj
    });

    res.json({
      success: true,
      message: 'Arquivo enviado com sucesso',
      data: fileInfo
    });
  } catch (error) {
    console.error('❌ Erro no upload:', error);
    res.status(500).json({ error: error.message || 'Erro interno do servidor' });
  }
});

// Rota para listar arquivos
app.get('/api/list-files', (req, res) => {
  try {
    const { cpfCnpj } = req.query;
    
    if (!cpfCnpj) {
      return res.status(400).json({ error: 'CPF/CNPJ é obrigatório' });
    }

    const baseDir = path.join(__dirname, 'documentos');
    const sanitizedCpfCnpj = cpfCnpj.replace(/[^a-zA-Z0-9]/g, '');
    const folderPath = path.join(baseDir, sanitizedCpfCnpj);

    if (!fs.existsSync(folderPath)) {
      return res.json({ files: [] });
    }

    const files = [];
    
    // Listar arquivos da nova estrutura (empresa e socio)
    const empresaPath = path.join(folderPath, 'empresa');
    const socioPath = path.join(folderPath, 'socio');
    
    // Função para listar arquivos de uma categoria
    const listFilesInCategory = (categoryPath, category) => {
      if (fs.existsSync(categoryPath)) {
        const subDirs = fs.readdirSync(categoryPath, { withFileTypes: true })
          .filter(dirent => dirent.isDirectory())
          .map(dirent => dirent.name);
        
        subDirs.forEach(subDir => {
          const docPath = path.join(categoryPath, subDir);
          if (fs.existsSync(docPath)) {
            const docFiles = fs.readdirSync(docPath);
            docFiles.forEach(file => {
              files.push({
                name: file,
                type: `${category}/${subDir}`,
                category: category,
                subType: subDir,
                path: path.join(docPath, file),
                size: fs.statSync(path.join(docPath, file)).size,
                modified: fs.statSync(path.join(docPath, file)).mtime
              });
            });
          }
        });
      }
    };
    
    // Listar arquivos da empresa e sócio
    listFilesInCategory(empresaPath, 'empresa');
    listFilesInCategory(socioPath, 'socio');
    
    // Compatibilidade: também listar arquivos da estrutura antiga
    const oldDocumentTypes = ['certidao_negativa_civil', 'comprovante_endereco', 'cartao_cnpj_cpf', 'certidao_antecedente_criminal'];
    oldDocumentTypes.forEach(docType => {
      const docPath = path.join(folderPath, docType);
      if (fs.existsSync(docPath)) {
        const docFiles = fs.readdirSync(docPath);
        docFiles.forEach(file => {
          files.push({
            name: file,
            type: docType,
            category: 'legacy',
            subType: docType,
            path: path.join(docPath, file),
            size: fs.statSync(path.join(docPath, file)).size,
            modified: fs.statSync(path.join(docPath, file)).mtime
          });
        });
      }
    });

    res.json({ files });
  } catch (error) {
    console.error('Erro ao listar arquivos:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Rota para download de arquivos
app.get('/api/download-file', (req, res) => {
  try {
    const { path: filePath } = req.query;
    
    if (!filePath) {
      return res.status(400).json({ error: 'Caminho do arquivo é obrigatório' });
    }

    const fullPath = path.resolve(filePath);
    
    // Verificar se o arquivo existe
    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({ error: 'Arquivo não encontrado' });
    }

    // Verificar se o arquivo está dentro do diretório de documentos
    const documentsDir = path.resolve(__dirname, 'documentos');
    if (!fullPath.startsWith(documentsDir)) {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    res.download(fullPath);
  } catch (error) {
    console.error('Erro no download:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Rota para deletar arquivo
app.delete('/api/delete-file', (req, res) => {
  try {
    const { path: filePath } = req.body;
    
    if (!filePath) {
      return res.status(400).json({ error: 'Caminho do arquivo é obrigatório' });
    }

    const fullPath = path.resolve(filePath);
    
    // Verificar se o arquivo existe
    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({ error: 'Arquivo não encontrado' });
    }

    // Verificar se o arquivo está dentro do diretório de documentos
    const documentsDir = path.resolve(__dirname, 'documentos');
    if (!fullPath.startsWith(documentsDir)) {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    fs.unlinkSync(fullPath);
    
    res.json({ success: true, message: 'Arquivo deletado com sucesso' });
  } catch (error) {
    console.error('Erro ao deletar arquivo:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Rota para deletar pasta de representante
app.delete('/api/delete-representative-folder', (req, res) => {
  try {
    const { cpfCnpj } = req.body;
    
    if (!cpfCnpj) {
      return res.status(400).json({ error: 'CPF/CNPJ é obrigatório' });
    }

    const baseDir = path.join(__dirname, 'documentos');
    const sanitizedCpfCnpj = cpfCnpj.replace(/[^a-zA-Z0-9]/g, '');
    const folderPath = path.join(baseDir, sanitizedCpfCnpj);

    if (fs.existsSync(folderPath)) {
      fs.rmSync(folderPath, { recursive: true, force: true });
      res.json({ success: true, message: 'Pasta do representante deletada com sucesso' });
    } else {
      res.json({ success: true, message: 'Pasta não encontrada' });
    }
  } catch (error) {
    console.error('Erro ao deletar pasta:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor de upload rodando na porta ${PORT}`);
  console.log(`📁 Diretório de documentos: ${path.join(__dirname, 'documentos')}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🌐 ASAAS Proxy: http://localhost:${PORT}/api/proxy/asaas`);
  console.log(`📤 Upload endpoint: http://localhost:${PORT}/api/upload-document`);
  console.log(`📋 List files: http://localhost:${PORT}/api/list-files`);
  console.log(`⬇️ Download: http://localhost:${PORT}/api/download-file`);
  console.log(`🗑️ Delete file: http://localhost:${PORT}/api/delete-file`);
  console.log(`🗂️ Delete folder: http://localhost:${PORT}/api/delete-representative-folder`);
  console.log(`🔔 ASAAS Webhook: http://localhost:${PORT}/api/webhooks/asaas`);
});
