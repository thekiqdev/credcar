/**
 * Componente de Teste SIMPLES para Upload
 * Para testar a API antes de integrar com o sistema completo
 */

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, CheckCircle, AlertCircle, Trash2, List } from 'lucide-react';
import { simpleUploadService } from '../../lib/simple-upload.service';

const SimpleUploadTest: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [files, setFiles] = useState<any[]>([]);
  const [apiStatus, setApiStatus] = useState<string>('');

  // Testar API
  const testAPI = async () => {
    console.log('🧪 Testando API...');
    const result = await simpleUploadService.testAPI();
    setApiStatus(result.success ? '✅ API funcionando!' : `❌ Erro: ${result.error}`);
    console.log('Resultado do teste:', result);
  };

  // Upload de arquivo
  const handleUpload = async () => {
    if (!selectedFile) {
      alert('Selecione um arquivo primeiro!');
      return;
    }

    setIsUploading(true);
    setResult(null);

    try {
      console.log('📤 Iniciando upload...');
      const result = await simpleUploadService.uploadFile(selectedFile, 'Teste');
      
      setResult(result);
      
      if (result.success) {
        console.log('✅ Upload concluído!');
        // Recarregar lista de arquivos
        await loadFiles();
      } else {
        console.error('❌ Upload falhou:', result.error);
      }
    } catch (error) {
      console.error('❌ Erro no upload:', error);
      setResult({ success: false, error: error.message });
    } finally {
      setIsUploading(false);
    }
  };

  // Carregar lista de arquivos
  const loadFiles = async () => {
    console.log('📋 Carregando lista de arquivos...');
    const result = await simpleUploadService.listFiles();
    
    if (result.success) {
      setFiles(result.files);
      console.log('📁 Arquivos encontrados:', result.files);
    } else {
      console.error('❌ Erro ao carregar arquivos:', result.error);
    }
  };

  // Deletar arquivo
  const deleteFile = async (filename: string) => {
    if (!confirm(`Tem certeza que deseja deletar ${filename}?`)) {
      return;
    }

    console.log('🗑️ Deletando arquivo:', filename);
    const result = await simpleUploadService.deleteFile(filename);
    
    if (result.success) {
      console.log('✅ Arquivo deletado!');
      await loadFiles(); // Recarregar lista
    } else {
      console.error('❌ Erro ao deletar:', result.error);
      alert(`Erro ao deletar: ${result.error}`);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            🧪 Teste de Upload Simples
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Teste da API */}
          <div className="flex items-center gap-4">
            <Button onClick={testAPI} variant="outline">
              Testar API
            </Button>
            {apiStatus && (
              <Alert className={apiStatus.includes('✅') ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
                <AlertDescription>{apiStatus}</AlertDescription>
              </Alert>
            )}
          </div>

          {/* Upload de arquivo */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="file-input">Selecionar Arquivo</Label>
              <Input
                id="file-input"
                type="file"
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                className="mt-1"
              />
              {selectedFile && (
                <p className="text-sm text-gray-600 mt-1">
                  Arquivo selecionado: {selectedFile.name} ({Math.round(selectedFile.size / 1024)} KB)
                </p>
              )}
            </div>

            <Button 
              onClick={handleUpload} 
              disabled={!selectedFile || isUploading}
              className="w-full"
            >
              {isUploading ? (
                <>⏳ Enviando...</>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Enviar Arquivo
                </>
              )}
            </Button>

            {/* Resultado do upload */}
            {result && (
              <Alert className={result.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
                {result.success ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-red-600" />
                )}
                <AlertDescription>
                  {result.success ? (
                    <div>
                      <p className="font-semibold">✅ Upload bem-sucedido!</p>
                      <p>Arquivo: {result.data?.fileName}</p>
                      <p>Salvo como: {result.data?.savedAs}</p>
                      <p>Caminho: {result.data?.path}</p>
                    </div>
                  ) : (
                    <div>
                      <p className="font-semibold">❌ Erro no upload</p>
                      <p>{result.error}</p>
                    </div>
                  )}
                </AlertDescription>
              </Alert>
            )}
          </div>

          {/* Lista de arquivos */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Arquivos Salvos</h3>
              <Button onClick={loadFiles} variant="outline" size="sm">
                <List className="h-4 w-4 mr-2" />
                Atualizar Lista
              </Button>
            </div>

            {files.length === 0 ? (
              <p className="text-gray-500 text-center py-4">Nenhum arquivo encontrado</p>
            ) : (
              <div className="space-y-2">
                {files.map((file, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">{file.name}</p>
                      <p className="text-sm text-gray-500">
                        {Math.round(file.size / 1024)} KB • {new Date(file.created).toLocaleString()}
                      </p>
                    </div>
                    <Button 
                      onClick={() => deleteFile(file.name)} 
                      variant="outline" 
                      size="sm"
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SimpleUploadTest;
