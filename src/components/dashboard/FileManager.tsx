/**
 * Componente para gerenciar arquivos salvos localmente
 * Mostra lista de documentos e permite download/delete
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  FileText, 
  Download, 
  Trash2, 
  RefreshCw,
  FolderOpen,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import { localFileService } from '../../lib/local-file.service';

interface FileManagerProps {
  representativeId: string;
  representativeCpfCnpj?: string;
}

const FileManager: React.FC<FileManagerProps> = ({
  representativeId,
  representativeCpfCnpj = ''
}) => {
  const [files, setFiles] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadFiles();
  }, [representativeId]);

  const loadFiles = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const representativeFiles = localFileService.getRepresentativeFiles(representativeId);
      setFiles(representativeFiles);
      
      console.log('📁 Arquivos carregados:', representativeFiles);
    } catch (error) {
      console.error('❌ Erro ao carregar arquivos:', error);
      setError('Erro ao carregar arquivos');
    } finally {
      setIsLoading(false);
    }
  };

  const deleteFile = async (documentType: string) => {
    if (!confirm(`Tem certeza que deseja deletar o documento ${documentType}?`)) {
      return;
    }

    try {
      const success = localFileService.deleteFileReference(representativeId, documentType);
      
      if (success) {
        console.log('✅ Arquivo deletado:', documentType);
        await loadFiles(); // Recarregar lista
      } else {
        setError('Erro ao deletar arquivo');
      }
    } catch (error) {
      console.error('❌ Erro ao deletar:', error);
      setError('Erro ao deletar arquivo');
    }
  };

  const downloadFile = (file: any) => {
    try {
      // Criar um link de download
      const link = document.createElement('a');
      link.href = `data:${file.fileType};base64,${btoa('Arquivo salvo localmente')}`;
      link.download = file.savedFileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      console.log('📥 Download iniciado:', file.savedFileName);
    } catch (error) {
      console.error('❌ Erro no download:', error);
      setError('Erro ao fazer download');
    }
  };

  const generateReport = () => {
    try {
      const report = localFileService.generateFileReport();
      
      // Criar e baixar relatório
      const blob = new Blob([report], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `relatorio_documentos_${new Date().toISOString().split('T')[0]}.txt`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      console.log('📊 Relatório gerado');
    } catch (error) {
      console.error('❌ Erro ao gerar relatório:', error);
      setError('Erro ao gerar relatório');
    }
  };

  const clearAllFiles = () => {
    if (!confirm('Tem certeza que deseja limpar TODOS os arquivos salvos? Esta ação não pode ser desfeita.')) {
      return;
    }

    try {
      const success = localFileService.clearAllFiles();
      
      if (success) {
        console.log('🗑️ Todos os arquivos foram limpos');
        await loadFiles(); // Recarregar lista
      } else {
        setError('Erro ao limpar arquivos');
      }
    } catch (error) {
      console.error('❌ Erro ao limpar:', error);
      setError('Erro ao limpar arquivos');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Aprovado':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'Rejeitado':
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      default:
        return <FileText className="h-4 w-4 text-yellow-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Aprovado':
        return 'bg-green-100 text-green-800';
      case 'Rejeitado':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FolderOpen className="h-5 w-5" />
            Arquivos Salvos Localmente
          </CardTitle>
          <div className="flex gap-2">
            <Button onClick={loadFiles} variant="outline" size="sm" disabled={isLoading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
            <Button onClick={generateReport} variant="outline" size="sm">
              📊 Relatório
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        {/* Error Alert */}
        {error && (
          <Alert className="mb-4 border-red-200 bg-red-50">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              {error}
            </AlertDescription>
          </Alert>
        )}

        {/* Files List */}
        {isLoading ? (
          <div className="text-center py-8">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-gray-400" />
            <p className="text-gray-500">Carregando arquivos...</p>
          </div>
        ) : files.length === 0 ? (
          <div className="text-center py-8">
            <FolderOpen className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <p className="text-gray-500 mb-2">Nenhum arquivo salvo ainda</p>
            <p className="text-sm text-gray-400">
              Os documentos aparecerão aqui após serem enviados
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {files.map((file, index) => (
              <div key={index} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                <div className="flex items-center gap-3">
                  {getStatusIcon(file.status)}
                  <div>
                    <p className="font-medium">{file.documentType}</p>
                    <p className="text-sm text-gray-500">
                      {file.fileName} • {Math.round(file.fileSize / 1024)} KB
                    </p>
                    <p className="text-xs text-gray-400">
                      Salvo em: {file.filePath}
                    </p>
                    <p className="text-xs text-gray-400">
                      {new Date(file.uploadedAt).toLocaleString()}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Badge className={getStatusColor(file.status)}>
                    {file.status}
                  </Badge>
                  
                  <Button 
                    onClick={() => downloadFile(file)} 
                    variant="outline" 
                    size="sm"
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                  
                  <Button 
                    onClick={() => deleteFile(file.documentType)} 
                    variant="outline" 
                    size="sm"
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Actions */}
        {files.length > 0 && (
          <div className="mt-6 pt-4 border-t">
            <div className="flex justify-between items-center">
              <p className="text-sm text-gray-500">
                Total: {files.length} arquivo(s) salvo(s)
              </p>
              <Button 
                onClick={clearAllFiles} 
                variant="outline" 
                size="sm"
                className="text-red-600 hover:text-red-700"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Limpar Todos
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default FileManager;
