/**
 * API para upload de documentos para VPS
 * Salva em estrutura: documentos/{cpf}/empresa/{tipo_documento}/ e documentos/{cpf}/socio/{tipo_documento}/
 * Suporte a 15 tipos de documentos organizados por categoria
 */

import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { Request, Response } from 'express';

// Mapeamento de tipos de documento para nova estrutura
const documentTypeMap = {
  // Documentos da Empresa
  'cartilha de credenciamento preenchida': 'empresa/cartilha_credenciamento_empresa',
  'cartão cnpj': 'empresa/cartao_cnpj',
  'contrato social e última alteração': 'empresa/contrato_social',
  'comprovante de endereço empresa': 'empresa/comprovante_endereco_empresa',
  'dados bancários': 'empresa/dados_bancarios',
  
  // Documentos do Sócio
  'cartilha de credenciamento pf': 'socio/cartilha_credenciamento_pf',
  'comprovante de endereço sócio': 'socio/comprovante_endereco_socio',
  'certidão de antecedentes criminais': 'socio/certidao_antecedentes_criminais',
  'certidão negativa cível 1º grau': 'socio/certidao_negativa_civel_1grau',
  'certidão negativa criminal 1º grau': 'socio/certidao_negativa_criminal_1grau',
  'foto identidade frente': 'socio/foto_identidade_frente',
  'foto identidade verso': 'socio/foto_identidade_verso',
  
  // Compatibilidade com documentos antigos
  'certidão negativa civil': 'socio/certidao_negativa_civel_1grau',
  'comprovante de endereço': 'empresa/comprovante_endereco_empresa',
  'cartão do cnpj/cpf': 'empresa/cartao_cnpj',
  'certidão de antecedente criminal': 'socio/certidao_antecedentes_criminais'
};

// Validações específicas por tipo de documento
const documentValidations = {
  // Documentos da Empresa
  'cartilha de credenciamento preenchida': { maxSize: 5 * 1024 * 1024, requiredTypes: ['application/pdf'] },
  'cartão cnpj': { maxSize: 2 * 1024 * 1024, requiredTypes: ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'] },
  'contrato social e última alteração': { maxSize: 10 * 1024 * 1024, requiredTypes: ['application/pdf'] },
  'comprovante de endereço empresa': { maxSize: 2 * 1024 * 1024, requiredTypes: ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'] },
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

// Configuração do multer para upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const { cpfCnpj, documentType } = req.body;
    
    // Limpar CPF/CNPJ (remover caracteres especiais)
    const cleanCpfCnpj = cpfCnpj.replace(/[^0-9]/g, '');
    
    // Mapear tipo de documento para nova estrutura
    const mappedPath = documentTypeMap[documentType.toLowerCase()] || 
      documentType.toLowerCase().replace(/[^a-z0-9]/g, '_');
    
    // Criar estrutura de pastas
    const baseDir = path.join(process.cwd(), 'documentos');
    const cpfDir = path.join(baseDir, cleanCpfCnpj);
    const docTypeDir = path.join(cpfDir, mappedPath);
    
    // Criar diretórios recursivamente
    [baseDir, cpfDir, docTypeDir].forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
    
    cb(null, docTypeDir);
  },
  filename: (req, file, cb) => {
    // Nome do arquivo: timestamp-originalname
    const timestamp = Date.now();
    const originalName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    cb(null, `${timestamp}-${originalName}`);
  }
});

const upload = multer({ 
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB
  },
  fileFilter: (req, file, cb) => {
    // Tipos de arquivo permitidos
    const allowedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/jpg', 
      'image/png',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Tipo de arquivo não permitido') as any, false);
    }
  }
});

// Interface para dados do documento
interface DocumentInfo {
  representativeId: string;
  cpfCnpj: string;
  documentType: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  filePath: string;
  category?: string;
  subType?: string;
}

// Interface para validação de documentos
interface DocumentValidation {
  maxSize: number;
  requiredTypes: string[];
}

// Função para validar documento específico
const validateDocument = (documentType: string, file: Express.Multer.File): { valid: boolean; error?: string } => {
  const validation = documentValidations[documentType.toLowerCase()];
  
  if (!validation) {
    return { valid: true }; // Se não há validação específica, aceita
  }
  
  // Verificar tamanho do arquivo
  if (file.size > validation.maxSize) {
    const maxSizeMB = validation.maxSize / (1024 * 1024);
    return { 
      valid: false, 
      error: `Arquivo muito grande. Tamanho máximo permitido: ${maxSizeMB}MB` 
    };
  }
  
  // Verificar tipo do arquivo
  if (!validation.requiredTypes.includes(file.mimetype)) {
    return { 
      valid: false, 
      error: `Tipo de arquivo não permitido para ${documentType}. Tipos aceitos: ${validation.requiredTypes.join(', ')}` 
    };
  }
  
  return { valid: true };
};

