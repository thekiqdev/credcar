/**
 * Serviço para upload de documentos para VPS
 * Comunica com a API backend
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
    fileSize: number;
    documentType: string;
    category?: string;
    subType?: string;
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

class VPSUploadService {
  private baseUrl: string;

  constructor() {
    const envUrl = typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_UPLOAD_SERVER_URL;
    const base = typeof envUrl === 'string' && envUrl.trim()
      ? envUrl.trim().replace(/\/api\/?$/, '')
      : '';
    this.baseUrl = base ? `${base}/api` : 'http://localhost:3001/api';
    
    console.log('🚀 VPSUploadService inicializado');
    console.log('🌐 Base URL:', this.baseUrl);
    console.log('📋 Suporte a 15 tipos de documentos com validações específicas');
  }

  /**
   * Validar documento antes do upload
   */
  private validateDocument(documentType: string, file: File): { valid: boolean; error?: string } {
    const validation = documentValidations[documentType.toLowerCase()];
    
    if (!validation) {
      console.warn(`⚠️ Validação não encontrada para: ${documentType}`);
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
    if (!validation.requiredTypes.includes(file.type)) {
      return { 
        valid: false, 
        error: `Tipo de arquivo não permitido para ${documentType}. Tipos aceitos: ${validation.requiredTypes.join(', ')}` 
      };
    }
    
    return { valid: true };
  }

  /**
   * Upload de documento único (com logs detalhados e validações)
   */
  async uploadSingleDocument(file: File, docInfo: DocumentInfo): Promise<UploadResult> {
    try {
      console.log('📤 VPS Upload único iniciado...');
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

      // Validar documento antes do upload
      const validation = this.validateDocument(docInfo.documentType, file);
      if (!validation.valid) {
        console.error('❌ Validação falhou:', validation.error);
        return {
          success: false,
          error: validation.error
        };
      }

      console.log('✅ Validação aprovada');

      const formData = new FormData();
      formData.append('document', file);
      formData.append('representativeId', docInfo.representativeId);
      formData.append('cpfCnpj', docInfo.cpfCnpj);
      formData.append('documentType', docInfo.documentType);

      console.log('📡 Endpoint:', `${this.baseUrl}/documents/upload-single`);
      console.log('🚀 Enviando requisição...');

      const response = await fetch(`${this.baseUrl}/documents/upload-single`, {
        method: 'POST',
        body: formData,
      });

      console.log('📥 Resposta recebida:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok
      });

      const result = await response.json();
      console.log('📋 Dados da resposta:', result);

      if (!response.ok) {
        console.error('❌ Erro na resposta:', result.error);
        throw new Error(result.error || 'Erro no upload');
      }

      console.log('✅ Upload realizado com sucesso!');
      return result;
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
   * Upload de múltiplos documentos (com logs detalhados e validações)
   */
  async uploadMultipleDocuments(
    files: File[], 
    docInfo: Omit<DocumentInfo, 'fileName' | 'fileSize' | 'fileType'>,
    documentTypes: string[]
  ): Promise<MultipleUploadResult> {
    try {
      console.log('📤 VPS Upload múltiplo iniciado...');
      console.log('📊 Total de arquivos:', files.length);
      console.log('📋 Informações base:', {
        representativeId: docInfo.representativeId,
        cpfCnpj: docInfo.cpfCnpj
      });

      // Validar todos os arquivos antes do upload
      const validationErrors = [];
      files.forEach((file, index) => {
        const documentType = documentTypes[index] || 'Documento';
        const validation = this.validateDocument(documentType, file);
        if (!validation.valid) {
          validationErrors.push({
            fileName: file.name,
            documentType,
            error: validation.error!
          });
        }
      });

      if (validationErrors.length > 0) {
        console.error('❌ Validações falharam:', validationErrors);
        return {
          success: false,
          error: 'Validações falharam',
          data: {
            successful: [],
            errors: validationErrors,
            summary: {
              total: files.length,
              successful: 0,
              failed: validationErrors.length
            }
          }
        };
      }

      console.log('✅ Todas as validações aprovadas');

      const formData = new FormData();
      
      // Adicionar arquivos
      files.forEach((file, index) => {
        formData.append('documents', file);
        formData.append(`documentType_${index}`, documentTypes[index] || 'Documento');
        console.log(`📁 Arquivo ${index + 1}:`, {
          name: file.name,
          size: file.size,
          type: file.type,
          documentType: documentTypes[index]
        });
      });

      formData.append('representativeId', docInfo.representativeId);
      formData.append('cpfCnpj', docInfo.cpfCnpj);

      console.log('📡 Endpoint:', `${this.baseUrl}/documents/upload-multiple`);
      console.log('🚀 Enviando requisição de upload múltiplo...');

      const response = await fetch(`${this.baseUrl}/documents/upload-multiple`, {
        method: 'POST',
        body: formData,
      });

      console.log('📥 Resposta recebida:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok
      });

      const result = await response.json();
      console.log('📋 Dados da resposta:', result);

      if (!response.ok) {
        console.error('❌ Erro na resposta:', result.error);
        throw new Error(result.error || 'Erro no upload múltiplo');
      }

      console.log('✅ Upload múltiplo realizado com sucesso!');
      console.log('📊 Resumo:', result.data?.summary);
      
      return result;
    } catch (error) {
      console.error('❌ Erro no upload múltiplo:', error);
      console.error('🔍 Detalhes do erro:', {
        totalFiles: files.length,
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
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
   * Listar documentos de um representante (com logs detalhados)
   */
  async listRepresentativeDocuments(representativeId: string, cpfCnpj: string) {
    try {
      console.log('📋 VPS Listagem de documentos iniciada...');
      console.log('👤 Representative ID:', representativeId);
      console.log('🔍 CPF/CNPJ:', cpfCnpj);
      
      const url = `${this.baseUrl}/documents/list?representativeId=${representativeId}&cpfCnpj=${cpfCnpj}`;
      console.log('📡 Endpoint:', url);

      const response = await fetch(url);
      
      console.log('📥 Resposta recebida:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok
      });

      const result = await response.json();
      console.log('📋 Dados da resposta:', result);

      if (!response.ok) {
        console.error('❌ Erro na resposta:', result.error);
        throw new Error(result.error || 'Erro ao listar documentos');
      }

      console.log('✅ Documentos listados com sucesso');
      console.log('📊 Total de documentos:', result.data?.totalCount || 0);
      
      return result;
    } catch (error) {
      console.error('❌ Erro ao listar documentos:', error);
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
   * Baixar documento (com logs detalhados)
   */
  async downloadDocument(filePath: string): Promise<Blob | null> {
    try {
      console.log('⬇️ VPS Download de documento iniciado...');
      console.log('📂 Caminho do arquivo:', filePath);
      
      const url = `${this.baseUrl}/documents/download/${encodeURIComponent(filePath)}`;
      console.log('📡 Endpoint:', url);

      const response = await fetch(url);
      
      console.log('📥 Resposta recebida:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        contentType: response.headers.get('content-type')
      });

      if (!response.ok) {
        console.error('❌ Erro no download:', response.statusText);
        throw new Error('Erro ao baixar documento');
      }

      const blob = await response.blob();
      console.log('✅ Download realizado com sucesso');
      console.log('📊 Tamanho do arquivo:', blob.size, 'bytes');
      
      return blob;
    } catch (error) {
      console.error('❌ Erro ao baixar documento:', error);
      console.error('🔍 Detalhes do erro:', {
        filePath,
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });
      
      return null;
    }
  }

  /**
   * Verificar se a API está disponível (com logs detalhados)
   */
  async checkAPIHealth(): Promise<boolean> {
    try {
      console.log('🔍 VPS Verificando saúde da API...');
      console.log('📡 Endpoint:', `${this.baseUrl}/health`);
      
      const response = await fetch(`${this.baseUrl}/health`);
      
      const isHealthy = response.ok;
      
      if (isHealthy) {
        console.log('✅ API VPS está online');
      } else {
        console.warn('⚠️ API VPS com problemas:', response.status, response.statusText);
      }
      
      return isHealthy;
    } catch (error) {
      console.error('❌ API VPS não disponível:', error);
      console.error('🔗 URL tentada:', `${this.baseUrl}/health`);
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
