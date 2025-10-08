/**
 * Serviço de Upload para Backend Node.js
 * Comunicação com servidor Express de upload
 * Suporte a 15 tipos de documentos organizados por categoria
 */

interface DocumentInfo {
  representativeId: string;
  cpfCnpj: string;
  documentType: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  category?: string;
  subType?: string;
}

interface UploadResult {
  success: boolean;
  message?: string;
  error?: string;
  data?: {
    filePath: string;
    fileName: string;
    directory: string;
    originalName: string;
    size: number;
    type: string;
    category?: string;
    subType?: string;
  };
}

interface FileInfo {
  name: string;
  path: string;
  size: number;
  type: string;
  uploadedAt: string;
  category?: string;
  subType?: string;
}

interface BatchUploadResult {
  success: boolean;
  message: string;
  data: {
    successful: Array<{
      fileName: string;
      documentType: string;
      category: string;
      subType: string;
      filePath: string;
      success: boolean;
    }>;
    errors: Array<{
      fileName: string;
      documentType: string;
      error: string;
    }>;
    summary: {
      total: number;
      successful: number;
      failed: number;
    };
  };
}

class UploadService {
  private baseUrl: string;

  constructor() {
    // URL do servidor de upload - detectar ambiente baseado no hostname
    const hostname = window.location.hostname;
    
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      // Desenvolvimento local
      this.baseUrl = 'http://localhost:3001/api';
    } else if (hostname === 'sistema.credcarmultimarcas.com.br') {
      // Produção - usar mesma URL do frontend (Nginx fará proxy)
      this.baseUrl = 'https://sistema.credcarmultimarcas.com.br/api';
    } else {
      // Fallback para outros domínios
      this.baseUrl = `${window.location.protocol}//${hostname}/api`;
    }
    