// Função para criar estrutura de pastas (nova estrutura)
const createDocumentStructure = (cpfCnpj: string, documentType: string): string => {
  const cleanCpfCnpj = cpfCnpj.replace(/[^0-9]/g, '');
  
  // Mapear tipo de documento para nova estrutura
  const mappedPath = documentTypeMap[documentType.toLowerCase()] || 
    documentType.toLowerCase().replace(/[^a-z0-9]/g, '_');
  
  const baseDir = path.join(process.cwd(), 'documentos');
  const cpfDir = path.join(baseDir, cleanCpfCnpj);
  const docTypeDir = path.join(cpfDir, mappedPath);
  
  // Criar diretórios recursivamente
  [baseDir, cpfDir, docTypeDir].forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
  
  return docTypeDir;
};

// Função para salvar informações no banco
const saveDocumentToDatabase = async (docInfo: DocumentInfo): Promise<void> => {
  // Aqui você integraria com seu banco de dados
  // Por exemplo, usando Supabase client
  const { createClient } = require('@supabase/supabase-js');
  
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );
  
  const { error } = await supabase
    .from('representative_documents')
    .insert({
      representative_id: docInfo.representativeId,
      document_type: docInfo.documentType,
      file_url: docInfo.filePath, // Caminho local no VPS
      status: 'Pendente',
      uploaded_at: new Date().toISOString()
    });
    
  if (error) {
    throw new Error(`Erro ao salvar no banco: ${error.message}`);
  }
};

// Rota para upload de documento único
export const uploadSingleDocument = [
  upload.single('document'),
  async (req: Request, res: Response) => {
    try {
      console.log('📤 Upload único iniciado');
      console.log('📋 Body:', req.body);
      console.log('📁 File:', req.file);
      
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: 'Nenhum arquivo enviado'
        });
      }

      const { representativeId, cpfCnpj, documentType } = req.body;
      
      if (!representativeId || !cpfCnpj || !documentType) {
        return res.status(400).json({
          success: false,
          error: 'Dados obrigatórios não fornecidos'
        });
      }

      // Validar documento específico
      const validation = validateDocument(documentType, req.file);
      if (!validation.valid) {
        return res.status(400).json({
          success: false,
          error: validation.error
        });
      }

      // Criar estrutura de pastas
      const docTypeDir = createDocumentStructure(cpfCnpj, documentType);
      
      // Determinar categoria e subTipo
      const mappedPath = documentTypeMap[documentType.toLowerCase()];
      const [category, subType] = mappedPath ? mappedPath.split('/') : ['unknown', documentType];
      
      // Informações do documento
      const docInfo: DocumentInfo = {
        representativeId,
        cpfCnpj,
        documentType,
        fileName: req.file.originalname,
        fileSize: req.file.size,
        fileType: req.file.mimetype,
        filePath: req.file.path,
        category,
        subType
      };

      console.log('✅ Validação aprovada:', {
        documentType,
        category,
        subType,
        fileSize: req.file.size,
        fileType: req.file.mimetype
      });

      // Salvar no banco de dados
      await saveDocumentToDatabase(docInfo);

      res.json({
        success: true,
        message: 'Documento enviado com sucesso',
        data: {
          filePath: docInfo.filePath,
          fileName: docInfo.fileName,
          fileSize: docInfo.fileSize,
          documentType: docInfo.documentType,
          category: docInfo.category,
          subType: docInfo.subType
        }
      });

    } catch (error) {
      console.error('❌ Erro no upload:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Erro interno do servidor'
      });
    }
  }
];

