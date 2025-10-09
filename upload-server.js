import express from 'express';
import multer from 'multer';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import fetch from 'node-fetch';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;

// Configuração do Supabase (usando configuração robusta)
let supabaseUrl, supabaseAnonKey;

// Tentar diferentes formas de obter as variáveis
try {
  // 1. Variáveis de ambiente do Node.js
  supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
  
  // 2. Se não encontrou, tentar ler do arquivo .env
  if (!supabaseUrl || !supabaseAnonKey) {
    try {
      const envFile = fs.readFileSync(path.join(__dirname, '.env'), 'utf8');
      const envLines = envFile.split('\n');
      
      for (const line of envLines) {
        if (line.startsWith('VITE_SUPABASE_URL=')) {
          supabaseUrl = line.split('=')[1]?.trim();
        }
        if (line.startsWith('VITE_SUPABASE_ANON_KEY=')) {
          supabaseAnonKey = line.split('=')[1]?.trim();
        }
      }
    } catch (envError) {
      console.log('📋 Arquivo .env não encontrado, continuando...');
    }
  }
  
  // 3. Se ainda não encontrou, usar valores padrão (você deve substituir pelos seus)
  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('⚠️ Variáveis Supabase não encontradas nas variáveis de ambiente');
    console.warn('⚠️ Usando configuração padrão - SUBSTITUA pelos seus valores!');
    
    // SUBSTITUA ESTES VALORES PELOS SEUS REAIS:
    supabaseUrl = 'https://cgystsylstnkgfgbqoel.supabase.co'; // SUBSTITUA
    supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'; // SUBSTITUA
  }
  
} catch (error) {
  console.error('❌ Erro ao configurar Supabase:', error);
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);
console.log('✅ Supabase conectado:', supabaseUrl.substring(0, 30) + '...');

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

// Função para atualizar status de fatura no banco
async function updateInvoiceStatus(paymentData, eventType) {
  try {
    console.log('🔄 Atualizando status da fatura...');
    
    // Mapear eventos ASAAS para status locais
    let newStatus;
    let updateData = {};
    
    switch (eventType) {
      case 'PAYMENT_RECEIVED':
        newStatus = 'paid';
        updateData = {
          status: newStatus,
          payment_date: paymentData.paymentDate || new Date().toISOString().split('T')[0]
        };
        break;
        
      case 'PAYMENT_OVERDUE':
        newStatus = 'overdue';
        updateData = {
          status: newStatus
        };
        break;
        
      case 'PAYMENT_DELETED':
        newStatus = 'cancelled';
        updateData = {
          status: newStatus
        };
        break;
        
      default:
        console.log(`ℹ️ Evento ${eventType} não requer atualização de status`);
        return { success: true, message: 'Evento não requer atualização' };
    }
    
    // Buscar fatura pelo invoice_code (ID do ASAAS)
    const invoiceCode = paymentData.invoiceNumber || paymentData.id;
    console.log('🔍 Buscando fatura com invoice_code:', invoiceCode);
    
    const { data: invoice, error: fetchError } = await supabase
      .from('invoices')
      .select('*')
      .eq('invoice_code', invoiceCode)
      .single();
    
    if (fetchError) {
      console.error('❌ Erro ao buscar fatura:', fetchError);
      return { success: false, error: fetchError.message };
    }
    
    if (!invoice) {
      console.warn('⚠️ Fatura não encontrada com invoice_code:', invoiceCode);
      return { success: false, error: 'Fatura não encontrada' };
    }
    
    console.log('✅ Fatura encontrada:', invoice.id);
    
    // Atualizar fatura
    const { data: updatedInvoice, error: updateError } = await supabase
      .from('invoices')
      .update(updateData)
      .eq('id', invoice.id)
      .select()
      .single();
    
    if (updateError) {
      console.error('❌ Erro ao atualizar fatura:', updateError);
      return { success: false, error: updateError.message };
    }
    
    console.log('✅ Fatura atualizada com sucesso:', {
      id: updatedInvoice.id,
      status: updatedInvoice.status,
      payment_date: updatedInvoice.payment_date
    });
    
    // Log de auditoria
    await logWebhookEvent(eventType, paymentData, invoice.id, newStatus);
    
    return { 
      success: true, 
      invoice: updatedInvoice,
      message: `Status atualizado para ${newStatus}` 
    };
    
  } catch (error) {
    console.error('❌ Erro na função updateInvoiceStatus:', error);
    return { success: false, error: error.message };
  }
}