    console.log('🚀 UploadService inicializado');
    console.log('🌐 Base URL:', this.baseUrl);
    console.log('🏠 Hostname:', hostname);
    console.log('📋 Suporte a 15 tipos de documentos organizados por categoria');
  }

  /**
   * Verificar se o servidor está funcionando
   */
  async checkHealth(): Promise<boolean> {
    try {
      console.log('🔍 Verificando saúde do servidor...');
      console.log('📡 Endpoint:', `${this.baseUrl}/health`);
      
      const response = await fetch(`${this.baseUrl}/health`);
      const data = await response.json();
      
      const isHealthy = data.status === 'online';
      
      if (isHealthy) {
        console.log('✅ Servidor online:', data);
      } else {
        console.warn('⚠️ Servidor com problemas:', data);
      }
      
      return isHealthy;
    } catch (error) {
      console.error('❌ Servidor de upload não está funcionando:', error);
      console.error('🔗 URL tentada:', `${this.baseUrl}/health`);
      return false;
    }
  }

  /**
   * Criar estrutura de pastas do representante (nova estrutura)
   */
  async createRepresentativeFolder(representativeId: string, cpfCnpj: string = ''): Promise<UploadResult> {
    try {
      console.log('📁 Criando estrutura de pastas para representante...');
      console.log('👤 Representative ID:', representativeId);
      console.log('🔍 CPF/CNPJ recebido:', cpfCnpj);
      console.log('📡 Endpoint:', `${this.baseUrl}/create-folder`);
      
      // Validar CPF/CNPJ
      if (!cpfCnpj || cpfCnpj.trim() === '') {
        console.error('❌ CPF/CNPJ é obrigatório para criar pasta');
        throw new Error('CPF/CNPJ é obrigatório para criar pasta');
      }

      const requestBody = {
        representativeId,
        cpfCnpj
      };
      
      console.log('📤 Enviando requisição:', requestBody);

      const response = await fetch(`${this.baseUrl}/create-folder`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      const data = await response.json();
      
      console.log('📥 Resposta recebida:', data);

      if (data.success) {
        console.log('✅ Estrutura de pastas criada com sucesso');
        console.log('📂 Caminho base:', data.path);
        console.log('📋 Mensagem:', data.message);
        
        return {
          success: true,
          message: data.message,
          data: {
            filePath: data.path,
            fileName: '',
            directory: data.path,
            originalName: '',
            size: 0,
            type: ''
          }
        };
      } else {
        console.error('❌ Erro ao criar estrutura de pastas:', data.error);
        throw new Error(data.error || 'Erro ao criar estrutura de pastas');
      }
    } catch (error) {
      console.error('❌ Erro ao criar estrutura de pastas:', error);
      console.error('🔍 Detalhes do erro:', {
        representativeId,
        cpfCnpj,
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      };
    }
  }

  /**
   * Upload de documento para o servidor (com logs detalhados)
   */
  async uploadDocument(file: File, docInfo: DocumentInfo): Promise<UploadResult> {
    try {
      console.log('📤 Iniciando upload de documento...');
      console.log('📁 Arquivo:', {
        name: file.name,
        size: file.size,
        type: file.type,
        lastModified: new Date(file.lastModified).toISOString()
      });
      console.log('📋 Informações do documento:', {
        representativeId: docInfo.representativeId,
        documentType: docInfo.documentType,
        cpfCnpj: docInfo.cpfCnpj,
        category: docInfo.category,
        subType: docInfo.subType
      });
      console.log('📡 Endpoint:', `${this.baseUrl}/upload-document`);

      // Criar FormData
      const formData = new FormData();
      formData.append('file', file);
      formData.append('representativeId', docInfo.representativeId);
      formData.append('documentType', docInfo.documentType);
      formData.append('cpfCnpj', docInfo.cpfCnpj);

      console.log('📤 FormData criado com campos:', {
        file: file.name,
        representativeId: docInfo.representativeId,
        documentType: docInfo.documentType,
        cpfCnpj: docInfo.cpfCnpj
      });

      // Fazer upload
      console.log('🚀 Enviando requisição de upload...');
      const response = await fetch(`${this.baseUrl}/upload-document`, {
        method: 'POST',
        body: formData
      });

      console.log('📥 Resposta recebida:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok
      });

      const data = await response.json();
      console.log('📋 Dados da resposta:', data);

      if (data.success) {
        console.log('✅ Upload realizado com sucesso!');
        console.log('📂 Caminho do arquivo:', data.data.filePath);
        console.log('📊 Informações do arquivo:', {
          fileName: data.data.fileName,
          fileSize: data.data.fileSize,
          documentType: data.data.documentType,
          category: data.data.category,
          subType: data.data.subType
        });
        
        return {
          success: true,
          message: data.message,
          data: {
            filePath: data.data.filePath,
            fileName: data.data.fileName,
            directory: data.data.filePath,
            originalName: data.data.fileName,
            size: data.data.fileSize,
            type: data.data.documentType,
            category: data.data.category,
            subType: data.data.subType
          }
        };
      } else {
        console.error('❌ Erro no upload:', data.error);
        throw new Error(data.error || 'Erro no upload');
      }
    } catch (error) {
      console.error('❌ Erro no upload:', error);
      console.error('🔍 Detalhes do erro:', {
        fileName: file.name,
        fileSize: file.size,
        documentType: docInfo.documentType,
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      };
    }
  }

  /**
   * Upload em lote de múltiplos documentos
   */
  async uploadMultipleDocuments(files: File[], docInfo: DocumentInfo): Promise<BatchUploadResult> {
    try {
      console.log('📤 Iniciando upload em lote...');
      console.log('📊 Total de arquivos:', files.length);
      console.log('📋 Informações base:', {
        representativeId: docInfo.representativeId,
        cpfCnpj: docInfo.cpfCnpj
      });

      const formData = new FormData();
      
      // Adicionar arquivos
      files.forEach((file, index) => {
        formData.append('documents', file);
        console.log(`📁 Arquivo ${index + 1}:`, {
          name: file.name,
          size: file.size,
          type: file.type
        });
      });

      // Adicionar informações base
      formData.append('representativeId', docInfo.representativeId);
      formData.append('cpfCnpj', docInfo.cpfCnpj);

      console.log('📡 Endpoint:', `${this.baseUrl}/upload-multiple`);
      console.log('🚀 Enviando requisição de upload em lote...');

      const response = await fetch(`${this.baseUrl}/upload-multiple`, {
        method: 'POST',
        body: formData
      });

      const data = await response.json();
      console.log('📥 Resposta do upload em lote:', data);

      return data;
    } catch (error) {
      console.error('❌ Erro no upload em lote:', error);
      return {
        success: false,
        message: 'Erro no upload em lote',
        data: {
          successful: [],
          errors: files.map(file => ({
            fileName: file.name,
            documentType: 'Desconhecido',
            error: error instanceof Error ? error.message : 'Erro desconhecido'
          })),
          summary: {
            total: files.length,
            successful: 0,
            failed: files.length
          }
        }
      };
    }
  }

  /**
   * Upload em lote por categoria (empresa ou socio)
   */
  async uploadDocumentsByCategory(files: File[], docInfo: DocumentInfo, category: 'empresa' | 'socio'): Promise<BatchUploadResult> {
    try {
      console.log(`📤 Iniciando upload em lote para categoria: ${category}`);
      console.log('📊 Total de arquivos:', files.length);
      console.log('📋 Informações:', {
        representativeId: docInfo.representativeId,
        cpfCnpj: docInfo.cpfCnpj,
        category
      });

      const formData = new FormData();
      
      // Adicionar arquivos
      files.forEach((file, index) => {
        formData.append('documents', file);
        console.log(`📁 Arquivo ${index + 1} (${category}):`, {
          name: file.name,
          size: file.size,
          type: file.type
        });
      });

      // Adicionar informações
      formData.append('representativeId', docInfo.representativeId);
      formData.append('cpfCnpj', docInfo.cpfCnpj);
      formData.append('category', category);

      console.log('📡 Endpoint:', `${this.baseUrl}/upload-by-category`);
      console.log('🚀 Enviando requisição de upload por categoria...');

      const response = await fetch(`${this.baseUrl}/upload-by-category`, {
        method: 'POST',
        body: formData
      });

      const data = await response.json();
      console.log(`📥 Resposta do upload por categoria (${category}):`, data);

      return data;
    } catch (error) {
      console.error(`❌ Erro no upload por categoria (${category}):`, error);
      return {
        success: false,
        message: `Erro no upload por categoria (${category})`,
        data: {
          successful: [],
          errors: files.map(file => ({
            fileName: file.name,
            documentType: 'Desconhecido',
            error: error instanceof Error ? error.message : 'Erro desconhecido'
          })),
          summary: {
            total: files.length,
            successful: 0,
            failed: files.length
          }
        }
      };
    }
  }

  /**
   * Listar arquivos de um representante (nova estrutura)
   */
  async listRepresentativeFiles(representativeId: string, cpfCnpj?: string): Promise<FileInfo[]> {
    try {
      console.log('📋 Listando arquivos do representante...');
      console.log('👤 Representative ID:', representativeId);
      console.log('🔍 CPF/CNPJ:', cpfCnpj || 'Não fornecido');
      
      const queryParams = new URLSearchParams({
        representativeId,
        ...(cpfCnpj && { cpfCnpj })
      });
      
      const url = `${this.baseUrl}/list-files?${queryParams}`;
      console.log('📡 Endpoint:', url);

      const response = await fetch(url);
      const data = await response.json();
      
      console.log('📥 Resposta da listagem:', data);

      if (data.success) {
        console.log('✅ Arquivos listados com sucesso');
        console.log('📊 Total de arquivos:', data.data.totalCount);
        console.log('📂 Categorias:', data.data.categories);
        
        return data.data.documents.map((file: any) => ({
          name: file.fileName,
          path: file.filePath,
          size: file.fileSize,
          type: file.documentType,
          uploadedAt: file.uploadedAt,
          category: file.category,
          subType: file.subType
        }));
      } else {
        console.error('❌ Erro ao listar arquivos:', data.error);
        return [];
      }
    } catch (error) {
      console.error('❌ Erro ao listar arquivos:', error);
      console.error('🔍 Detalhes do erro:', {
        representativeId,
        cpfCnpj,
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });
      return [];
    }
  }

  /**
   * Deletar arquivo
   */
  async deleteFile(filePath: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/delete-file`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ filePath })
      });

      const data = await response.json();
      return data.success;
    } catch (error) {
      console.error('❌ Erro ao deletar arquivo:', error);
      return false;
    }
  }

  /**
   * Upload completo: criar pastas + upload
   */
  async uploadComplete(file: File, docInfo: DocumentInfo): Promise<UploadResult> {
    try {
      // 1. Criar estrutura de pastas
      const folderResult = await this.createRepresentativeFolder(docInfo.representativeId, docInfo.cpfCnpj);
      
      if (!folderResult.success) {
        return folderResult;
      }

      // 2. Fazer upload do arquivo
      const uploadResult = await this.uploadDocument(file, docInfo);
      
      return uploadResult;
    } catch (error) {
      console.error('❌ Erro no upload completo:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      };
    }
  }

  /**
   * Deletar pasta completa do representante
   */
  async deleteRepresentativeFolder(representativeId: string, cpfCnpj: string = ''): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/delete-representative-folder`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ representativeId, cpfCnpj })
      });

      const data = await response.json();
      
      if (data.success) {
        console.log('✅ Pasta do representante deletada:', data.deletedPath);
        return true;
      } else {
        console.error('❌ Erro ao deletar pasta:', data.error);
        return false;
      }
    } catch (error) {
      console.error('❌ Erro ao deletar pasta do representante:', error);
      return false;
    }
  }

  /**
   * Verificar status do servidor
   */
  async getServerStatus(): Promise<{ online: boolean; message: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/health`);
      const data = await response.json();
      
      return {
        online: data.status === 'online',
        message: data.message || 'Servidor funcionando'
      };
    } catch (error) {
      return {
        online: false,
        message: 'Servidor offline'
      };
    }
  }
}

// Instância global
export const uploadService = new UploadService();

// Exportar também a classe
export { UploadService };

// Tipos para uso externo
export type { DocumentInfo, UploadResult, FileInfo, BatchUploadResult };
