/**
 * Serviço de Upload para Backend Node.js
 * Comunicação com servidor Express de upload
 */

interface DocumentInfo {
  representativeId: string;
  cpfCnpj: string;
  documentType: string;
  fileName: string;
  fileSize: number;
  fileType: string;
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
  };
}

interface FileInfo {
  name: string;
  path: string;
  size: number;
  type: string;
  uploadedAt: string;
}

class UploadService {
  private baseUrl: string;

  constructor() {
    // URL do servidor de upload - usar localhost em desenvolvimento
    if (import.meta.env.DEV) {
      this.baseUrl = 'http://localhost:3001/api';
    } else {
      this.baseUrl = 'https://sistema.credcarmultimarcas.com.br/api';
    }
  }

  /**
   * Verificar se o servidor está funcionando
   */
  async checkHealth(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/health`);
      const data = await response.json();
      return data.status === 'online';
    } catch (error) {
      console.error('❌ Servidor de upload não está funcionando:', error);
      return false;
    }
  }

  /**
   * Criar estrutura de pastas do representante
   */
  async createRepresentativeFolder(representativeId: string, cpfCnpj: string = ''): Promise<UploadResult> {
    try {
      console.log('📁 Criando estrutura de pastas para:', representativeId);
      console.log('🔍 CPF/CNPJ recebido:', cpfCnpj);
      
      // Validar CPF/CNPJ
      if (!cpfCnpj || cpfCnpj.trim() === '') {
        throw new Error('CPF/CNPJ é obrigatório para criar pasta');
      }

      const response = await fetch(`${this.baseUrl}/create-folder`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          representativeId,
          cpfCnpj
        })
      });

      const data = await response.json();

      if (data.success) {
        console.log('✅ Estrutura de pastas criada:', data.basePath);
        return {
          success: true,
          message: data.message,
          data: {
            filePath: data.basePath,
            fileName: '',
            directory: data.basePath,
            originalName: '',
            size: 0,
            type: ''
          }
        };
      } else {
        throw new Error(data.error || 'Erro ao criar estrutura de pastas');
      }
    } catch (error) {
      console.error('❌ Erro ao criar estrutura de pastas:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      };
    }
  }

  /**
   * Upload de documento para o servidor
   */
  async uploadDocument(file: File, docInfo: DocumentInfo): Promise<UploadResult> {
    try {
      console.log('📤 Iniciando upload:', file.name);

      // Criar FormData
      const formData = new FormData();
      formData.append('file', file);
      formData.append('representativeId', docInfo.representativeId);
      formData.append('documentType', docInfo.documentType);
      formData.append('cpfCnpj', docInfo.cpfCnpj);

      // Fazer upload
      const response = await fetch(`${this.baseUrl}/upload-document`, {
        method: 'POST',
        body: formData
      });

      const data = await response.json();

      if (data.success) {
        console.log('✅ Upload realizado com sucesso:', data.data.filePath);
        return {
          success: true,
          message: data.message,
          data: data.data
        };
      } else {
        throw new Error(data.error || 'Erro no upload');
      }
    } catch (error) {
      console.error('❌ Erro no upload:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      };
    }
  }

  /**
   * Listar arquivos de um representante
   */
  async listRepresentativeFiles(representativeId: string): Promise<FileInfo[]> {
    try {
      const response = await fetch(`${this.baseUrl}/list-files/${representativeId}`);
      const data = await response.json();

      if (data.success) {
        return data.files.map((file: any) => ({
          name: file.name,
          path: file.path,
          size: file.size,
          type: file.type,
          uploadedAt: file.uploadedAt
        }));
      } else {
        console.error('❌ Erro ao listar arquivos:', data.error);
        return [];
      }
    } catch (error) {
      console.error('❌ Erro ao listar arquivos:', error);
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
export type { DocumentInfo, UploadResult, FileInfo };