// Rota para upload de múltiplos documentos (upload em lote)
export const uploadMultipleDocuments = [
  upload.array('documents', 15), // Máximo 15 arquivos (todos os tipos)
  async (req: Request, res: Response) => {
    try {
      console.log('📤 Upload em lote iniciado');
      
      const files = req.files as Express.Multer.File[];
      
      if (!files || files.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Nenhum arquivo enviado'
        });
      }

      const { representativeId, cpfCnpj } = req.body;
      
      if (!representativeId || !cpfCnpj) {
        return res.status(400).json({
          success: false,
          error: 'Representative ID e CPF/CNPJ são obrigatórios'
        });
      }

      console.log(`📊 Processando ${files.length} arquivo(s)`);

      const results = [];
      const errors = [];

      for (const file of files) {
        try {
          // Obter tipo de documento do campo correspondente
          const documentType = req.body[`documentType_${file.fieldname}`] || 
                             req.body[`documentType_${file.originalname}`] || 
                             'Documento';
          
          console.log(`🔍 Processando: ${file.originalname} (${documentType})`);
          
          // Validar documento específico
          const validation = validateDocument(documentType, file);
          if (!validation.valid) {
            errors.push({
              fileName: file.originalname,
              documentType,
              error: validation.error
            });
            continue;
          }
          
          // Criar estrutura de pastas
          const docTypeDir = createDocumentStructure(cpfCnpj, documentType);
          
          // Determinar categoria e subTipo
          const mappedPath = documentTypeMap[documentType.toLowerCase()];
          const [category, subType] = mappedPath ? mappedPath.split('/') : ['unknown', documentType];
          
          // Informações do documento
          const docInfo: DocumentInfo = {
            representativeId,
            cpfCnpj,
            documentType,
            fileName: file.originalname,
            fileSize: file.size,
            fileType: file.mimetype,
            filePath: file.path,
            category,
            subType
          };

          // Salvar no banco de dados
          await saveDocumentToDatabase(docInfo);

          results.push({
            fileName: docInfo.fileName,
            documentType: docInfo.documentType,
            category: docInfo.category,
            subType: docInfo.subType,
            filePath: docInfo.filePath,
            success: true
          });

          console.log(`✅ Sucesso: ${file.originalname}`);

        } catch (error) {
          console.error(`❌ Erro em ${file.originalname}:`, error);
          errors.push({
            fileName: file.originalname,
            documentType: req.body[`documentType_${file.fieldname}`] || 'Desconhecido',
            error: error instanceof Error ? error.message : 'Erro desconhecido'
          });
        }
      }

      console.log(`📊 Resultado: ${results.length} sucesso(s), ${errors.length} erro(s)`);

      res.json({
        success: errors.length === 0,
        message: `${results.length} documento(s) enviado(s) com sucesso`,
        data: {
          successful: results,
          errors: errors,
          summary: {
            total: files.length,
            successful: results.length,
            failed: errors.length
          }
        }
      });

    } catch (error) {
      console.error('❌ Erro no upload múltiplo:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Erro interno do servidor'
      });
    }
  }
];

