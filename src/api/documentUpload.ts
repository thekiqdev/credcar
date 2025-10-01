/**
 * API para upload de documentos para VPS
 * Salva em estrutura: documentos/{cpf}/{tipo_documento}/
 */

import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { Request, Response } from 'express';

// Configuração do multer para upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const { cpfCnpj, documentType } = req.body;
    
    // Limpar CPF/CNPJ (remover caracteres especiais)
    const cleanCpfCnpj = cpfCnpj.replace(/[^0-9]/g, '');
    
    // Criar estrutura de pastas
    const baseDir = path.join(process.cwd(), 'documentos');
    const cpfDir = path.join(baseDir, cleanCpfCnpj);
    const docTypeDir = path.join(cpfDir, documentType.toLowerCase().replace(/[^a-z0-9]/g, '_'));
    
    // Criar diretórios se não existirem
    if (!fs.existsSync(baseDir)) {
      fs.mkdirSync(baseDir, { recursive: true });
    }
    if (!fs.existsSync(cpfDir)) {
      fs.mkdirSync(cpfDir, { recursive: true });
    }
    if (!fs.existsSync(docTypeDir)) {
      fs.mkdirSync(docTypeDir, { recursive: true });
    }
    
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
    fileSize: 10 * 1024 * 1024, // 10MB
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
      cb(new Error('Tipo de arquivo não permitido'), false);
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
}

// Função para criar estrutura de pastas
const createDocumentStructure = (cpfCnpj: string, documentType: string): string => {
  const cleanCpfCnpj = cpfCnpj.replace(/[^0-9]/g, '');
  const sanitizedDocType = documentType.toLowerCase().replace(/[^a-z0-9]/g, '_');
  
  const baseDir = path.join(process.cwd(), 'documentos');
  const cpfDir = path.join(baseDir, cleanCpfCnpj);
  const docTypeDir = path.join(cpfDir, sanitizedDocType);
  
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

      // Criar estrutura de pastas
      const docTypeDir = createDocumentStructure(cpfCnpj, documentType);
      
      // Informações do documento
      const docInfo: DocumentInfo = {
        representativeId,
        cpfCnpj,
        documentType,
        fileName: req.file.originalname,
        fileSize: req.file.size,
        fileType: req.file.mimetype,
        filePath: req.file.path
      };

      // Salvar no banco de dados
      await saveDocumentToDatabase(docInfo);

      res.json({
        success: true,
        message: 'Documento enviado com sucesso',
        data: {
          filePath: docInfo.filePath,
          fileName: docInfo.fileName,
          fileSize: docInfo.fileSize,
          documentType: docInfo.documentType
        }
      });

    } catch (error) {
      console.error('Erro no upload:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Erro interno do servidor'
      });
    }
  }
];

// Rota para upload de múltiplos documentos
export const uploadMultipleDocuments = [
  upload.array('documents', 10), // Máximo 10 arquivos
  async (req: Request, res: Response) => {
    try {
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

      const results = [];
      const errors = [];

      for (const file of files) {
        try {
          const documentType = req.body[`documentType_${file.fieldname}`] || 'Documento';
          
          // Criar estrutura de pastas
          const docTypeDir = createDocumentStructure(cpfCnpj, documentType);
          
          // Informações do documento
          const docInfo: DocumentInfo = {
            representativeId,
            cpfCnpj,
            documentType,
            fileName: file.originalname,
            fileSize: file.size,
            fileType: file.mimetype,
            filePath: file.path
          };

          // Salvar no banco de dados
          await saveDocumentToDatabase(docInfo);

          results.push({
            fileName: docInfo.fileName,
            documentType: docInfo.documentType,
            filePath: docInfo.filePath,
            success: true
          });

        } catch (error) {
          errors.push({
            fileName: file.originalname,
            error: error instanceof Error ? error.message : 'Erro desconhecido'
          });
        }
      }

      res.json({
        success: errors.length === 0,
        message: `${results.length} documento(s) enviado(s) com sucesso`,
        data: {
          successful: results,
          errors: errors
        }
      });

    } catch (error) {
      console.error('Erro no upload múltiplo:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Erro interno do servidor'
      });
    }
  }
];

// Rota para listar documentos de um representante
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
    const docTypes = fs.readdirSync(baseDir);
    
    for (const docType of docTypes) {
      const docTypeDir = path.join(baseDir, docType);
      if (fs.statSync(docTypeDir).isDirectory()) {
        const files = fs.readdirSync(docTypeDir);
        
        for (const file of files) {
          const filePath = path.join(docTypeDir, file);
          const stats = fs.statSync(filePath);
          
          documents.push({
            fileName: file,
            documentType: docType,
            filePath: filePath,
            fileSize: stats.size,
            uploadedAt: stats.birthtime,
            modifiedAt: stats.mtime
          });
        }
      }
    }

    res.json({
      success: true,
      data: {
        documents,
        totalCount: documents.length
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
  listRepresentativeDocuments,
  downloadDocument
};
