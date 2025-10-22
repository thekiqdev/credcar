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

// Endpoint para criar estrutura de pastas específica para sócios
app.post('/api/create-partner-folder', (req, res) => {
  try {
    const { representativeCpfCnpj, partnerCpf } = req.body;
    
    if (!representativeCpfCnpj || !partnerCpf) {
      return res.status(400).json({ error: 'CPF/CNPJ do representante e CPF do sócio são obrigatórios' });
    }

    const baseDir = path.join(__dirname, 'documentos');
    const sanitizedRepCpfCnpj = representativeCpfCnpj.replace(/[^a-zA-Z0-9]/g, '');
    const sanitizedPartnerCpf = partnerCpf.replace(/[^a-zA-Z0-9]/g, '');
    
    // Estrutura: documentos / cpf_representante / socio / cpf_socio /
    const folderPath = path.join(baseDir, sanitizedRepCpfCnpj, 'socio', sanitizedPartnerCpf);

    // Documentos específicos do sócio
    const socioDocs = [
      'cartilha_credenciamento_pf',
      'comprovante_endereco_socio',
      'certidao_antecedentes_criminais',
      'certidao_negativa_civel_1grau',
      'certidao_negativa_criminal_1grau',
      'foto_identidade_frente',
      'foto_identidade_verso'
    ];

    // Criar pasta principal do sócio
    fs.mkdirSync(folderPath, { recursive: true });

    // Criar subpastas para cada tipo de documento do sócio
    socioDocs.forEach(docType => {
      const docPath = path.join(folderPath, docType);
      fs.mkdirSync(docPath, { recursive: true });
    });

    console.log(`✅ Estrutura de pastas criada para sócio: ${sanitizedPartnerCpf}`);
    console.log(`📂 Caminho: ${folderPath}`);

    res.json({ 
      success: true, 
      message: 'Estrutura de pastas do sócio criada com sucesso',
      path: folderPath,
      partnerCpf: sanitizedPartnerCpf
    });
  } catch (error) {
    console.error('Erro ao criar pasta do sócio:', error);
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

// Endpoint para verificar migração contract_profile
app.get('/api/test-contract-profile-migration', async (req, res) => {
  try {
    console.log('🔍 Testando migração contract_profile...');
    
    // Tentar fazer um SELECT na coluna contract_profile
    const { data, error } = await supabase
      .from('profiles')
      .select('id, contract_profile')
      .limit(1);

    if (error) {
      if (error.code === '42703') {
        console.log('❌ Coluna contract_profile não existe');
        res.json({
          success: false,
          message: 'Coluna contract_profile não existe na tabela profiles',
          error: error.message,
          needsMigration: true
        });
      } else {
        console.log('❌ Erro ao verificar coluna:', error);
        res.json({
          success: false,
          message: 'Erro ao verificar coluna contract_profile',
          error: error.message,
          needsMigration: false
        });
      }
    } else {
      console.log('✅ Coluna contract_profile existe');
      res.json({
        success: true,
        message: 'Coluna contract_profile existe na tabela profiles',
        data: data,
        needsMigration: false
      });
    }
  } catch (error) {
    console.error('❌ Erro no teste de migração:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
});

// Rota para upload de logo do sistema
app.post('/api/upload-system-logo', upload.single('file'), async (req, res) => {
  try {
    console.log('📤 Recebendo upload de logo do sistema...');
    
    if (!req.file) {
      return res.status(400).json({ error: 'Nenhum arquivo enviado' });
    }

    // Validar tipo de arquivo
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/svg+xml'];
    if (!allowedTypes.includes(req.file.mimetype)) {
      return res.status(400).json({ error: 'Apenas arquivos de imagem são permitidos (JPEG, PNG, GIF, SVG)' });
    }

    // Validar tamanho (máximo 5MB para logos)
    if (req.file.size > 5 * 1024 * 1024) {
      return res.status(400).json({ error: 'Arquivo muito grande. Tamanho máximo: 5MB' });
    }

    // Criar diretório para logos do sistema
    const logoDir = path.join(__dirname, 'documentos', 'sistema', 'logos');
    if (!fs.existsSync(logoDir)) {
      fs.mkdirSync(logoDir, { recursive: true });
    }

    // Gerar nome único para o arquivo
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileExtension = path.extname(req.file.originalname);
    const fileName = `logo-${timestamp}${fileExtension}`;
    const filePath = path.join(logoDir, fileName);

    // Mover arquivo para o diretório final
    fs.renameSync(req.file.path, filePath);

    // Gerar URL de download
    const relativePath = path.relative(__dirname, filePath).replace(/\\/g, '/');
    const downloadUrl = `${req.protocol}://${req.get('host')}/api/download-file?path=${encodeURIComponent(relativePath)}`;

    console.log('✅ Logo do sistema salvo com sucesso:', relativePath);

    res.json({
      success: true,
      data: {
        fileName: fileName,
        filePath: relativePath,
        downloadUrl: downloadUrl,
        originalName: req.file.originalname,
        size: req.file.size,
        mimeType: req.file.mimetype
      }
    });

  } catch (error) {
    console.error('❌ Erro no upload do logo:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Rota para upload de contrato representante
app.post('/api/upload-representative-contract', upload.single('file'), validateFile, (req, res) => {
  try {
    console.log('📤 Recebendo upload de contrato representante...');
    console.log('📋 Body:', req.body);
    console.log('📁 File:', req.file);
    
    const { representativeId, cpfCnpj } = req.body;
    
    console.log('🔍 Representative ID:', representativeId);
    console.log('👤 CPF/CNPJ:', cpfCnpj);
    console.log('📏 File Size:', req.file.size, 'bytes');
    console.log('📄 MIME Type:', req.file.mimetype);
    
    if (!representativeId || !cpfCnpj) {
      console.log('❌ Dados obrigatórios faltando:', { representativeId, cpfCnpj });
      return res.status(400).json({ error: 'ID do representante e CPF/CNPJ são obrigatórios' });
    }

    // Validação específica para contrato representante
    const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    const maxSize = 10 * 1024 * 1024; // 10MB

    if (!allowedTypes.includes(req.file.mimetype)) {
      return res.status(400).json({ 
        error: 'Tipo de arquivo não permitido. Formatos aceitos: PDF, DOC, DOCX.' 
      });
    }

    if (req.file.size > maxSize) {
      return res.status(400).json({ 
        error: 'Arquivo muito grande. Tamanho máximo: 10MB' 
      });
    }

    // Criar estrutura de pastas: documentos/cpf/contrato-representante/
    const baseDir = path.join(__dirname, 'documentos');
    const sanitizedCpfCnpj = cpfCnpj.replace(/[^a-zA-Z0-9]/g, '');
    const contractDir = path.join(baseDir, sanitizedCpfCnpj, 'contrato-representante');
    
    console.log('🔍 Contract Directory:', contractDir);
    
    // Criar diretório se não existir
    fs.mkdirSync(contractDir, { recursive: true });
    
    // Gerar nome único para o arquivo
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileExtension = path.extname(req.file.originalname);
    const fileName = `contrato-representante-${timestamp}${fileExtension}`;
    const finalFilePath = path.join(contractDir, fileName);
    
    console.log('🔍 Final File Path:', finalFilePath);
    
    // Mover arquivo do temp para o local final
    fs.renameSync(req.file.path, finalFilePath);
    console.log('✅ Arquivo de contrato movido com sucesso!');

    // Gerar URL de download - corrigir barras para URL
    const relativePath = path.relative(baseDir, finalFilePath).replace(/\\/g, '/');
    const downloadUrl = `http://localhost:${PORT}/api/download-file?path=${encodeURIComponent(relativePath)}`;

    const fileInfo = {
      originalName: req.file.originalname,
      filename: fileName,
      filePath: finalFilePath,
      downloadUrl: downloadUrl,
      size: req.file.size,
      mimetype: req.file.mimetype,
      representativeId: representativeId,
      cpfCnpj: cpfCnpj,
      uploadedAt: new Date().toISOString()
    };

    console.log('📊 Contract File Info:', fileInfo);

    res.json({
      success: true,
      message: 'Contrato enviado com sucesso',
      data: fileInfo
    });
  } catch (error) {
    console.error('❌ Erro no upload de contrato:', error);
    res.status(500).json({ error: error.message || 'Erro interno do servidor' });
  }
});

// Rota para deletar contrato representante
app.delete('/api/delete-representative-contract', async (req, res) => {
  try {
    const { representativeId, cpfCnpj } = req.body;
    
    console.log('🗑️ Deletando contrato representante...');
    console.log('🔍 Representative ID:', representativeId);
    console.log('👤 CPF/CNPJ:', cpfCnpj);
    
    if (!representativeId || !cpfCnpj) {
      return res.status(400).json({ error: 'ID do representante e CPF/CNPJ são obrigatórios' });
    }

    // Construir caminho do arquivo
    const baseDir = path.join(__dirname, 'documentos');
    const sanitizedCpfCnpj = cpfCnpj.replace(/[^a-zA-Z0-9]/g, '');
    const contractDir = path.join(baseDir, sanitizedCpfCnpj, 'contrato-representante');
    
    console.log('🔍 Contract Directory:', contractDir);
    
    // Verificar se o diretório existe
    if (!fs.existsSync(contractDir)) {
      return res.status(404).json({ error: 'Contrato não encontrado' });
    }
    
    // Listar arquivos no diretório
    const files = fs.readdirSync(contractDir);
    const contractFiles = files.filter(file => file.startsWith('contrato-representante-'));
    
    if (contractFiles.length === 0) {
      return res.status(404).json({ error: 'Contrato não encontrado' });
    }
    
    // Deletar todos os arquivos de contrato (pode haver múltiplos)
    let deletedCount = 0;
    for (const file of contractFiles) {
      const filePath = path.join(contractDir, file);
      try {
        fs.unlinkSync(filePath);
        deletedCount++;
        console.log('✅ Arquivo deletado:', file);
      } catch (error) {
        console.error('❌ Erro ao deletar arquivo:', file, error);
      }
    }
    
    // Se não há mais arquivos, deletar o diretório
    const remainingFiles = fs.readdirSync(contractDir);
    if (remainingFiles.length === 0) {
      fs.rmdirSync(contractDir);
      console.log('✅ Diretório de contrato removido');
    }
    
    console.log(`✅ ${deletedCount} arquivo(s) de contrato deletado(s)`);
    
    res.json({
      success: true,
      message: `${deletedCount} arquivo(s) de contrato deletado(s) com sucesso`,
      deletedCount: deletedCount
    });
    
  } catch (error) {
    console.error('❌ Erro ao deletar contrato:', error);
    res.status(500).json({ error: error.message || 'Erro interno do servidor' });
  }
});

// Rota para upload de documentos de contratos
app.post('/api/upload-contract-document', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Nenhum arquivo enviado' });
    }

    const { contractId, documentType } = req.body;
    
    console.log('📁 Upload de documento de contrato iniciado...');
    console.log('📋 Contract ID:', contractId);
    console.log('📄 Document Type:', documentType);
    console.log('📎 File:', req.file.originalname, '(', req.file.size, 'bytes)');

    if (!contractId || !documentType) {
      return res.status(400).json({ error: 'ID do contrato e tipo do documento são obrigatórios' });
    }

    // Validar tipo de arquivo
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'image/jpeg',
      'image/jpg',
      'image/png',
      'audio/mpeg',
      'audio/wav',
      'audio/mp4',
      'audio/m4a'
    ];

    if (!allowedTypes.includes(req.file.mimetype)) {
      return res.status(400).json({ error: 'Tipo de arquivo não permitido' });
    }

    // Validar tamanho (máx 10MB)
    if (req.file.size > 10 * 1024 * 1024) {
      return res.status(400).json({ error: 'Arquivo muito grande. Máximo: 10MB' });
    }

    // Criar estrutura de pastas: documentos/contratos/{contractId}/documentos/
    const baseDir = path.join(__dirname, 'documentos');
    const contractDir = path.join(baseDir, 'contratos', contractId, 'documentos');
    
    // Garantir que o diretório existe
    if (!fs.existsSync(contractDir)) {
      fs.mkdirSync(contractDir, { recursive: true });
      console.log('📁 Diretório criado:', contractDir);
    }

    // Gerar nome único para o arquivo
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileExtension = path.extname(req.file.originalname);
    const fileName = `documento-${timestamp}${fileExtension}`;
    const finalFilePath = path.join(contractDir, fileName);

    // Mover arquivo para local final
    fs.renameSync(req.file.path, finalFilePath);
    console.log('✅ Documento movido com sucesso!');

    // Gerar URL de download
    const relativePath = path.relative(baseDir, finalFilePath).replace(/\\/g, '/');
    const downloadUrl = `http://localhost:${PORT}/api/download-file?path=${encodeURIComponent(relativePath)}`;

    const fileInfo = {
      originalName: req.file.originalname,
      filename: fileName,
      filePath: finalFilePath,
      downloadUrl: downloadUrl,
      size: req.file.size,
      mimetype: req.file.mimetype,
      contractId: contractId,
      documentType: documentType,
      uploadedAt: new Date().toISOString()
    };

    console.log('📊 Contract Document Info:', fileInfo);

    res.json({
      success: true,
      message: 'Documento anexado com sucesso',
      data: fileInfo
    });
  } catch (error) {
    console.error('❌ Erro no upload de documento:', error);
    res.status(500).json({ error: error.message || 'Erro interno do servidor' });
  }
});

// Rota para upload de documentos
app.post('/api/upload-document', upload.single('file'), validateFile, (req, res) => {
  try {
    console.log('📤 Recebendo upload...');
    console.log('📋 Body:', req.body);
    console.log('📁 File:', req.file);
    
    const { cpfCnpj, documentType, partnerId, partnerCpf } = req.body;
    
    console.log('🔍 Document Type:', documentType);
    console.log('👤 CPF/CNPJ:', cpfCnpj);
    console.log('👤 Partner ID:', partnerId);
    console.log('👤 Partner CPF:', partnerCpf);
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
    
    // Determinar o caminho final baseado se é documento de sócio ou não
    let finalPath;
    if (partnerId && partnerCpf) {
      // Documento de sócio: documentos/cpf_representante/socio/cpf_socio/tipo_documento
      const sanitizedPartnerCpf = partnerCpf.replace(/[^a-zA-Z0-9]/g, '');
      console.log('🔍 Partner ID:', partnerId);
      console.log('🔍 Partner CPF:', partnerCpf);
      console.log('🔍 Sanitized Partner CPF:', sanitizedPartnerCpf);
      console.log('🔍 Mapped Path:', mappedPath);
      
      const docType = mappedPath.split('/')[1]; // Extrair apenas o tipo do documento (ex: cartilha_credenciamento_pf)
      console.log('🔍 Extracted Doc Type:', docType);
      
      finalPath = path.join(baseDir, sanitizedCpfCnpj, 'socio', sanitizedPartnerCpf, docType);
      console.log('🔍 Documento de sócio - Final Path:', finalPath);
    } else {
      // Documento de representante: documentos/cpf_representante/tipo_documento
      finalPath = path.join(baseDir, sanitizedCpfCnpj, mappedPath);
      console.log('🔍 Documento de representante - Final Path:', finalPath);
    }
    
    // Criar diretório final se não existir
    fs.mkdirSync(finalPath, { recursive: true });
    
    // Mover arquivo do temp para o local final
    const finalFilePath = path.join(finalPath, req.file.filename);
    console.log('🔍 Temp File Path:', req.file.path);
    console.log('🔍 Final File Path:', finalFilePath);
    
    fs.renameSync(req.file.path, finalFilePath);
    console.log('✅ Arquivo movido com sucesso!');

    // Construir caminho relativo para salvar no banco
    const relativePath = path.relative(path.join(__dirname, 'documentos'), finalFilePath);
    console.log('🔍 Relative Path for DB:', relativePath);
    
    const fileInfo = {
      originalName: req.file.originalname,
      filename: req.file.filename,
      filePath: relativePath, // Usar caminho relativo em vez de absoluto
      directory: relativePath,
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

// Rota para excluir arquivo
app.post('/api/delete-file', (req, res) => {
  try {
    console.log('🗑️ Recebendo requisição de exclusão...');
    console.log('📋 Body:', req.body);
    
    const { filePath } = req.body;
    
    if (!filePath) {
      console.log('❌ Caminho do arquivo não fornecido');
      return res.status(400).json({ error: 'Caminho do arquivo é obrigatório' });
    }
    
    console.log('🗑️ Arquivo a ser excluído:', filePath);
    
    // Construir caminho absoluto
    const baseDir = path.join(__dirname, 'documentos');
    const fullPath = path.join(baseDir, filePath);
    
    console.log('🗑️ Caminho completo:', fullPath);
    
    // Verificar se o arquivo está dentro do diretório documentos (segurança)
    const resolvedBaseDir = path.resolve(baseDir);
    const resolvedFilePath = path.resolve(fullPath);
    
    if (!resolvedFilePath.startsWith(resolvedBaseDir)) {
      console.log('❌ Tentativa de acesso fora do diretório documentos');
      return res.status(403).json({ error: 'Acesso negado: arquivo fora do diretório permitido' });
    }
    
    // Verificar se o arquivo existe
    if (!fs.existsSync(fullPath)) {
      console.log('❌ Arquivo não encontrado:', fullPath);
      return res.status(404).json({ error: 'Arquivo não encontrado' });
    }
    
    // Excluir o arquivo
    fs.unlinkSync(fullPath);
    console.log('✅ Arquivo excluído com sucesso:', fullPath);
    
    res.json({
      success: true,
      message: 'Arquivo excluído com sucesso',
      deletedPath: fullPath
    });
    
  } catch (error) {
    console.error('❌ Erro ao excluir arquivo:', error);
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
    
    console.log('📥 Download request received');
    console.log('🔍 Query path:', filePath);
    
    if (!filePath) {
      console.log('❌ No file path provided');
      return res.status(400).json({ error: 'Caminho do arquivo é obrigatório' });
    }

    // Decodificar o path e converter barras para o sistema operacional
    const decodedPath = decodeURIComponent(filePath);
    const normalizedPath = decodedPath.replace(/\//g, path.sep);
    const fullPath = path.resolve(__dirname, 'documentos', normalizedPath);
    
    console.log('🔍 Decoded path:', decodedPath);
    console.log('🔍 Normalized path:', normalizedPath);
    console.log('🔍 Full path:', fullPath);
    
    // Verificar se o arquivo existe
    if (!fs.existsSync(fullPath)) {
      console.log('❌ File not found:', fullPath);
      return res.status(404).json({ error: 'Arquivo não encontrado' });
    }

    // Verificar se o arquivo está dentro do diretório de documentos
    const documentsDir = path.resolve(__dirname, 'documentos');
    if (!fullPath.startsWith(documentsDir)) {
      console.log('❌ Access denied - file outside documents directory');
      return res.status(403).json({ error: 'Acesso negado' });
    }

    console.log('✅ File found, starting download:', fullPath);
    res.download(fullPath);
  } catch (error) {
    console.error('❌ Erro no download:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Rota para visualizar arquivos (abrir no navegador)
app.get('/api/view-file', (req, res) => {
  try {
    const { path: filePath } = req.query;
    
    console.log('👁️ View request received');
    console.log('🔍 Query path:', filePath);
    
    if (!filePath) {
      console.log('❌ No file path provided');
      return res.status(400).json({ error: 'Caminho do arquivo é obrigatório' });
    }

    // Decodificar o path e converter barras para o sistema operacional
    const decodedPath = decodeURIComponent(filePath);
    const normalizedPath = decodedPath.replace(/\//g, path.sep);
    const fullPath = path.resolve(__dirname, 'documentos', normalizedPath);
    
    console.log('🔍 Decoded path:', decodedPath);
    console.log('🔍 Normalized path:', normalizedPath);
    console.log('🔍 Full path:', fullPath);
    
    // Verificar se o arquivo existe
    if (!fs.existsSync(fullPath)) {
      console.log('❌ File not found:', fullPath);
      return res.status(404).json({ error: 'Arquivo não encontrado' });
    }

    // Verificar se o arquivo está dentro do diretório de documentos
    const documentsDir = path.resolve(__dirname, 'documentos');
    if (!fullPath.startsWith(documentsDir)) {
      console.log('❌ Access denied - file outside documents directory');
      return res.status(403).json({ error: 'Acesso negado' });
    }

    // Detectar tipo de arquivo
    const ext = path.extname(fullPath).toLowerCase();
    let contentType = 'application/octet-stream';
    
    const mimeTypes = {
      '.pdf': 'application/pdf',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    };
    
    contentType = mimeTypes[ext] || contentType;
    
    console.log('✅ File found, serving for view:', fullPath);
    console.log('📄 Content-Type:', contentType);
    
    // Definir headers para visualização inline
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', 'inline');
    
    // Enviar arquivo
    res.sendFile(fullPath);
  } catch (error) {
    console.error('❌ Erro na visualização:', error);
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
    const { invoiceCronService } = await import('./src/lib/invoice-cron.service.ts');
    
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

// Endpoint para verificar status de geração automática de fatura
app.get('/api/test/check-next-invoice/:contractId', async (req, res) => {
  try {
    const contractId = parseInt(req.params.contractId);
    console.log(`🧪 [TEST] Verificando próxima fatura para contrato ${contractId}`);
    
    // Buscar última fatura com next_invoice_date
    const { data: lastInvoice, error } = await supabase
      .from('invoices')
      .select('*')
      .eq('contract_id', contractId)
      .not('next_invoice_date', 'is', null)
      .order('installment_number', { ascending: false })
      .limit(1)
      .single();
    
    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Erro ao buscar fatura:', error);
      return res.status(500).json({
        success: false,
        message: error.message
      });
    }
    
    const today = new Date().toISOString().split('T')[0];
    const willRunToday = lastInvoice ? lastInvoice.next_invoice_date <= today : false;
    
    res.json({
      success: true,
      lastInvoice: lastInvoice || null,
      willRunToday: willRunToday,
      nextInstallment: lastInvoice ? lastInvoice.installment_number + 1 : null,
      todayDate: today,
      message: lastInvoice 
        ? `Última fatura: ${lastInvoice.installment_number}, Próxima: ${lastInvoice.installment_number + 1}, Data agendada: ${lastInvoice.next_invoice_date}`
        : 'Nenhuma fatura aguardando criação'
    });
    
  } catch (error) {
    console.error('❌ [TEST] Erro ao verificar próxima fatura:', error);
    
    res.status(500).json({
      success: false,
      error: 'Erro interno ao verificar próxima fatura',
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

    // Calcular next_invoice_date usando regra simplificada
    // Para primeira fatura: próxima fatura será no dia 13 do próximo mês (7 dias antes do vencimento dia 20)
    const nextInvoiceDate = new Date(today);
    nextInvoiceDate.setMonth(nextInvoiceDate.getMonth() + 1);
    nextInvoiceDate.setDate(13); // Dia 13 (7 dias antes do dia 20)
    const nextInvoiceDateStr = nextInvoiceDate.toISOString().split('T')[0];

    const newInvoice = {
      contract_id: contractId,
      installment_number: 1,
      amount: creditRange.valor_primeira_parcela,
      due_date: dueDateStr,
      status: 'Pendente',
      notes: 'Parcela 1 - primeira',
      next_invoice_date: nextInvoiceDateStr,
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

// Função para criar fatura no ASAAS (implementação inline)
async function createInvoiceInAsaasInline(invoice) {
  try {
    console.log(`🚀 [ASAAS] Criando fatura no ASAAS para fatura local ID: ${invoice.id}`);

    // 0. Verificar se a fatura já tem invoice_code (já foi criada no ASAAS)
    if (invoice.invoice_code) {
      console.log(`✅ [ASAAS] Fatura ${invoice.id} já possui invoice_code: ${invoice.invoice_code}. Pulando criação.`);
      return {
        success: true,
        asaasInvoiceId: invoice.invoice_code,
        pixQrCode: invoice.payment_link_pix,
        bankSlipUrl: invoice.payment_link_boleto,
        message: 'Fatura já existe no ASAAS',
        errors: []
      };
    }

    // 1. Buscar dados do contrato para obter cliente ASAAS
    const { data: contractData, error: contractError } = await supabase
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
      .eq('id', invoice.contract_id)
      .single();

    if (contractError || !contractData) {
      return {
        success: false,
        errors: ['Contrato não encontrado']
      };
    }

    const client = contractData.clients;
    
    console.log(`📋 [ASAAS] Dados do contrato:`, {
      contractId: contractData.id,
      client: client,
      hasClient: !!client,
      clientId: client?.id,
      asaasCustomerId: client?.asaas_customer_id
    });

    // Verificar se cliente existe
    if (!client) {
      return {
        success: false,
        errors: ['Cliente não encontrado no contrato']
      };
    }

    // 2. Buscar configuração ASAAS
    const { data: configs, error: configError } = await supabase
      .from('system_config')
      .select('key, value')
      .in('key', ['asaas.api.key', 'asaas.environment']);
    
    if (configError) {
      return {
        success: false,
        errors: [`Erro ao buscar configuração ASAAS: ${configError.message}`]
      };
    }
    
    const asaasConfig = {};
    configs.forEach(config => {
      asaasConfig[config.key] = config.value;
    });
    
    if (!asaasConfig['asaas.api.key']) {
      return {
        success: false,
        errors: ['API Key ASAAS não encontrada']
      };
    }
    
    const environment = asaasConfig['asaas.environment'] || 'sandbox';
    const asaasUrl = environment === 'sandbox' 
      ? 'https://sandbox.asaas.com/api/v3' 
      : 'https://www.asaas.com/api/v3';
    console.log(`🌐 [ASAAS] Usando URL ASAAS: ${asaasUrl} (Environment: ${environment})`);

    // 3. Verificar se cliente tem ID do ASAAS, se não tiver, criar automaticamente
    let customerId = client.asaas_customer_id;
    
    if (!customerId) {
      console.log(`🔄 [ASAAS] Cliente não possui ID do ASAAS. Criando cliente automaticamente...`);
      
      const customerData = {
        name: client.full_name,
        email: client.email,
        cpfCnpj: client.cpf_cnpj,
        phone: client.phone || '',
        externalReference: `client_${client.id}`
      };
      
      const customerResponse = await fetch(`${asaasUrl}/customers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'access_token': asaasConfig['asaas.api.key']
        },
        body: JSON.stringify(customerData)
      });
      
      if (!customerResponse.ok) {
        const errorText = await customerResponse.text();
        return {
          success: false,
          errors: [`Erro ao criar cliente no ASAAS: ${customerResponse.status} - ${errorText}`]
        };
      }
      
      const customerResult = await customerResponse.json();
      customerId = customerResult.id;
      
      console.log(`✅ [ASAAS] Cliente criado no ASAAS: ${customerId}`);
      
      // Atualizar cliente local com ID do ASAAS
      const { error: updateError } = await supabase
        .from('clients')
        .update({ asaas_customer_id: customerId })
        .eq('id', client.id);

      if (updateError) {
        console.error('❌ [ASAAS] Erro ao atualizar cliente com ID do ASAAS:', updateError);
        return {
          success: false,
          errors: [`Erro ao atualizar cliente local: ${updateError.message}`]
        };
      } else {
        console.log(`✅ [ASAAS] Cliente atualizado com ID do ASAAS: ${customerId}`);
        client.asaas_customer_id = customerId;
      }
    } else {
      console.log(`✅ [ASAAS] Cliente já existe no ASAAS: ${customerId}`);
    }

    // 4. Criar fatura no ASAAS
    console.log(`📋 [ASAAS] Dados da fatura local:`, {
      id: invoice.id,
      amount: invoice.amount,
      due_date: invoice.due_date,
      installment_number: invoice.installment_number
    });

    const invoiceData = {
      customer: customerId,
      billingType: 'PIX',
      value: invoice.amount,
      dueDate: invoice.due_date,
      description: `Parcela ${invoice.installment_number} - ${invoice.notes}`,
      externalReference: `invoice_${invoice.id}`,
      installmentNumber: invoice.installment_number
    };
    
    console.log(`📋 [ASAAS] Dados para ASAAS:`, invoiceData);
    
    const invoiceResponse = await fetch(`${asaasUrl}/payments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'access_token': asaasConfig['asaas.api.key']
      },
      body: JSON.stringify(invoiceData)
    });
    
    if (!invoiceResponse.ok) {
      const errorText = await invoiceResponse.text();
      return {
        success: false,
        errors: [`Erro ao criar fatura no ASAAS: ${invoiceResponse.status} - ${errorText}`]
      };
    }
    
    const invoiceResult = await invoiceResponse.json();
    
    console.log(`✅ [ASAAS] Fatura criada no ASAAS:`, {
      id: invoiceResult.id, // pay_xxx (para referência)
      invoiceNumber: invoiceResult.invoiceNumber, // 11559883 (ID correto para API)
      pixQrCode: invoiceResult.pixQrCode ? 'Disponível' : 'N/A',
      bankSlipUrl: invoiceResult.bankSlipUrl ? 'Disponível' : 'N/A'
    });

    // 5. Atualizar fatura local com dados do ASAAS
    // Usar invoiceNumber ao invés de id para operações futuras na API
    const { error: updateInvoiceError } = await supabase
      .from('invoices')
      .update({
        invoice_code: invoiceResult.invoiceNumber, // Usar invoiceNumber (11559883) ao invés de id (pay_xxx)
        payment_link_pix: invoiceResult.pixQrCode,
        payment_link_boleto: invoiceResult.bankSlipUrl
      })
      .eq('id', invoice.id);

    if (updateInvoiceError) {
      console.error('❌ [ASAAS] Erro ao atualizar fatura local:', updateInvoiceError);
      return {
        success: false,
        errors: [`Erro ao atualizar fatura local: ${updateInvoiceError.message}`]
      };
    } else {
      console.log(`✅ [ASAAS] Fatura local atualizada com dados do ASAAS`);
    }

    return {
      success: true,
      asaasInvoiceId: invoiceResult.invoiceNumber, // Usar invoiceNumber para operações futuras
      pixQrCode: invoiceResult.pixQrCode,
      bankSlipUrl: invoiceResult.bankSlipUrl,
      fullResponse: invoiceResult, // Para debug
      errors: []
    };

  } catch (error) {
    console.error('❌ [ASAAS] Erro na função createInvoiceInAsaasInline:', error);
    return {
      success: false,
      errors: [error instanceof Error ? error.message : 'Erro desconhecido']
    };
  }
}

// Endpoint para testar integração ASAAS diretamente
app.get('/api/test/test-asaas-integration/:invoiceId', async (req, res) => {
  try {
    const invoiceId = parseInt(req.params.invoiceId);
    console.log(`🧪 [TEST] Testando integração ASAAS para fatura ${invoiceId}`);
    
    // Buscar fatura
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select('*')
      .eq('id', invoiceId)
      .single();
    
    if (invoiceError || !invoice) {
      throw new Error(`Fatura ${invoiceId} não encontrada`);
    }
    
    console.log(`📋 [TEST] Fatura encontrada:`, {
      id: invoice.id,
      contract_id: invoice.contract_id,
      amount: invoice.amount,
      due_date: invoice.due_date,
      installment_number: invoice.installment_number
    });
    
    // Testar integração ASAAS
    try {
      console.log(`🔄 [TEST] Chamando createInvoiceInAsaasInline...`);
      const asaasResult = await createInvoiceInAsaasInline(invoice);
      
      console.log(`📋 [TEST] Resultado ASAAS:`, asaasResult);
      
      res.json({
        success: true,
        invoice: invoice,
        asaasResult: asaasResult,
        message: 'Teste de integração ASAAS concluído'
      });
      
    } catch (asaasError) {
      console.error(`❌ [TEST] Erro na integração ASAAS:`, asaasError);
      res.json({
        success: false,
        invoice: invoice,
        error: asaasError.message,
        stack: asaasError.stack,
        message: 'Erro na integração ASAAS'
      });
    }
    
  } catch (error) {
    console.error('❌ [TEST] Erro geral:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
  }
});

// Endpoint para verificar datas reais das faturas
app.get('/api/test/invoice-dates/:contractId', async (req, res) => {
  try {
    const contractId = parseInt(req.params.contractId);
    console.log(`🧪 [TEST] Verificando datas das faturas para contrato ${contractId}`);
    
    // Buscar todas as faturas do contrato com TODOS os campos
    const { data: invoices, error: invoicesError } = await supabase
      .from('invoices')
      .select('*')
      .eq('contract_id', contractId)
      .order('installment_number');
    
    if (invoicesError) {
      throw new Error(`Erro ao buscar faturas: ${invoicesError.message}`);
    }
    
    res.json({
      success: true,
      contractId: contractId,
      invoices: invoices || [],
      totalInvoices: invoices?.length || 0,
      message: `Encontradas ${invoices?.length || 0} faturas para contrato ${contractId}`
    });
    
  } catch (error) {
    console.error('❌ [TEST] Erro na verificação de datas:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Endpoint para forçar criação de fatura para teste
app.get('/api/test/force-create-invoice/:contractId', async (req, res) => {
  try {
    const contractId = parseInt(req.params.contractId);
    console.log(`🧪 [TEST] Forçando criação de fatura para contrato ${contractId}`);
    
    // Buscar última fatura com next_invoice_date
    const { data: lastInvoice, error: lastError } = await supabase
      .from('invoices')
      .select('*')
      .eq('contract_id', contractId)
      .not('next_invoice_date', 'is', null)
      .order('installment_number', { ascending: false })
      .limit(1)
      .single();
    
    if (lastError && lastError.code !== 'PGRST116') {
      throw new Error(`Erro ao buscar última fatura: ${lastError.message}`);
    }
    
    if (!lastInvoice) {
      return res.json({
        success: false,
        message: 'Nenhuma fatura com next_invoice_date encontrada'
      });
    }
    
    // Temporariamente alterar next_invoice_date para hoje para forçar criação
    const today = new Date().toISOString().split('T')[0];
    const { error: updateError } = await supabase
      .from('invoices')
      .update({ next_invoice_date: today })
      .eq('id', lastInvoice.id);
    
    if (updateError) {
      throw new Error(`Erro ao atualizar next_invoice_date: ${updateError.message}`);
    }
    
    console.log(`✅ [TEST] next_invoice_date alterado para hoje (${today})`);
    
    res.json({
      success: true,
      message: `next_invoice_date alterado para hoje (${today}). Execute o cronjob agora.`,
      invoiceId: lastInvoice.id,
      nextInstallment: lastInvoice.installment_number + 1
    });
    
  } catch (error) {
    console.error('❌ [TEST] Erro ao forçar criação:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Endpoint para verificar se uma fatura será gerada pelo cronjob
app.get('/api/test/check-next-invoice/:contractId', async (req, res) => {
  try {
    const contractId = parseInt(req.params.contractId);
    console.log(`🧪 [TEST] Verificando próxima fatura para contrato ${contractId}`);
    
    // Buscar última fatura com next_invoice_date
    const { data: lastInvoice, error: lastError } = await supabase
      .from('invoices')
      .select('*')
      .eq('contract_id', contractId)
      .not('next_invoice_date', 'is', null)
      .order('installment_number', { ascending: false })
      .limit(1)
      .single();
    
    if (lastError && lastError.code !== 'PGRST116') { // PGRST116 = no rows returned
      throw new Error(`Erro ao buscar última fatura: ${lastError.message}`);
    }
    
    const today = new Date().toISOString().split('T')[0];
    const willRunToday = lastInvoice ? lastInvoice.next_invoice_date <= today : false;
    const nextInstallment = lastInvoice ? lastInvoice.installment_number + 1 : null;
    
    // Buscar dados do contrato para contexto
    const { data: contract, error: contractError } = await supabase
      .from('contracts')
      .select('id, status, credit_amount, id_faixa_de_credito')
      .eq('id', contractId)
      .single();
    
    // Buscar faixa de crédito
    let creditRange = null;
    if (contract && contract.id_faixa_de_credito) {
      const { data: range, error: rangeError } = await supabase
        .from('faixas_de_credito')
        .select('valor_primeira_parcela, valor_parcelas_restantes, numero_total_parcelas')
        .eq('id', contract.id_faixa_de_credito)
        .single();
      
      if (!rangeError) {
        creditRange = range;
      }
    }
    
    res.json({
      success: true,
      contract: contract,
      creditRange: creditRange,
      lastInvoice: lastInvoice,
      willRunToday: willRunToday,
      nextInstallment: nextInstallment,
      today: today,
      message: lastInvoice 
        ? `Próxima fatura será a parcela ${nextInstallment} em ${lastInvoice.next_invoice_date}`
        : 'Nenhuma fatura agendada para este contrato'
    });
    
  } catch (error) {
    console.error('❌ [TEST] Erro na verificação:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Endpoint de teste para verificar conexão com Supabase
app.get('/api/test/supabase-connection', async (req, res) => {
  try {
    console.log('🧪 [TEST] Testando conexão com Supabase');
    
    // Teste simples: buscar um contrato
    const { data: contracts, error } = await supabase
      .from('contracts')
      .select('id, status')
      .limit(1);
    
    if (error) {
      console.error('❌ [TEST] Erro na conexão:', error);
      res.json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    } else {
      console.log('✅ [TEST] Conexão OK:', contracts);
      res.json({
        success: true,
        message: 'Conexão com Supabase funcionando',
        data: contracts,
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    console.error('❌ [TEST] Erro geral:', error);
    res.json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Endpoint para testar query simples do contrato
app.get('/api/test/contract-simple/:contractId', async (req, res) => {
  try {
    const { contractId } = req.params;
    
    console.log(`🔍 [TEST] Testando query simples do contrato ${contractId}...`);
    
    // Query mais simples para debug
    const { data, error } = await supabase
      .from("contracts")
      .select(`
        id,
        contract_number,
        quota_id,
        clients (
          full_name,
          email
        ),
        planos (
          nome,
          "commission-percentage"
        )
      `)
      .eq('id', contractId)
      .single();

    if (error) {
      console.error('❌ [TEST] Erro na query simples:', error);
      return res.status(400).json({
        success: false,
        error: error.message,
        details: error
      });
    }

    console.log('✅ [TEST] Query simples funcionou:', data);

    // Agora buscar quota separadamente
    if (data.quota_id) {
      const { data: quotaData, error: quotaError } = await supabase
        .from("quotas")
        .select(`
          id,
          quota_number,
          groups!inner (
            id,
            name,
            description
          )
        `)
        .eq('id', data.quota_id)
        .single();

      if (quotaError) {
        console.error('❌ [TEST] Erro ao buscar quota:', quotaError);
      } else {
        console.log('✅ [TEST] Quota encontrada separadamente:', quotaData);
      }

      res.json({
        success: true,
        contract: data,
        quota: quotaData || null,
        quotaError: quotaError?.message || null
      });
    } else {
      res.json({
        success: true,
        contract: data,
        quota: null,
        quotaError: 'Contrato não possui quota_id'
      });
    }

  } catch (err) {
    console.error('❌ [TEST] Erro no teste:', err);
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

// Endpoint para verificar dados da quota específica
app.get('/api/test/quota/:quotaId', async (req, res) => {
  try {
    const { quotaId } = req.params;
    
    console.log(`🔍 [TEST] Verificando quota ID: ${quotaId}...`);
    
    const { data, error } = await supabase
      .from("quotas")
      .select(`
        id,
        quota_number,
        group_id,
        groups!inner (
          id,
          name,
          description
        )
      `)
      .eq('id', quotaId)
      .single();

    if (error) {
      console.error('❌ [TEST] Erro ao buscar quota:', error);
      return res.status(400).json({
        success: false,
        error: error.message,
        details: error
      });
    }

    console.log('✅ [TEST] Quota encontrada:', data);

    res.json({
      success: true,
      quota: data
    });

  } catch (err) {
    console.error('❌ [TEST] Erro no teste:', err);
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

// Endpoint para listar contratos disponíveis para teste
app.get('/api/test/contracts-list', async (req, res) => {
  try {
    console.log('🔍 [TEST] Listando contratos disponíveis...');
    
    const { data, error } = await supabase
      .from("contracts")
      .select(`
        id,
        contract_number,
        quota_id,
        created_at
      `)
      .order('id', { ascending: true })
      .limit(10);

    if (error) {
      console.error('❌ [TEST] Erro ao listar contratos:', error);
      return res.status(400).json({
        success: false,
        error: error.message,
        details: error
      });
    }

    console.log('✅ [TEST] Contratos encontrados:', data?.length || 0);

    res.json({
      success: true,
      contracts: data || [],
      count: data?.length || 0
    });

  } catch (err) {
    console.error('❌ [TEST] Erro no teste:', err);
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

// Endpoint para testar dados do contrato e quota
app.get('/api/test/contract-quota/:contractId', async (req, res) => {
  try {
    const { contractId } = req.params;
    
    console.log(`🔍 [TEST] Testando dados do contrato ${contractId}...`);
    
    // Primeiro buscar dados básicos do contrato
    const { data, error } = await supabase
      .from("contracts")
      .select(`
        *,
        clients!inner (
          id,
          full_name,
          email,
          phone,
          cpf_cnpj,
          address
        ),
        planos!inner (
          id,
          nome,
          descricao,
          comissao,
          "commission-percentage"
        ),
        profiles!inner (
          id,
          full_name,
          email,
          phone,
          commission_code
        ),
        invoices (
          id,
          invoice_code,
          amount,
          due_date,
          status,
          paid_at,
          payment_link_pix,
          payment_link_boleto
        )
      `)
      .eq('id', contractId)
      .single();

    if (error) {
      console.error('❌ [TEST] Erro ao buscar contrato:', error);
      return res.status(400).json({
        success: false,
        error: error.message,
        details: error
      });
    }

    if (!data) {
      return res.status(404).json({
        success: false,
        error: 'Contrato não encontrado'
      });
    }

    // Buscar dados da quota separadamente
    let quotaData = null;
    if (data.quota_id) {
      const { data: quota, error: quotaError } = await supabase
        .from("quotas")
        .select(`
          id,
          quota_number,
          groups!inner (
            id,
            name,
            description
          )
        `)
        .eq('id', data.quota_id)
        .single();

      if (quotaError) {
        console.error('❌ [TEST] Erro ao buscar quota:', quotaError);
      } else {
        quotaData = quota;
        console.log('✅ [TEST] Quota encontrada:', quotaData);
      }
    }

    console.log('✅ [TEST] Dados do contrato carregados:', {
      contractId: data.id,
      contractNumber: data.contract_number,
      quotaId: data.quota_id,
      quotaData: quotaData,
      hasQuota: !!quotaData
    });

    res.json({
      success: true,
      contract: {
        id: data.id,
        contract_number: data.contract_number,
        quota_id: data.quota_id,
        quota: quotaData ? {
          id: quotaData.id,
          quota_number: quotaData.quota_number,
          group: {
            id: quotaData.groups?.id || 0,
            name: quotaData.groups?.name || "Grupo não encontrado",
            description: quotaData.groups?.description || "Sem descrição"
          }
        } : null,
        client: {
          full_name: data.clients?.full_name,
          email: data.clients?.email
        },
        plan: {
          name: data.planos?.nome,
          commission_percentage: data.planos?.["commission-percentage"]
        }
      }
    });

  } catch (err) {
    console.error('❌ [TEST] Erro no teste:', err);
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

// Endpoint para listar contratos disponíveis
app.get('/api/debug/contracts', async (req, res) => {
  try {
    console.log('🔍 [DEBUG] Listando contratos disponíveis...');
    
    // Buscar contratos
    const { data: contracts, error: contractsError } = await supabase
      .from('contracts')
      .select('id, client_id, status, created_at')
      .order('id', { ascending: false })
      .limit(10);
    
    if (contractsError) {
      throw new Error(`Erro ao buscar contratos: ${contractsError.message}`);
    }
    
    console.log('📋 [DEBUG] Contratos encontrados:', contracts);
    
    res.json({
      success: true,
      contracts: contracts,
      message: 'Contratos obtidos com sucesso'
    });
  } catch (error) {
    console.error('❌ [DEBUG] Erro ao listar contratos:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.get('/api/debug/invoice/:invoiceId', async (req, res) => {
  try {
    const { invoiceId } = req.params;
    
    console.log(`🔍 [DEBUG] Verificando fatura ID: ${invoiceId}`);
    
    // Buscar fatura
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select('*')
      .eq('id', invoiceId)
      .single();
    
    if (invoiceError) {
      throw new Error(`Erro ao buscar fatura: ${invoiceError.message}`);
    }
    
    console.log('📋 [DEBUG] Fatura encontrada:', invoice);
    
    res.json({
      success: true,
      invoice: invoice,
      message: 'Fatura obtida com sucesso'
    });
  } catch (error) {
    console.error('❌ [DEBUG] Erro ao verificar fatura:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.get('/api/debug/payment-config', async (req, res) => {
  try {
    console.log('🔍 [DEBUG] Verificando configurações de pagamento...');
    
    // Buscar configurações de pagamento
    const { data: configs, error: configError } = await supabase
      .from('system_config')
      .select('key, value, description')
      .eq('category', 'payment')
      .order('key');
    
    if (configError) {
      throw new Error(`Erro ao buscar configurações: ${configError.message}`);
    }
    
    console.log('📋 [DEBUG] Configurações encontradas:', configs);
    
    res.json({
      success: true,
      configs: configs,
      message: 'Configurações de pagamento obtidas com sucesso'
    });
  } catch (error) {
    console.error('❌ [DEBUG] Erro ao verificar configurações:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Endpoint para atualizar configuração de dias de antecedência
app.post('/api/debug/update-days-advance', async (req, res) => {
  try {
    const { daysAdvance } = req.body;
    
    if (!daysAdvance || daysAdvance < 1 || daysAdvance > 30) {
      return res.status(400).json({
        success: false,
        error: 'Dias de antecedência deve ser entre 1 e 30'
      });
    }
    
    console.log(`🔧 [DEBUG] Atualizando dias de antecedência para: ${daysAdvance}`);
    
    // Atualizar configuração
    const { data, error } = await supabase
      .from('system_config')
      .upsert({
        key: 'payment.invoice.generation.days.advance',
        value: daysAdvance.toString(),
        description: 'Dias de antecedência para geração automática de faturas',
        category: 'payment',
        is_active: true,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'key'
      })
      .single();
    
    if (error) {
      throw new Error(`Erro ao atualizar configuração: ${error.message}`);
    }
    
    console.log('✅ [DEBUG] Configuração atualizada com sucesso');
    
    res.json({
      success: true,
      message: `Dias de antecedência atualizado para ${daysAdvance}`,
      config: data
    });
  } catch (error) {
    console.error('❌ [DEBUG] Erro ao atualizar configuração:', error);
    res.status(500).json({
      success: false,
      error: error.message
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
        message: '✅ Nenhuma fatura agendada para processar hoje. O sistema está funcionando corretamente!',
        result: result,
        timestamp: new Date().toISOString(),
        explanation: 'Faturas são criadas automaticamente quando a data de next_invoice_date chega. Verifique se há faturas com next_invoice_date definido.'
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
        const contractId = parseInt(invoice.contract_id);
        
        const { data: contract, error: contractError } = await supabase
          .from('contracts')
          .select('credit_amount, id_faixa_de_credito')
          .eq('id', contractId)
          .single();

        if (contractError) {
          throw new Error(`Erro ao buscar contrato ${invoice.contract_id}: ${contractError.message}`);
        }
        
        if (!contract) {
          throw new Error(`Contrato ${invoice.contract_id} não encontrado`);
        }

        // Buscar faixa de crédito para calcular valor correto
        const { data: creditRange, error: rangeError } = await supabase
          .from('faixas_de_credito')
          .select('valor_primeira_parcela, valor_parcelas_restantes, numero_total_parcelas')
          .eq('id', contract.id_faixa_de_credito)
          .single();

        if (rangeError || !creditRange) {
          throw new Error(`Faixa de crédito não encontrada para contrato ${invoice.contract_id}`);
        }

        // Calcular valor da próxima parcela
        let installmentValue;
        if (nextInstallmentNumber === 1) {
          installmentValue = creditRange.valor_primeira_parcela;
        } else {
          installmentValue = creditRange.valor_parcelas_restantes;
        }

        // Calcular datas usando regra simplificada
        const today = new Date();
        
        // Para faturas subsequentes: dia 20 do mês correspondente
        const dueDate = new Date(today);
        dueDate.setMonth(dueDate.getMonth() + (nextInstallmentNumber - 1));
        dueDate.setDate(20); // Dia fixo 20
        const dueDateStr = dueDate.toISOString().split('T')[0];
        
        // Próxima fatura será no dia 13 do próximo mês (7 dias antes do vencimento dia 20)
        const nextDueDate = new Date(dueDate);
        nextDueDate.setMonth(nextDueDate.getMonth() + 1);
        nextDueDate.setDate(13); // Dia 13 (7 dias antes do dia 20)
        const nextInvoiceDateStr = nextDueDate.toISOString().split('T')[0];

        console.log(`📅 Parcela ${nextInstallmentNumber}: Vencimento ${dueDateStr}, Próxima geração ${nextInvoiceDateStr}`);

        const newInvoice = {
          contract_id: invoice.contract_id,
          installment_number: nextInstallmentNumber,
          amount: installmentValue,
          due_date: dueDateStr,
          status: 'Pendente',
          notes: `Parcela ${nextInstallmentNumber} - automática`,
          next_invoice_date: nextInvoiceDateStr
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

        // Integrar com ASAAS
        try {
          console.log(`🔄 [CRON TEST] Criando fatura no ASAAS para parcela ${nextInstallmentNumber}...`);
          
          // Criar fatura no ASAAS usando função inline
          const asaasResult = await createInvoiceInAsaasInline(createdInvoice);
          
          if (asaasResult.success) {
            console.log(`✅ [CRON TEST] Fatura criada no ASAAS: ${asaasResult.asaasInvoiceId} (invoiceNumber)`);
            console.log(`   PIX: ${asaasResult.pixQrCode ? 'Disponível' : 'N/A'}`);
            console.log(`   Boleto: ${asaasResult.bankSlipUrl ? 'Disponível' : 'N/A'}`);
          } else {
            console.warn(`⚠️ [CRON TEST] Falha ao criar fatura no ASAAS:`, asaasResult.errors);
          }
        } catch (asaasError) {
          console.error(`❌ [CRON TEST] Erro ao integrar com ASAAS:`, asaasError);
          // Não falhar o cronjob, apenas registrar o erro
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
          nextInvoiceDate: nextInvoiceDateStr
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

// Endpoint para testar se cliente existe no ASAAS
app.get('/api/test/asaas-customer/:customerId', async (req, res) => {
  try {
    const { customerId } = req.params;
    console.log(`🔍 Verificando cliente ASAAS: ${customerId}`);
    
    // Buscar configuração do ASAAS
    const { data: configs, error: configError } = await supabase
      .from('system_config')
      .select('key, value')
      .eq('category', 'asaas');
    
    if (configError) {
      throw new Error(`Erro ao buscar configuração ASAAS: ${configError.message}`);
    }
    
    const configMap = {};
    configs.forEach(config => {
      configMap[config.key] = config.value;
    });
    
    const apiKey = configMap['asaas.api.key'];
    const environment = configMap['asaas.environment'] || 'sandbox';
    const baseUrl = environment === 'sandbox' 
      ? 'https://sandbox.asaas.com/api/v3' 
      : 'https://www.asaas.com/api/v3';
    
    console.log(`🔧 Configuração ASAAS: Environment=${environment}, BaseUrl=${baseUrl}`);
    
    // Fazer requisição direta para o ASAAS
    const response = await fetch(`${baseUrl}/customers/${customerId}`, {
      method: 'GET',
      headers: {
        'access_token': apiKey,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      const customer = await response.json();
      console.log('✅ Cliente encontrado no ASAAS:', customer);
      res.json({
        success: true,
        message: 'Cliente encontrado no ASAAS',
        customer: customer,
        environment: environment
      });
    } else {
      const errorData = await response.text();
      console.log('❌ Cliente não encontrado no ASAAS:', errorData);
      res.json({
        success: false,
        message: 'Cliente não encontrado no ASAAS',
        customerId: customerId,
        environment: environment,
        error: errorData
      });
    }
  } catch (error) {
    console.error('❌ Erro ao verificar cliente ASAAS:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao verificar cliente ASAAS',
      error: error.message
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
