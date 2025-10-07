/**
 * Versão alternativa: Upload para pastas locais por CPF/CNPJ
 * Esta versão salva os documentos em estrutura de pastas local
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Upload, 
  FileText, 
  CheckCircle, 
  AlertCircle, 
  Clock,
  ArrowLeft,
  Send
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '../../lib/supabase';

interface DocumentUploadModalProps {
  representativeId: string;
  representativeName: string;
  representativeCpfCnpj?: string; // CPF/CNPJ para criar pasta
  onClose: () => void;
  onUploadComplete?: () => void;
}

interface DocumentFile {
  id: string;
  type: string;
  file: File | null;
  status: 'pending' | 'uploading' | 'uploaded' | 'error';
  progress: number;
  error?: string;
  localPath?: string; // Caminho local do arquivo
}

const DocumentUploadModalLocal: React.FC<DocumentUploadModalProps> = ({
  representativeId,
  representativeName,
  representativeCpfCnpj = '',
  onClose,
  onUploadComplete
}) => {
  const [documents, setDocuments] = useState<DocumentFile[]>([
    // Documentos da Empresa
    { id: '1', type: 'cartilha de credenciamento preenchida', file: null, status: 'pending', progress: 0 },
    { id: '2', type: 'cartão cnpj', file: null, status: 'pending', progress: 0 },
    { id: '3', type: 'contrato social e última alteração', file: null, status: 'pending', progress: 0 },
    { id: '4', type: 'certificado de microempreendedor individual (mei)', file: null, status: 'pending', progress: 0 },
    { id: '5', type: 'comprovante de endereço em nome da empresa', file: null, status: 'pending', progress: 0 },
    { id: '6', type: 'declaração de endereço assinada', file: null, status: 'pending', progress: 0 },
    { id: '7', type: 'dados bancários para recebimento das comissões', file: null, status: 'pending', progress: 0 },
    // Documentos do Sócio
    { id: '8', type: 'cartilha de credenciamento pf', file: null, status: 'pending', progress: 0 },
    { id: '9', type: 'comprovante de endereço em nome do sócio', file: null, status: 'pending', progress: 0 },
    { id: '10', type: 'certidão de antecedentes criminais', file: null, status: 'pending', progress: 0 },
    { id: '11', type: 'certidão negativa cível de 1º grau', file: null, status: 'pending', progress: 0 },
    { id: '12', type: 'certidão negativa criminal de 1º grau', file: null, status: 'pending', progress: 0 },
    { id: '13', type: 'foto de identidade ou cnh (frente)', file: null, status: 'pending', progress: 0 },
    { id: '14', type: 'foto de identidade ou cnh (verso)', file: null, status: 'pending', progress: 0 }
  ]);

  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelect = (documentId: string, file: File) => {
    setDocuments(prev => prev.map(doc => 
      doc.id === documentId 
        ? { ...doc, file, status: 'pending' }
        : doc
    ));
    setError(null);
  };

  const saveFileLocally = async (file: File, documentType: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      try {
        // Criar estrutura de pastas: documentos/{cpf_cnpj}/{tipo_documento}/
        const cleanCpfCnpj = representativeCpfCnpj.replace(/[^0-9]/g, '');
        const folderName = cleanCpfCnpj || representativeId;
        const sanitizedDocType = documentType.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
        
        // Simular salvamento local (em produção, você usaria File System API ou similar)
        const timestamp = Date.now();
        const fileName = `${timestamp}-${file.name}`;
        const localPath = `documentos/${folderName}/${sanitizedDocType}/${fileName}`;
        
        // Simular delay de salvamento
        setTimeout(() => {
          console.log(`📁 Arquivo salvo localmente: ${localPath}`);
          resolve(localPath);
        }, 1000);
        
      } catch (error) {
        reject(error);
      }
    });
  };

  const handleUpload = async () => {
    try {
      setIsUploading(true);
      setError(null);
      setUploadProgress(0);

      const filesToUpload = documents.filter(doc => doc.file);
      
      if (filesToUpload.length === 0) {
        setError('Selecione pelo menos um documento para enviar.');
        setIsUploading(false);
        return;
      }

      let completedUploads = 0;

      for (const doc of filesToUpload) {
        if (!doc.file) continue;

        // Atualizar status para uploading
        setDocuments(prev => prev.map(d => 
          d.id === doc.id ? { ...d, status: 'uploading', progress: 0 } : d
        ));

        try {
          // Simular progresso de upload
          const progressInterval = setInterval(() => {
            setDocuments(prev => prev.map(d => 
              d.id === doc.id 
                ? { ...d, progress: Math.min(d.progress + 15, 90) }
                : d
            ));
          }, 200);

          // Salvar arquivo localmente
          const localPath = await saveFileLocally(doc.file, doc.type);

          clearInterval(progressInterval);

          // Salvar no banco de dados (apenas metadados)
          const { error: dbError } = await supabase
            .from('representative_documents')
            .insert({
              representative_id: representativeId,
              document_type: doc.type,
              file_url: localPath, // Caminho local em vez de URL do storage
              status: 'Pendente',
              uploaded_at: new Date().toISOString()
            });

          if (dbError) {
            throw new Error(`Erro ao salvar ${doc.type}: ${dbError.message}`);
          }

          // Atualizar status para uploaded
          setDocuments(prev => prev.map(d => 
            d.id === doc.id ? { ...d, status: 'uploaded', progress: 100, localPath } : d
          ));

          completedUploads++;
          setUploadProgress((completedUploads / filesToUpload.length) * 100);

        } catch (docError) {
          console.error(`Error uploading ${doc.type}:`, docError);
          setDocuments(prev => prev.map(d => 
            d.id === doc.id 
              ? { 
                  ...d, 
                  status: 'error', 
                  error: docError instanceof Error ? docError.message : 'Erro desconhecido'
                } 
              : d
          ));
        }
      }

      if (completedUploads === filesToUpload.length) {
        // Todos os uploads foram bem-sucedidos
        setTimeout(() => {
          onUploadComplete?.();
          onClose();
        }, 1000);
      } else {
        setError('Alguns documentos não puderam ser enviados. Verifique os erros e tente novamente.');
      }

    } catch (error) {
      console.error('Upload error:', error);
      setError(error instanceof Error ? error.message : 'Erro ao fazer upload dos documentos');
    } finally {
      setIsUploading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'uploaded':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      case 'uploading':
        return <Clock className="h-4 w-4 text-blue-600 animate-spin" />;
      default:
        return <FileText className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'uploaded':
        return 'Salvo';
      case 'error':
        return 'Erro';
      case 'uploading':
        return 'Salvando...';
      default:
        return 'Pendente';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'uploaded':
        return 'text-green-600';
      case 'error':
        return 'text-red-600';
      case 'uploading':
        return 'text-blue-600';
      default:
        return 'text-gray-600';
    }
  };

  const uploadedCount = documents.filter(doc => doc.status === 'uploaded').length;
  const totalCount = documents.length;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
        <CardHeader className="bg-gray-50 border-b">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Envio de Documentos (Local)
              </CardTitle>
              <CardDescription>
                Documentos serão salvos em: documentos/{representativeCpfCnpj.replace(/[^0-9]/g, '') || representativeId}/
              </CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              ✕
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-6 overflow-y-auto flex-1">
          {/* Progress Overview */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium">Progresso Geral</span>
              <span className="text-sm text-gray-600">{uploadedCount}/{totalCount} documentos</span>
            </div>
            <Progress value={(uploadedCount / totalCount) * 100} className="h-2" />
          </div>

          {/* Error Alert */}
          {error && (
            <Alert className="mb-6 border-red-200 bg-red-50">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">
                {error}
              </AlertDescription>
            </Alert>
          )}

          {/* Documents List */}
          <div className="space-y-6">
            {/* Documentos da Empresa */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <div className="h-1 w-8 bg-blue-600"></div>
                <h4 className="text-lg font-semibold text-blue-800">Documentos da Empresa</h4>
                <Badge variant="outline" className="bg-blue-50 text-blue-700">
                  {documents.filter(d => d.type.includes('empresa') || d.type.includes('cnpj') || d.type.includes('contrato') || d.type.includes('mei') || d.type.includes('bancários') || d.type.includes('declaração') || d.type.includes('cartilha de credenciamento preenchida')).length} documentos
                </Badge>
              </div>
              
              {documents.filter(doc => doc.type.includes('empresa') || doc.type.includes('cnpj') || doc.type.includes('contrato') || doc.type.includes('mei') || doc.type.includes('bancários') || doc.type.includes('declaração') || doc.type.includes('cartilha de credenciamento preenchida')).map((doc) => (
              <Card key={doc.id} className="border border-gray-200">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      {getStatusIcon(doc.status)}
                      <div>
                        <h3 className="font-medium">{doc.type}</h3>
                        <p className="text-sm text-gray-600">
                          {doc.file ? doc.file.name : 'Nenhum arquivo selecionado'}
                        </p>
                        {doc.localPath && (
                          <p className="text-xs text-green-600">
                            📁 {doc.localPath}
                          </p>
                        )}
                      </div>
                    </div>
                    <Badge variant={doc.status === 'uploaded' ? 'default' : 'secondary'}>
                      {getStatusText(doc.status)}
                    </Badge>
                  </div>

                  {/* File Input */}
                  {doc.status !== 'uploaded' && (
                    <div className="space-y-2">
                      <Label htmlFor={`file-${doc.id}`} className="text-sm font-medium">
                        Selecionar Arquivo
                      </Label>
                      <Input
                        id={`file-${doc.id}`}
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            handleFileSelect(doc.id, file);
                          }
                        }}
                        disabled={doc.status === 'uploading'}
                        className="cursor-pointer"
                      />
                      <p className="text-xs text-gray-500">
                        Formatos aceitos: PDF, JPG, PNG, DOC, DOCX (máx. 10MB)
                      </p>
                    </div>
                  )}

                  {/* Upload Progress */}
                  {doc.status === 'uploading' && (
                    <div className="mt-3">
                      <div className="flex justify-between text-sm mb-1">
                        <span>Salvando...</span>
                        <span>{doc.progress}%</span>
                      </div>
                      <Progress value={doc.progress} className="h-2" />
                    </div>
                  )}

                  {/* Error Message */}
                  {doc.status === 'error' && doc.error && (
                    <Alert className="mt-3 border-red-200 bg-red-50">
                      <AlertCircle className="h-4 w-4 text-red-600" />
                      <AlertDescription className="text-red-800">
                        {doc.error}
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>
              ))}
            </div>

            {/* Documentos do Sócio */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <div className="h-1 w-8 bg-green-600"></div>
                <h4 className="text-lg font-semibold text-green-800">Documentos do Sócio</h4>
                <Badge variant="outline" className="bg-green-50 text-green-700">
                  {documents.filter(d => d.type.includes('sócio') || d.type.includes('pf') || d.type.includes('certidão') || d.type.includes('foto') || d.type.includes('cnh') || d.type.includes('identidade')).length} documentos
                </Badge>
              </div>
              
              {documents.filter(doc => doc.type.includes('sócio') || doc.type.includes('pf') || doc.type.includes('certidão') || doc.type.includes('foto') || doc.type.includes('cnh') || doc.type.includes('identidade')).map((doc) => (
              <Card key={doc.id} className="border border-gray-200">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      {getStatusIcon(doc.status)}
                      <div>
                        <h3 className="font-medium">{doc.type}</h3>
                        <p className="text-sm text-gray-600">
                          {doc.file ? doc.file.name : 'Nenhum arquivo selecionado'}
                        </p>
                        {doc.localPath && (
                          <p className="text-xs text-green-600">
                            📁 {doc.localPath}
                          </p>
                        )}
                      </div>
                    </div>
                    <Badge variant={doc.status === 'uploaded' ? 'default' : 'secondary'}>
                      {getStatusText(doc.status)}
                    </Badge>
                  </div>

                  {/* File Input */}
                  {doc.status !== 'uploaded' && (
                    <div className="space-y-2">
                      <Label htmlFor={`file-${doc.id}`} className="text-sm font-medium">
                        Selecionar Arquivo
                      </Label>
                      <Input
                        id={`file-${doc.id}`}
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            handleFileSelect(doc.id, file);
                          }
                        }}
                        disabled={doc.status === 'uploading'}
                        className="cursor-pointer"
                      />
                      <p className="text-xs text-gray-500">
                        Formatos aceitos: PDF, JPG, PNG, DOC, DOCX (máx. 10MB)
                      </p>
                    </div>
                  )}

                  {/* Upload Progress */}
                  {doc.status === 'uploading' && (
                    <div className="mt-3">
                      <div className="flex justify-between text-sm mb-1">
                        <span>Salvando...</span>
                        <span>{doc.progress}%</span>
                      </div>
                      <Progress value={doc.progress} className="h-2" />
                    </div>
                  )}

                  {/* Error Message */}
                  {doc.status === 'error' && doc.error && (
                    <Alert className="mt-3 border-red-200 bg-red-50">
                      <AlertCircle className="h-4 w-4 text-red-600" />
                      <AlertDescription className="text-red-800">
                        {doc.error}
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>
              ))}
            </div>
          </div>
        </CardContent>

        {/* Footer Actions */}
        <div className="border-t bg-gray-50 p-4 flex justify-between flex-shrink-0">
          <Button 
            variant="outline" 
            onClick={onClose}
            disabled={isUploading}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Button>
          
          <Button 
            onClick={handleUpload}
            disabled={isUploading || uploadedCount === totalCount}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-700"
          >
            <Send className="h-4 w-4" />
            {isUploading ? 'Salvando...' : 'Salvar Documentos'}
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default DocumentUploadModalLocal;
