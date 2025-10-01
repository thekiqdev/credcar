/**
 * Serviço SIMPLES para teste de upload
 * Comunica com API básica
 */

class SimpleUploadService {
  constructor() {
    this.baseUrl = 'http://localhost:3001/api';
  }

  // Testar se API está funcionando
  async testAPI() {
    try {
      const response = await fetch(`${this.baseUrl}/test`);
      const result = await response.json();
      return result;
    } catch (error) {
      console.error('❌ Erro ao testar API:', error);
      return { success: false, error: error.message };
    }
  }

  // Upload simples
  async uploadFile(file, documentType = 'Documento') {
    try {
      const formData = new FormData();
      formData.append('document', file);
      formData.append('documentType', documentType);

      console.log('📤 Enviando arquivo:', file.name);

      const response = await fetch(`${this.baseUrl}/upload`, {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Erro no upload');
      }

      console.log('✅ Upload bem-sucedido:', result);
      return result;

    } catch (error) {
      console.error('❌ Erro no upload:', error);
      return { success: false, error: error.message };
    }
  }

  // Listar arquivos
  async listFiles() {
    try {
      const response = await fetch(`${this.baseUrl}/files`);
      const result = await response.json();
      return result;
    } catch (error) {
      console.error('❌ Erro ao listar arquivos:', error);
      return { success: false, error: error.message };
    }
  }

  // Deletar arquivo
  async deleteFile(filename) {
    try {
      const response = await fetch(`${this.baseUrl}/files/${filename}`, {
        method: 'DELETE'
      });
      const result = await response.json();
      return result;
    } catch (error) {
      console.error('❌ Erro ao deletar arquivo:', error);
      return { success: false, error: error.message };
    }
  }
}

// Instância global
export const simpleUploadService = new SimpleUploadService();
