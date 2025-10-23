/**
 * Serviço para upload em chunks
 * Resolve problemas de limite de tamanho (413 Request Entity Too Large)
 */

interface ChunkUploadOptions {
  file: File;
  documentType: string;
  cpfCnpj: string;
  representativeId: string;
  partnerId?: string;
  partnerCpf?: string;
  chunkSize?: number; // Tamanho do chunk em bytes (padrão: 512KB)
  onProgress?: (progress: number) => void;
  onChunkComplete?: (chunkIndex: number, totalChunks: number) => void;
}

interface ChunkUploadResult {
  success: boolean;
  message: string;
  data?: any;
  error?: string;
}

class ChunkUploadService {
  private readonly CHUNK_SIZE = 512 * 1024; // 512KB por chunk
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY = 1000; // 1 segundo

  /**
   * Faz upload de um arquivo em chunks
   */
  async uploadFile(options: ChunkUploadOptions): Promise<ChunkUploadResult> {
    const {
      file,
      documentType,
      cpfCnpj,
      representativeId,
      partnerId,
      partnerCpf,
      chunkSize = this.CHUNK_SIZE,
      onProgress,
      onChunkComplete
    } = options;

    try {
      console.log('🔧 === INICIANDO UPLOAD EM CHUNKS ===');
      console.log('📄 fileName:', file.name);
      console.log('📏 fileSize:', file.size);
      console.log('📋 documentType:', documentType);
      console.log('👤 cpfCnpj:', cpfCnpj);
      console.log('👤 representativeId:', representativeId);

      // Calcular número de chunks
      const totalChunks = Math.ceil(file.size / chunkSize);
      console.log(`🧩 Total de chunks: ${totalChunks} (${chunkSize} bytes cada)`);

      // 1. Iniciar upload
      const uploadId = await this.startChunkUpload({
        fileName: file.name,
        fileSize: file.size,
        totalChunks,
        documentType,
        cpfCnpj,
        representativeId,
        partnerId,
        partnerCpf
      });

      console.log('✅ Upload ID criado:', uploadId);

      // 2. Enviar chunks
      for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
        const start = chunkIndex * chunkSize;
        const end = Math.min(start + chunkSize, file.size);
        const chunk = file.slice(start, end);

        console.log(`📦 Enviando chunk ${chunkIndex + 1}/${totalChunks} (${chunk.size} bytes)`);

        await this.sendChunk(uploadId, chunkIndex, totalChunks, chunk);
        
        // Callback de progresso
        const progress = ((chunkIndex + 1) / totalChunks) * 100;
        onProgress?.(progress);
        onChunkComplete?.(chunkIndex + 1, totalChunks);

        console.log(`✅ Chunk ${chunkIndex + 1}/${totalChunks} enviado`);
      }

      // 3. Finalizar upload
      console.log('🔧 Finalizando upload...');
      const result = await this.completeChunkUpload(uploadId);

      console.log('✅ Upload em chunks finalizado com sucesso');
      console.log('🔧 === FIM UPLOAD EM CHUNKS ===');

      return {
        success: true,
        message: 'Upload em chunks finalizado com sucesso',
        data: result.data
      };

    } catch (error) {
      console.error('❌ Erro no upload em chunks:', error);
      return {
        success: false,
        message: 'Erro no upload em chunks',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      };
    }
  }

  /**
   * Inicia o processo de upload em chunks
   */
  private async startChunkUpload(data: {
    fileName: string;
    fileSize: number;
    totalChunks: number;
    documentType: string;
    cpfCnpj: string;
    representativeId: string;
    partnerId?: string;
    partnerCpf?: string;
  }): Promise<string> {
    const response = await fetch('/api/upload-chunk-start', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Erro ao iniciar upload: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    if (!result.success) {
      throw new Error(result.error || 'Erro ao iniciar upload');
    }

    return result.uploadId;
  }

  /**
   * Envia um chunk individual
   */
  private async sendChunk(
    uploadId: string,
    chunkIndex: number,
    totalChunks: number,
    chunk: Blob
  ): Promise<void> {
    const formData = new FormData();
    formData.append('chunk', chunk);
    formData.append('uploadId', uploadId);
    formData.append('chunkIndex', chunkIndex.toString());
    formData.append('totalChunks', totalChunks.toString());

    let retries = 0;
    while (retries < this.MAX_RETRIES) {
      try {
        const response = await fetch('/api/upload-chunk', {
          method: 'POST',
          body: formData
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Erro ao enviar chunk: ${response.status} - ${errorText}`);
        }

        const result = await response.json();
        if (!result.success) {
          throw new Error(result.error || 'Erro ao enviar chunk');
        }

        return; // Sucesso

      } catch (error) {
        retries++;
        console.warn(`⚠️ Tentativa ${retries}/${this.MAX_RETRIES} falhou para chunk ${chunkIndex + 1}:`, error);

        if (retries >= this.MAX_RETRIES) {
          throw error;
        }

        // Aguardar antes de tentar novamente
        await new Promise(resolve => setTimeout(resolve, this.RETRY_DELAY * retries));
      }
    }
  }

  /**
   * Finaliza o upload em chunks
   */
  private async completeChunkUpload(uploadId: string): Promise<any> {
    const response = await fetch('/api/upload-chunk-complete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ uploadId })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Erro ao finalizar upload: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    if (!result.success) {
      throw new Error(result.error || 'Erro ao finalizar upload');
    }

    return result;
  }

  /**
   * Verifica se um arquivo deve usar upload em chunks
   */
  shouldUseChunkUpload(fileSize: number, threshold: number = 1024 * 1024): boolean {
    const shouldUse = fileSize > threshold;
    console.log(`🔍 Chunk Upload Check: ${fileSize} bytes > ${threshold} bytes = ${shouldUse}`);
    return shouldUse; // 1MB por padrão
  }

  /**
   * Calcula o tamanho ideal do chunk baseado no tamanho do arquivo
   */
  calculateOptimalChunkSize(fileSize: number): number {
    // Para arquivos pequenos (< 5MB): 256KB
    if (fileSize < 5 * 1024 * 1024) {
      return 256 * 1024;
    }
    
    // Para arquivos médios (5-50MB): 512KB
    if (fileSize < 50 * 1024 * 1024) {
      return 512 * 1024;
    }
    
    // Para arquivos grandes (> 50MB): 1MB
    return 1024 * 1024;
  }
}

export const chunkUploadService = new ChunkUploadService();
