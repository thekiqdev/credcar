/**
 * Serviço para upload de documentos para VPS
 * Comunica com a API backend
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
    fileSize: number;
    documentType: string;
  };
}

interface MultipleUploadResult {
  success: boolean;
  message?: string;
  error?: string;
  data?: {
    successful: Array<{
      fileName: string;
      documentType: string;
      filePath: string;
      success: boolean;
    }>;
    errors: Array<{
      fileName: string;
      error: string;
    }>;
  };
}

class VPSUploadService {
  private baseUrl: string;

  constructor() {
    // URL da sua API backend - usar URL fixa para evitar problemas com process.env
    this.baseUrl = 'http://localhost:3001/api';
  }

  /**
   * Upload de documento único
   */
  async uploadSingleDocument(file: File, docInfo: DocumentInfo): Promise<UploadResult> {
    try {
      const formData = new FormData();
      formData.append('document', file);
      formData.append('representativeId', docInfo.representativeId);
      formData.append('cpfCnpj', docInfo.cpfCnpj);
      formData.append('documentType', docInfo.documentType);

      const response = await fetch(`${this.baseUrl}/documents/upload-single`, {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Erro no upload');
      }

      return result;
    } catch (error) {
      console.error('Erro no upload:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      };
    }
  }

  /**
   * Upload de múltiplos documentos
   */
  async uploadMultipleDocuments(
    files: File[], 
    docInfo: Omit<DocumentInfo, 'fileName' | 'fileSize' | 'fileType'>,
    documentTypes: string[]
  ): Promise<MultipleUploadResult> {
    try {
      const formData = new FormData();
      
      // Adicionar arquivos
      files.forEach((file, index) => {
        formData.append('documents', file);
        formData.append(`documentType_${index}`, documentTypes[index] || 'Documento');
      });

      formData.append('representativeId', docInfo.representativeId);
      formData.append('cpfCnpj', docInfo.cpfCnpj);

      const response = await fetch(`${this.baseUrl}/documents/upload-multiple`, {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Erro no upload múltiplo');
      }

      return result;
    } catch (error) {
      console.error('Erro no upload múltiplo:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      };
    }
  }

  /**
   * Listar documentos de um representante
   */
  async listRepresentativeDocuments(representativeId: string, cpfCnpj: string) {
    try {
      const response = await fetch(
        `${this.baseUrl}/documents/list?representativeId=${representativeId}&cpfCnpj=${cpfCnpj}`
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Erro ao listar documentos');
      }

      return result;
    } catch (error) {
      console.error('Erro ao listar documentos:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      };
    }
  }

  /**
   * Baixar documento
   */
  async downloadDocument(filePath: string): Promise<Blob | null> {
    try {
      const response = await fetch(`${this.baseUrl}/documents/download/${encodeURIComponent(filePath)}`);

      if (!response.ok) {
        throw new Error('Erro ao baixar documento');
      }

      return await response.blob();
    } catch (error) {
      console.error('Erro ao baixar documento:', error);
      return null;
    }
  }

  /**
   * Verificar se a API está disponível
   */
  async checkAPIHealth(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/health`);
      return response.ok;
    } catch (error) {
      console.error('API não disponível:', error);
      return false;
    }
  }
}

// Instância singleton
export const vpsUploadService = new VPSUploadService();

// Exportar também a classe para casos especiais
export { VPSUploadService };

// Tipos para uso externo
export type { DocumentInfo, UploadResult, MultipleUploadResult };
