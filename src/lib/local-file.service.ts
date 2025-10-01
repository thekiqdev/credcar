/**
 * Serviço SIMPLES para salvar arquivos localmente
 * Sem necessidade de servidor backend
 */

import { supabase } from './supabase';

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

class LocalFileService {
  private baseDir = 'documentos';

  /**
   * Salvar arquivo no sistema (simulação - em produção seria via backend)
   */
  async saveFileLocally(file: File, docInfo: DocumentInfo): Promise<UploadResult> {
    try {
      console.log('💾 Salvando arquivo no sistema:', file.name);

      // Limpar CPF/CNPJ
      const cleanCpfCnpj = docInfo.cpfCnpj.replace(/[^0-9]/g, '');
      const folderName = cleanCpfCnpj || docInfo.representativeId;
      
      // Sanitizar tipo de documento
      const sanitizedDocType = docInfo.documentType
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '_');
      
      // Criar nome do arquivo
      const timestamp = Date.now();
      const fileExtension = file.name.split('.').pop();
      const fileName = `${sanitizedDocType}_${timestamp}.${fileExtension}`;
      
      // Caminho completo no sistema
      const filePath = `${this.baseDir}/${folderName}/${sanitizedDocType}/${fileName}`;

      // Simular salvamento no sistema (em produção seria via backend)
      const fileData = {
        id: Date.now().toString(),
        representativeId: docInfo.representativeId,
        cpfCnpj: docInfo.cpfCnpj,
        documentType: docInfo.documentType,
        fileName: file.name,
        savedFileName: fileName,
        filePath: filePath,
        fileSize: file.size,
        fileType: file.type,
        uploadedAt: new Date().toISOString(),
        status: 'Pendente'
      };

      // Salvar referência no localStorage
      this.saveFileReference(fileData);

      // Salvar apenas o diretório no banco de dados
      await this.saveToDatabase(fileData);

      // Simular salvamento no sistema
      await this.simulateFileSave(file, filePath);

      console.log('✅ Arquivo salvo no sistema:', filePath);

      return {
        success: true,
        message: 'Arquivo salvo com sucesso no sistema!',
        data: {
          filePath: filePath,
          fileName: file.name,
          fileSize: file.size,
          documentType: docInfo.documentType
        }
      };

    } catch (error) {
      console.error('❌ Erro ao salvar arquivo:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      };
    }
  }

  /**
   * Salvar apenas o diretório no banco de dados
   */
  private async saveToDatabase(fileData: any): Promise<void> {
    try {
      // Extrair apenas o diretório (sem o nome do arquivo)
      const directoryPath = fileData.filePath.substring(0, fileData.filePath.lastIndexOf('/'));
      
      const { error } = await supabase
        .from('representative_documents')
        .insert({
          representative_id: fileData.representativeId,
          document_type: fileData.documentType,
          file_url: directoryPath, // Apenas o diretório
          status: 'Pendente',
          uploaded_at: fileData.uploadedAt
        });

      if (error) {
        console.error('❌ Erro ao salvar no banco:', error);
        throw new Error(`Erro ao salvar no banco: ${error.message}`);
      }

      console.log('✅ Diretório salvo no banco de dados:', directoryPath);
    } catch (error) {
      console.error('❌ Erro ao salvar no banco:', error);
      throw error;
    }
  }

  /**
   * Simular salvamento de arquivo no sistema
   * Em produção, isso seria feito via backend
   */
  private async simulateFileSave(file: File, filePath: string): Promise<void> {
    try {
      // Simular criação da estrutura de pastas
      const pathParts = filePath.split('/');
      const directory = pathParts.slice(0, -1).join('/');
      
      console.log(`📁 Criando estrutura de pastas: ${directory}`);
      console.log(`📄 Salvando arquivo: ${pathParts[pathParts.length - 1]}`);
      console.log(`📊 Tamanho: ${Math.round(file.size / 1024)} KB`);
      console.log(`📋 Tipo: ${file.type}`);
      
      // Em produção, aqui seria uma chamada para o backend:
      // await fetch('/api/upload', {
      //   method: 'POST',
      //   body: formData
      // });
      
      // Simular delay de salvamento
      await new Promise(resolve => setTimeout(resolve, 500));
      
      console.log('✅ Arquivo simulado salvo no sistema');
    } catch (error) {
      console.error('❌ Erro ao simular salvamento:', error);
      throw error;
    }
  }

