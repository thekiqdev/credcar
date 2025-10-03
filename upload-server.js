import express from 'express';
import multer from 'multer';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

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
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Tipo de arquivo não permitido. Apenas PDF e imagens são aceitos.'), false);
    }
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

    // Criar estrutura de pastas para todos os tipos de documento
    const documentTypes = [
      'certidao_negativa_civil',
      'comprovante_endereco', 
      'cartao_cnpj_cpf',
      'certidao_antecedente_criminal'
    ];

    documentTypes.forEach(docType => {
      const docPath = path.join(folderPath, docType);
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

// Rota para upload de documentos
app.post('/api/upload-document', upload.single('file'), (req, res) => {
  try {
    console.log('📤 Recebendo upload...');
    console.log('📋 Body:', req.body);
    console.log('📁 File:', req.file);
    
    if (!req.file) {
      console.log('❌ Nenhum arquivo recebido');
      return res.status(400).json({ error: 'Nenhum arquivo foi enviado' });
    }

    const { cpfCnpj, documentType } = req.body;
    
    if (!cpfCnpj || !documentType) {
      console.log('❌ Dados obrigatórios faltando:', { cpfCnpj, documentType });
      return res.status(400).json({ error: 'CPF/CNPJ e tipo de documento são obrigatórios' });
    }

    // Criar estrutura de pastas correta
    const baseDir = path.join(__dirname, 'documentos');
    const sanitizedCpfCnpj = cpfCnpj.replace(/[^a-zA-Z0-9]/g, '');
    
    // Mapear tipos de documento para nomes corretos
    const documentTypeMap = {
      'certidão negativa civil': 'certidao_negativa_civil',
      'comprovante de endereço': 'comprovante_endereco',
      'cartão do cnpj/cpf': 'cartao_cnpj_cpf',
      'certidão de antecedente criminal': 'certidao_antecedente_criminal'
    };
    
    const sanitizedDocType = documentTypeMap[documentType.toLowerCase()] || 
      documentType.toLowerCase().replace(/[^a-z0-9]/g, '_');
    
    const finalPath = path.join(baseDir, sanitizedCpfCnpj, sanitizedDocType);
    
    // Criar diretório final se não existir
    fs.mkdirSync(finalPath, { recursive: true });
    
    // Mover arquivo do temp para o local final
    const finalFilePath = path.join(finalPath, req.file.filename);
    fs.renameSync(req.file.path, finalFilePath);

    const fileInfo = {
      originalName: req.file.originalname,
      filename: req.file.filename,
      path: finalFilePath,
      size: req.file.size,
      mimetype: req.file.mimetype,
      documentType: documentType,
      cpfCnpj: cpfCnpj,
      uploadedAt: new Date().toISOString()
    };

    console.log('✅ Arquivo enviado com sucesso:', fileInfo);

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
    const documentTypes = ['certidao_negativa_civil', 'comprovante_endereco', 'cartao_cnpj_cpf', 'certidao_antecedente_criminal'];

    documentTypes.forEach(docType => {
      const docPath = path.join(folderPath, docType);
      if (fs.existsSync(docPath)) {
        const docFiles = fs.readdirSync(docPath);
        docFiles.forEach(file => {
          files.push({
            name: file,
            type: docType,
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
  console.log(`📤 Upload endpoint: http://localhost:${PORT}/api/upload-document`);
  console.log(`📋 List files: http://localhost:${PORT}/api/list-files`);
  console.log(`⬇️ Download: http://localhost:${PORT}/api/download-file`);
  console.log(`🗑️ Delete file: http://localhost:${PORT}/api/delete-file`);
  console.log(`🗂️ Delete folder: http://localhost:${PORT}/api/delete-representative-folder`);
});