// Rota para listar documentos de um representante (nova estrutura)
export const listRepresentativeDocuments = async (req: Request, res: Response) => {
  try {
    const { representativeId, cpfCnpj } = req.query;
    
    if (!representativeId || !cpfCnpj) {
      return res.status(400).json({
        success: false,
        error: 'Representative ID e CPF/CNPJ são obrigatórios'
      });
    }

    const cleanCpfCnpj = (cpfCnpj as string).replace(/[^0-9]/g, '');
    const baseDir = path.join(process.cwd(), 'documentos', cleanCpfCnpj);
    
    if (!fs.existsSync(baseDir)) {
      return res.json({
        success: true,
        data: {
          documents: [],
          message: 'Nenhum documento encontrado'
        }
      });
    }

    const documents = [];
    
    // Listar documentos da nova estrutura (empresa e socio)
    const empresaPath = path.join(baseDir, 'empresa');
    const socioPath = path.join(baseDir, 'socio');
    
    // Função para listar arquivos de uma categoria
    const listFilesInCategory = (categoryPath: string, category: string) => {
      if (fs.existsSync(categoryPath)) {
        const subDirs = fs.readdirSync(categoryPath, { withFileTypes: true })
          .filter(dirent => dirent.isDirectory())
          .map(dirent => dirent.name);
        
        subDirs.forEach(subDir => {
          const docPath = path.join(categoryPath, subDir);
          if (fs.existsSync(docPath)) {
            const files = fs.readdirSync(docPath);
            
            files.forEach(file => {
              const filePath = path.join(docPath, file);
              const stats = fs.statSync(filePath);
              
              documents.push({
                fileName: file,
                documentType: `${category}/${subDir}`,
                category: category,
                subType: subDir,
                filePath: filePath,
                fileSize: stats.size,
                uploadedAt: stats.birthtime,
                modifiedAt: stats.mtime
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
      const docPath = path.join(baseDir, docType);
      if (fs.existsSync(docPath)) {
        const files = fs.readdirSync(docPath);
        
        files.forEach(file => {
          const filePath = path.join(docPath, file);
          const stats = fs.statSync(filePath);
          
          documents.push({
            fileName: file,
            documentType: docType,
            category: 'legacy',
            subType: docType,
            filePath: filePath,
            fileSize: stats.size,
            uploadedAt: stats.birthtime,
            modifiedAt: stats.mtime
          });
        });
      }
    });

    res.json({
      success: true,
      data: {
        documents,
        totalCount: documents.length,
        categories: {
          empresa: documents.filter(d => d.category === 'empresa').length,
          socio: documents.filter(d => d.category === 'socio').length,
          legacy: documents.filter(d => d.category === 'legacy').length
        }
      }
    });

  } catch (error) {
    console.error('Erro ao listar documentos:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro interno do servidor'
    });
  }
};

// Rota para upload em lote por categoria (empresa ou socio)
export const uploadDocumentsByCategory = [
  upload.array('documents', 10), // Máximo 10 arquivos por categoria
  async (req: Request, res: Response) => {
    try {
      console.log('📤 Upload por categoria iniciado');
      
      const files = req.files as Express.Multer.File[];
      const { representativeId, cpfCnpj, category } = req.body;
      
      if (!files || files.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Nenhum arquivo enviado'
        });
      }

      if (!representativeId || !cpfCnpj || !category) {
        return res.status(400).json({
          success: false,
          error: 'Representative ID, CPF/CNPJ e categoria são obrigatórios'
        });
      }

      if (!['empresa', 'socio'].includes(category)) {
        return res.status(400).json({
          success: false,
          error: 'Categoria deve ser "empresa" ou "socio"'
        });
      }

      console.log(`📊 Processando ${files.length} arquivo(s) para categoria: ${category}`);

      const results = [];
      const errors = [];

      for (const file of files) {
        try {
          // Obter tipo de documento do campo correspondente
          const documentType = req.body[`documentType_${file.fieldname}`] || 
                             req.body[`documentType_${file.originalname}`] || 
                             'Documento';
          
          console.log(`🔍 Processando: ${file.originalname} (${documentType})`);
          
          // Validar documento específico
          const validation = validateDocument(documentType, file);
          if (!validation.valid) {
            errors.push({
              fileName: file.originalname,
              documentType,
              error: validation.error
            });
            continue;
          }
          
          // Criar estrutura de pastas
          const docTypeDir = createDocumentStructure(cpfCnpj, documentType);
          
          // Determinar subTipo
          const mappedPath = documentTypeMap[documentType.toLowerCase()];
          const [, subType] = mappedPath ? mappedPath.split('/') : ['unknown', documentType];
          
          // Informações do documento
          const docInfo: DocumentInfo = {
            representativeId,
            cpfCnpj,
            documentType,
            fileName: file.originalname,
            fileSize: file.size,
            fileType: file.mimetype,
            filePath: file.path,
            category,
            subType
          };

          // Salvar no banco de dados
          await saveDocumentToDatabase(docInfo);

          results.push({
            fileName: docInfo.fileName,
            documentType: docInfo.documentType,
            category: docInfo.category,
            subType: docInfo.subType,
            filePath: docInfo.filePath,
            success: true
          });

          console.log(`✅ Sucesso: ${file.originalname}`);

        } catch (error) {
          console.error(`❌ Erro em ${file.originalname}:`, error);
          errors.push({
            fileName: file.originalname,
            documentType: req.body[`documentType_${file.fieldname}`] || 'Desconhecido',
            error: error instanceof Error ? error.message : 'Erro desconhecido'
          });
        }
      }

      console.log(`📊 Resultado categoria ${category}: ${results.length} sucesso(s), ${errors.length} erro(s)`);

      res.json({
        success: errors.length === 0,
        message: `${results.length} documento(s) da categoria ${category} enviado(s) com sucesso`,
        data: {
          category,
          successful: results,
          errors: errors,
          summary: {
            total: files.length,
            successful: results.length,
            failed: errors.length
          }
        }
      });

    } catch (error) {
      console.error('❌ Erro no upload por categoria:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Erro interno do servidor'
      });
    }
  }
];

// Rota para baixar documento
export const downloadDocument = async (req: Request, res: Response) => {
  try {
    const { filePath } = req.params;
    
    if (!filePath) {
      return res.status(400).json({
        success: false,
        error: 'Caminho do arquivo não fornecido'
      });
    }

    const fullPath = path.join(process.cwd(), filePath);
    
    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({
        success: false,
        error: 'Arquivo não encontrado'
      });
    }

    res.download(fullPath);

  } catch (error) {
    console.error('Erro ao baixar documento:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro interno do servidor'
    });
  }
};

export default {
  uploadSingleDocument,
  uploadMultipleDocuments,
  uploadDocumentsByCategory,
  listRepresentativeDocuments,
  downloadDocument
};