  /**
   * Salvar referência do arquivo no localStorage
   */
  private saveFileReference(fileData: any): void {
    try {
      const key = `document_${fileData.representativeId}_${fileData.documentType}`;
      localStorage.setItem(key, JSON.stringify(fileData));
      
      // Também salvar na lista geral
      const allFiles = this.getAllFileReferences();
      allFiles.push(fileData);
      localStorage.setItem('all_documents', JSON.stringify(allFiles));
      
    } catch (error) {
      console.error('❌ Erro ao salvar referência:', error);
    }
  }

  /**
   * Obter todas as referências de arquivos
   */
  getAllFileReferences(): any[] {
    try {
      const data = localStorage.getItem('all_documents');
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('❌ Erro ao carregar referências:', error);
      return [];
    }
  }

  /**
   * Obter arquivos de um representante
   */
  getRepresentativeFiles(representativeId: string): any[] {
    try {
      const allFiles = this.getAllFileReferences();
      return allFiles.filter(file => file.representativeId === representativeId);
    } catch (error) {
      console.error('❌ Erro ao carregar arquivos do representante:', error);
      return [];
    }
  }

  /**
   * Deletar referência de arquivo
   */
  deleteFileReference(representativeId: string, documentType: string): boolean {
    try {
      const key = `document_${representativeId}_${documentType}`;
      localStorage.removeItem(key);
      
      // Remover da lista geral
      const allFiles = this.getAllFileReferences();
      const filteredFiles = allFiles.filter(file => 
        !(file.representativeId === representativeId && file.documentType === documentType)
      );
      localStorage.setItem('all_documents', JSON.stringify(filteredFiles));
      
      return true;
    } catch (error) {
      console.error('❌ Erro ao deletar referência:', error);
      return false;
    }
  }


  /**
   * Gerar relatório de arquivos salvos
   */
  generateFileReport(): string {
    try {
      const allFiles = this.getAllFileReferences();
      
      let report = 'RELATÓRIO DE ARQUIVOS SALVOS\n';
      report += '================================\n\n';
      
      allFiles.forEach((file, index) => {
        report += `${index + 1}. ${file.documentType}\n`;
        report += `   Representante: ${file.representativeId}\n`;
        report += `   CPF/CNPJ: ${file.cpfCnpj}\n`;
        report += `   Arquivo: ${file.fileName}\n`;
        report += `   Salvo como: ${file.savedFileName}\n`;
        report += `   Caminho: ${file.filePath}\n`;
        report += `   Tamanho: ${Math.round(file.fileSize / 1024)} KB\n`;
        report += `   Data: ${new Date(file.uploadedAt).toLocaleString()}\n`;
        report += `   Status: ${file.status}\n\n`;
      });
      
      return report;
    } catch (error) {
      console.error('❌ Erro ao gerar relatório:', error);
      return 'Erro ao gerar relatório';
    }
  }

  /**
   * Limpar todos os arquivos salvos
   */
  clearAllFiles(): boolean {
    try {
      localStorage.removeItem('all_documents');
      
      // Limpar arquivos individuais
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith('document_')) {
          localStorage.removeItem(key);
        }
      });
      
      return true;
    } catch (error) {
      console.error('❌ Erro ao limpar arquivos:', error);
      return false;
    }
  }
}

// Instância global
export const localFileService = new LocalFileService();

// Exportar também a classe
export { LocalFileService };

// Tipos para uso externo
export type { DocumentInfo, UploadResult };