// Função para log de auditoria
async function logWebhookEvent(eventType, paymentData, invoiceId, newStatus) {
  try {
    const logData = {
      event_type: eventType,
      payment_id: paymentData.id,
      invoice_id: invoiceId,
      invoice_code: paymentData.invoiceNumber || paymentData.id,
      new_status: newStatus,
      payment_value: paymentData.value,
      payment_date: paymentData.paymentDate,
      processed_at: new Date().toISOString(),
      raw_data: paymentData
    };
    
    const { error } = await supabase
      .from('webhook_logs')
      .insert(logData);
    
    if (error) {
      console.error('❌ Erro ao salvar log de auditoria:', error);
    } else {
      console.log('📝 Log de auditoria salvo:', logData.event_type);
    }
    
  } catch (error) {
    console.error('❌ Erro na função logWebhookEvent:', error);
  }
}

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
    
    // Processar diferentes tipos de eventos
    const eventType = req.body.event;
    const payment = req.body.payment;
    
    console.log('📊 Dados para processamento:', {
      eventType,
      paymentId: payment?.id,
      invoiceNumber: payment?.invoiceNumber,
      externalReference: payment?.externalReference,
      status: payment?.status,
      value: payment?.value,
      paymentDate: payment?.paymentDate
    });
    
    // Processar evento e atualizar banco de dados
    let updateResult = null;
    
    switch (eventType) {
      case 'PAYMENT_RECEIVED':
        console.log('✅ Pagamento recebido - atualizando status para PAGO');
        updateResult = await updateInvoiceStatus(payment, eventType);
        break;
        
      case 'PAYMENT_OVERDUE':
        console.log('⚠️ Pagamento vencido - atualizando status para VENCIDO');
        updateResult = await updateInvoiceStatus(payment, eventType);
        break;
        
      case 'PAYMENT_DELETED':
        console.log('🗑️ Pagamento deletado - atualizando status para CANCELADO');
        updateResult = await updateInvoiceStatus(payment, eventType);
        break;
        
      case 'PAYMENT_REFUND_DENIED':
        console.log('❌ Estorno negado - apenas log do evento');
        await logWebhookEvent(eventType, payment, null, null);
        updateResult = { success: true, message: 'Evento logado sem mudança de status' };
        break;
        
      default:
        console.log(`ℹ️ Evento não tratado: ${eventType}`);
        updateResult = { success: true, message: 'Evento não requer processamento' };
        break;
    }
    
    // Log do resultado
    if (updateResult) {
      console.log('📋 Resultado do processamento:', updateResult);
    }
    
    res.json({ 
      message: 'Webhook processed successfully',
      timestamp: new Date().toISOString(),
      event: req.body.event,
      paymentId: req.body.payment?.id || 'N/A',
      status: req.body.payment?.status || 'N/A',
      processingResult: updateResult,
      success: updateResult?.success !== false
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

// Endpoint para execução do cronjob de geração automática de faturas
app.get('/api/cron/generate-invoices', async (req, res) => {
  try {
    console.log('🚀 [CRON API] Iniciando execução do cronjob de geração de faturas');
    
    // Verificar token de autorização
    const authToken = req.headers.authorization;
    const expectedToken = process.env.CRON_AUTH_TOKEN || 'credcar-cron-token-2025';
    
    if (!authToken || !authToken.startsWith('Bearer ')) {
      console.error('❌ [CRON API] Token de autorização não fornecido');
      return res.status(401).json({ 
        error: 'Token de autorização obrigatório',
        message: 'Use: Authorization: Bearer SEU_TOKEN'
      });
    }
    
    const providedToken = authToken.replace('Bearer ', '');
    if (providedToken !== expectedToken) {
      console.error('❌ [CRON API] Token de autorização inválido');
      return res.status(401).json({ 
        error: 'Token de autorização inválido',
        message: 'Token fornecido não confere'
      });
    }
    
    console.log('✅ [CRON API] Token de autorização válido');
    
    // Importar e executar o serviço de cron
    const { invoiceCronService } = await import('./src/lib/invoice-cron.service.js');
    
    const result = await invoiceCronService.processScheduledInvoices();
    
    console.log(`🏁 [CRON API] Execução concluída: ${result.created} criadas, ${result.failed} falharam`);
    
    res.json({
      success: true,
      message: 'Cronjob executado com sucesso',
      result: {
        processed: result.processed,
        created: result.created,
        failed: result.failed,
        errors: result.errors,
        details: result.details
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ [CRON API] Erro na execução do cronjob:', error);
    
    res.status(500).json({
      success: false,
      error: 'Erro interno na execução do cronjob',
      message: error instanceof Error ? error.message : 'Erro desconhecido',
      timestamp: new Date().toISOString()
    });
  }
});

// Endpoint para buscar dados do cliente de um contrato
app.get('/api/test/client-data/:contractId', async (req, res) => {
  try {
    const contractId = parseInt(req.params.contractId);
    console.log(`🧪 [TEST] Buscando dados do cliente para contrato ${contractId}`);
    
    // Buscar contrato com dados do cliente
    const { data: contract, error: contractError } = await supabase
      .from('contracts')
      .select(`
        id,
        clients (
          id,
          full_name,
          email,
          cpf_cnpj,
          phone,
          asaas_customer_id
        )
      `)
      .eq('id', contractId)
      .single();

    if (contractError || !contract) {
      return res.status(404).json({
        success: false,
        message: `Contrato ${contractId} não encontrado`,
        error: contractError?.message
      });
    }

    res.json({
      success: true,
      contract: contract,
      client: contract.clients,
      message: `Dados do cliente encontrados para contrato ${contractId}`
    });
    
  } catch (error) {
    console.error('❌ [TEST] Erro ao buscar dados do cliente:', error);
    
    res.status(500).json({
      success: false,
      error: 'Erro interno ao buscar dados do cliente',
      message: error instanceof Error ? error.message : 'Erro desconhecido',
      timestamp: new Date().toISOString()
    });
  }
});

// Endpoint para testar busca de cliente no ASAAS
app.get('/api/test/find-customer/:cpfCnpj', async (req, res) => {
  try {
    const cpfCnpj = req.params.cpfCnpj;
    console.log(`🧪 [TEST] Testando busca de cliente no ASAAS: ${cpfCnpj}`);
    
    // Simular busca de cliente no ASAAS
    const cleanCpfCnpj = cpfCnpj.replace(/\D/g, '');
    console.log(`🧪 [TEST] CPF/CNPJ limpo: ${cleanCpfCnpj}`);
    
    // Buscar configuração ASAAS
    const { data: configs, error: configError } = await supabase
      .from('system_config')
      .select('key, value')
      .in('key', ['asaas.api.key', 'asaas.environment'])
      .eq('is_active', true);

    if (configError || !configs || configs.length === 0) {
      return res.status(500).json({
        success: false,
        message: 'Configuração ASAAS não encontrada',
        error: configError?.message
      });
    }

    const apiKey = configs.find(c => c.key === 'asaas.api.key')?.value;
    const environment = configs.find(c => c.key === 'asaas.environment')?.value || 'sandbox';

    // Fazer requisição para ASAAS via proxy
    const proxyResponse = await fetch('http://localhost:3001/api/proxy/asaas', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        method: 'GET',
        url: `customers?cpfCnpj=${cleanCpfCnpj}`,
        key: apiKey,
        env: environment,
        data: null
      })
    });
    
    const proxyData = await proxyResponse.json();
    
    const found = proxyData?.ok && proxyData?.data?.data && proxyData.data.data.length > 0;
    const customerCount = proxyData?.data?.data?.length || 0;
    const existingCustomer = found ? proxyData.data.data[0] : null;

    res.json({
      success: true,
      cpfCnpj: cpfCnpj,
      cleanCpfCnpj: cleanCpfCnpj,
      asaasResponse: proxyData,
      found: found,
      customerCount: customerCount,
      existingCustomer: existingCustomer
    });
    
  } catch (error) {
    console.error('❌ [TEST] Erro no teste de busca de cliente:', error);
    
    res.status(500).json({
      success: false,
      error: 'Erro interno no teste de busca',
      message: error instanceof Error ? error.message : 'Erro desconhecido',
      timestamp: new Date().toISOString()
    });
  }
});

// Endpoint para deletar faturas de teste
app.delete('/api/test/delete-invoices/:contractId', async (req, res) => {
  try {
    const contractId = parseInt(req.params.contractId);
    console.log(`🧪 [TEST] Deletando faturas de teste para contrato ${contractId}`);
    
    // Deletar todas as faturas do contrato
    const { error: deleteError } = await supabase
      .from('invoices')
      .delete()
      .eq('contract_id', contractId);

    if (deleteError) {
      return res.status(500).json({
        success: false,
        message: `Erro ao deletar faturas: ${deleteError.message}`,
        contractId: contractId
      });
    }

    res.json({
      success: true,
      message: `Faturas deletadas com sucesso para contrato ${contractId}`,
      contractId: contractId
    });
    
  } catch (error) {
    console.error('❌ [TEST] Erro ao deletar faturas:', error);
    
    res.status(500).json({
      success: false,
      error: 'Erro interno ao deletar faturas',
      message: error instanceof Error ? error.message : 'Erro desconhecido',
      timestamp: new Date().toISOString()
    });
  }
});

// Endpoint para testar cálculo de datas de vencimento
app.get('/api/test/due-dates/:contractId', async (req, res) => {
  try {
    const contractId = parseInt(req.params.contractId);
    console.log(`🧪 [TEST] Testando cálculo de datas para contrato ${contractId}`);
    
    // Buscar dados básicos do contrato
    const { data: contract, error: contractError } = await supabase
      .from('contracts')
      .select('id, status, credit_amount, id_faixa_de_credito')
      .eq('id', contractId)
      .single();

    if (contractError || !contract) {
      return res.status(404).json({
        success: false,
        message: `Contrato ${contractId} não encontrado`,
        error: contractError?.message
      });
    }

    // Buscar faixa de crédito
    let creditRange = null;
    if (contract.id_faixa_de_credito) {
      const { data: range, error: rangeError } = await supabase
        .from('faixas_de_credito')
        .select('*')
        .eq('id', contract.id_faixa_de_credito)
        .single();
      
      if (!rangeError) {
        creditRange = range;
      }
    }

    if (!creditRange) {
      return res.status(400).json({
        success: false,
        message: `Faixa de crédito não encontrada para contrato ${contractId}`,
        contract: contract
      });
    }

    // Buscar parcelas personalizadas
    const { data: customInstallments, error: customError } = await supabase
      .from('condicoes_parcelas')
      .select('numero_parcela, valor_parcela')
      .eq('faixa_credito_id', creditRange.id)
      .order('numero_parcela');

    // Simular cálculo de datas (simplificado)
    const today = new Date();
    const defaultDueDays = 30;
    
    const installments = [];
    
    // 1ª Parcela
    const firstDueDate = new Date(today);
    firstDueDate.setDate(firstDueDate.getDate() + defaultDueDays);
    installments.push({
      numero_parcela: 1,
      valor_parcela: creditRange.valor_primeira_parcela,
      due_date: firstDueDate.toISOString().split('T')[0],
      tipo: 'primeira'
    });

    // Parcelas personalizadas
    if (customInstallments && customInstallments.length > 0) {
      for (const custom of customInstallments) {
        if (custom.numero_parcela === 1) continue;
        
        const dueDate = new Date(firstDueDate);
        dueDate.setMonth(dueDate.getMonth() + (custom.numero_parcela - 1));
        
        installments.push({
          numero_parcela: custom.numero_parcela,
          valor_parcela: custom.valor_parcela,
          due_date: dueDate.toISOString().split('T')[0],
          tipo: 'personalizada'
        });
      }
    }

    res.json({
      success: true,
      contract: contract,
      creditRange: creditRange,
      customInstallments: customInstallments || [],
      calculatedInstallments: installments,
      message: `Calculadas ${installments.length} parcelas com datas de vencimento`
    });
    
  } catch (error) {
    console.error('❌ [TEST] Erro no teste de datas:', error);
    
    res.status(500).json({
      success: false,
      error: 'Erro interno no teste de datas',
      message: error instanceof Error ? error.message : 'Erro desconhecido',
      timestamp: new Date().toISOString()
    });
  }
});

// Endpoint para verificar parcelas personalizadas
app.get('/api/test/custom-installments/:faixaId', async (req, res) => {
  try {
    const faixaId = parseInt(req.params.faixaId);
    console.log(`🧪 [TEST] Verificando parcelas personalizadas para faixa ${faixaId}`);
    
    // Buscar parcelas personalizadas
    const { data: customInstallments, error: customError } = await supabase
      .from('condicoes_parcelas')
      .select('numero_parcela, valor_parcela')
      .eq('faixa_credito_id', faixaId)
      .order('numero_parcela');

    if (customError) {
      return res.status(500).json({
        success: false,
        message: `Erro ao buscar parcelas personalizadas: ${customError.message}`,
        faixaId: faixaId
      });
    }

    res.json({
      success: true,
      faixaId: faixaId,
      customInstallments: customInstallments || [],
      count: customInstallments?.length || 0,
      message: `Encontradas ${customInstallments?.length || 0} parcelas personalizadas para faixa ${faixaId}`
    });
    
  } catch (error) {
    console.error('❌ [TEST] Erro ao verificar parcelas personalizadas:', error);
    
    res.status(500).json({
      success: false,
      error: 'Erro interno ao verificar parcelas personalizadas',
      message: error instanceof Error ? error.message : 'Erro desconhecido',
      timestamp: new Date().toISOString()
    });
  }
});

// Endpoint para testar criação manual de faturas
app.get('/api/test/create-invoices/:contractId', async (req, res) => {
  try {
    const contractId = parseInt(req.params.contractId);
    console.log(`🧪 [TEST] Testando criação manual de faturas para contrato ${contractId}`);
    
    // Buscar dados básicos do contrato
    const { data: contract, error: contractError } = await supabase
      .from('contracts')
      .select('id, status, credit_amount, id_faixa_de_credito')
      .eq('id', contractId)
      .single();

    if (contractError || !contract) {
      return res.status(404).json({
        success: false,
        message: `Contrato ${contractId} não encontrado`,
        error: contractError?.message
      });
    }

    // Verificar se já existem faturas
    const { data: existingInvoices, error: invoicesError } = await supabase
      .from('invoices')
      .select('id, installment_number, amount, status')
      .eq('contract_id', contractId)
      .order('installment_number');

    if (invoicesError) {
      console.error('Erro ao buscar faturas:', invoicesError);
    }

    // Se já existem faturas, não criar novas
    if (existingInvoices && existingInvoices.length > 0) {
      return res.json({
        success: false,
        message: `Contrato ${contractId} já possui ${existingInvoices.length} faturas`,
        existingInvoices: existingInvoices,
        contract: contract
      });
    }

    // Buscar faixa de crédito
    let creditRange = null;
    if (contract.id_faixa_de_credito) {
      const { data: range, error: rangeError } = await supabase
        .from('faixas_de_credito')
        .select('*')
        .eq('id', contract.id_faixa_de_credito)
        .single();
      
      if (!rangeError) {
        creditRange = range;
      }
    }

    if (!creditRange) {
      return res.status(400).json({
        success: false,
        message: `Faixa de crédito não encontrada para contrato ${contractId}`,
        contract: contract
      });
    }

    // Criar primeira fatura manualmente (simplificado)
    const today = new Date();
    const dueDate = new Date(today);
    dueDate.setDate(dueDate.getDate() + 30); // 30 dias
    
    const yearStr = dueDate.getFullYear();
    const monthStr = String(dueDate.getMonth() + 1).padStart(2, '0');
    const dayStr = String(dueDate.getDate()).padStart(2, '0');
    const dueDateStr = `${yearStr}-${monthStr}-${dayStr}`;

    // Calcular next_invoice_date para segunda parcela
    const nextDueDate = new Date(dueDate);
    nextDueDate.setMonth(nextDueDate.getMonth() + 1);
    const nextDate = new Date(nextDueDate);
    nextDate.setDate(nextDate.getDate() - 15); // 15 dias antes
    
    const nextYearStr = nextDate.getFullYear();
    const nextMonthStr = String(nextDate.getMonth() + 1).padStart(2, '0');
    const nextDayStr = String(nextDate.getDate()).padStart(2, '0');
    const nextInvoiceDate = `${nextYearStr}-${nextMonthStr}-${nextDayStr}`;

    const newInvoice = {
      contract_id: contractId,
      installment_number: 1,
      amount: creditRange.valor_primeira_parcela,
      due_date: dueDateStr,
      status: 'Pendente',
      notes: 'Parcela 1 - primeira',
      next_invoice_date: nextInvoiceDate
    };

    // Inserir fatura no banco
    const { data: createdInvoice, error: insertError } = await supabase
      .from('invoices')
      .insert(newInvoice)
      .select()
      .single();

    if (insertError) {
      throw new Error(`Erro ao inserir fatura: ${insertError.message}`);
    }

    res.json({
      success: true,
      message: `Fatura criada com sucesso para contrato ${contractId}`,
      invoice: createdInvoice,
      contract: contract,
      creditRange: creditRange
    });
    
  } catch (error) {
    console.error('❌ [TEST] Erro na criação manual:', error);
    
    res.status(500).json({
      success: false,
      error: 'Erro interno na criação manual',
      message: error instanceof Error ? error.message : 'Erro desconhecido',
      timestamp: new Date().toISOString()
    });
  }
});

// Endpoint para testar validação de contratos
app.get('/api/test/contract-validation/:contractId', async (req, res) => {
  try {
    const contractId = parseInt(req.params.contractId);
    console.log(`🧪 [TEST] Testando validação do contrato ${contractId}`);
    
    // Buscar dados básicos do contrato
    const { data: contract, error: contractError } = await supabase
      .from('contracts')
      .select('id, status, credit_amount, id_faixa_de_credito')
      .eq('id', contractId)
      .single();

    if (contractError || !contract) {
      return res.status(404).json({
        success: false,
        message: `Contrato ${contractId} não encontrado`,
        error: contractError?.message
      });
    }

    // Verificar se já existem faturas
    const { data: existingInvoices, error: invoicesError } = await supabase
      .from('invoices')
      .select('id, installment_number, amount, status')
      .eq('contract_id', contractId)
      .order('installment_number');

    if (invoicesError) {
      console.error('Erro ao buscar faturas:', invoicesError);
    }

    // Buscar faixa de crédito se disponível
    let creditRange = null;
    if (contract.id_faixa_de_credito) {
      const { data: range, error: rangeError } = await supabase
        .from('faixas_de_credito')
        .select('*')
        .eq('id', contract.id_faixa_de_credito)
        .single();
      
      if (!rangeError) {
        creditRange = range;
      }
    }

    res.json({
      success: true,
      contract: {
        id: contract.id,
        status: contract.status,
        credit_amount: contract.credit_amount,
        id_faixa_de_credito: contract.id_faixa_de_credito
      },
      creditRange: creditRange,
      existingInvoices: existingInvoices || [],
      canCreateInvoices: contract.status === 'Ativo' && (!existingInvoices || existingInvoices.length === 0),
      message: `Contrato ${contractId} encontrado - Status: ${contract.status}`
    });
    
  } catch (error) {
    console.error('❌ [TEST] Erro no teste de validação:', error);
    
    res.status(500).json({
      success: false,
      error: 'Erro interno no teste de validação',
      message: error instanceof Error ? error.message : 'Erro desconhecido',
      timestamp: new Date().toISOString()
    });
  }
});

// Endpoint para teste manual do cronjob (sem autenticação para desenvolvimento)
app.get('/api/cron/test-generate-invoices', async (req, res) => {
  try {
    console.log('🧪 [CRON TEST] Executando teste manual do cronjob');
    
    // Implementação inline simplificada para teste
    const today = new Date().toISOString().split('T')[0];
    
    // Buscar faturas que precisam gerar próxima parcela
    const { data: invoicesToProcess, error: searchError } = await supabase
      .from('invoices')
      .select('id, contract_id, installment_number, amount, due_date, next_invoice_date, status')
      .not('next_invoice_date', 'is', null)
      .lte('next_invoice_date', today)
      .neq('status', 'cancelled')
      .order('contract_id, installment_number');

    if (searchError) {
      throw new Error(`Erro ao buscar faturas: ${searchError.message}`);
    }

    console.log(`📋 [CRON TEST] Encontradas ${invoicesToProcess?.length || 0} faturas para processar`);

    const result = {
      processed: 0,
      created: 0,
      failed: 0,
      errors: [],
      details: []
    };

    if (!invoicesToProcess || invoicesToProcess.length === 0) {
      console.log(`✅ [CRON TEST] Nenhuma fatura para processar hoje`);
      res.json({
        success: true,
        message: 'Nenhuma fatura para processar hoje',
        result: result,
        timestamp: new Date().toISOString()
      });
      return;
    }

    // Processar cada fatura encontrada
    for (const invoice of invoicesToProcess) {
      result.processed++;
      
      try {
        console.log(`🔄 [CRON TEST] Processando contrato ${invoice.contract_id}, parcela ${invoice.installment_number}`);
        
        const nextInstallmentNumber = invoice.installment_number + 1;
        
        // Verificar se já existe a próxima parcela
        const { data: existingInvoice } = await supabase
          .from('invoices')
          .select('id')
          .eq('contract_id', invoice.contract_id)
          .eq('installment_number', nextInstallmentNumber)
          .single();

        if (existingInvoice) {
          console.log(`✅ Parcela ${nextInstallmentNumber} já existe para contrato ${invoice.contract_id}`);
          result.details.push({
            contractId: invoice.contract_id,
            invoiceId: invoice.id,
            installmentNumber: invoice.installment_number,
            status: 'skipped',
            message: 'Próxima parcela já existe'
          });
          continue;
        }

        // Buscar dados do contrato
        const { data: contract, error: contractError } = await supabase
          .from('contracts')
          .select('credit_amount, payment_installments')
          .eq('id', invoice.contract_id)
          .single();

        if (contractError || !contract) {
          throw new Error(`Contrato ${invoice.contract_id} não encontrado`);
        }

        // Calcular valor da próxima parcela (simplificado)
        const totalInstallments = contract.payment_installments || 80;
        const installmentValue = Math.round(contract.credit_amount / totalInstallments);

        // Calcular data de vencimento (simplificado)
        const todayDate = new Date();
        const dueDate = new Date(todayDate);
        dueDate.setMonth(dueDate.getMonth() + nextInstallmentNumber);
        
        const yearStr = dueDate.getFullYear();
        const monthStr = String(dueDate.getMonth() + 1).padStart(2, '0');
        const dayStr = String(dueDate.getDate()).padStart(2, '0');
        const dueDateStr = `${yearStr}-${monthStr}-${dayStr}`;

        // Calcular next_invoice_date da parcela seguinte
        let nextInvoiceDate = null;
        
        if (nextInstallmentNumber < totalInstallments) {
          const nextDueDate = new Date(dueDate);
          nextDueDate.setMonth(nextDueDate.getMonth() + 1);
          
          const nextDate = new Date(nextDueDate);
          nextDate.setDate(nextDate.getDate() - 15); // 15 dias antes
          
          const nextYearStr = nextDate.getFullYear();
          const nextMonthStr = String(nextDate.getMonth() + 1).padStart(2, '0');
          const nextDayStr = String(nextDate.getDate()).padStart(2, '0');
          nextInvoiceDate = `${nextYearStr}-${nextMonthStr}-${nextDayStr}`;
        }

        const newInvoice = {
          contract_id: invoice.contract_id,
          installment_number: nextInstallmentNumber,
          amount: installmentValue,
          due_date: dueDateStr,
          status: 'Pendente',
          notes: `Parcela ${nextInstallmentNumber} - automática`,
          next_invoice_date: nextInvoiceDate
        };

        // Inserir nova fatura no banco
        const { data: createdInvoice, error: insertError } = await supabase
          .from('invoices')
          .insert(newInvoice)
          .select()
          .single();

        if (insertError) {
          throw new Error(`Erro ao inserir fatura: ${insertError.message}`);
        }

        // Atualizar next_invoice_date da fatura anterior para NULL
        const { error: updateError } = await supabase
          .from('invoices')
          .update({ next_invoice_date: null })
          .eq('id', invoice.id);

        if (updateError) {
          console.warn(`⚠️ [CRON TEST] Erro ao atualizar next_invoice_date da fatura ${invoice.id}:`, updateError);
        }

        // Registrar sucesso
        result.details.push({
          contractId: invoice.contract_id,
          invoiceId: createdInvoice.id,
          installmentNumber: nextInstallmentNumber,
          status: 'success',
          message: `Parcela ${nextInstallmentNumber} criada com sucesso`,
          nextInvoiceDate: nextInvoiceDate
        });
        result.created++;

        console.log(`✅ [CRON TEST] Contrato ${invoice.contract_id} - parcela ${nextInstallmentNumber} criada (R$ ${newInvoice.amount.toLocaleString('pt-BR')})`);

      } catch (error) {
        result.failed++;
        const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
        result.errors.push(`Contrato ${invoice.contract_id}: ${errorMessage}`);

        result.details.push({
          contractId: invoice.contract_id,
          invoiceId: invoice.id,
          installmentNumber: invoice.installment_number,
          status: 'failed',
          message: errorMessage
        });

        console.error(`❌ [CRON TEST] Erro ao processar contrato ${invoice.contract_id}:`, error);
      }
    }

    console.log(`🏁 [CRON TEST] Teste concluído: ${result.created} criadas, ${result.failed} falharam`);
    
    res.json({
      success: true,
      message: 'Teste do cronjob executado com sucesso',
      result: result,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ [CRON TEST] Erro no teste do cronjob:', error);
    
    res.status(500).json({
      success: false,
      error: 'Erro interno no teste do cronjob',
      message: error instanceof Error ? error.message : 'Erro desconhecido',
      timestamp: new Date().toISOString()
    });
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
  console.log(`⏰ Cron Generate Invoices: http://localhost:${PORT}/api/cron/generate-invoices`);
  console.log(`🧪 Cron Test: http://localhost:${PORT}/api/cron/test-generate-invoices`);
});
