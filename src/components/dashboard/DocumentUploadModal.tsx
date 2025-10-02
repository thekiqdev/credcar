/**
 * Componente de Upload de Documentos - Modal
 * Funciona dentro do dashboard do representante
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
import { uploadService, DocumentInfo } from '../../lib/upload.service';

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
  status: 'pending' | 'uploading' | 'uploaded' | 'error' | 'approved' | 'rejected';
  progress: number;
  error?: string;
}

const DocumentUploadModal: React.FC<DocumentUploadModalProps> = ({
  representativeId,
  representativeName,
  representativeCpfCnpj = '',
  onClose,
  onUploadComplete
}) => {
  const [documents, setDocuments] = useState<DocumentFile[]>([
    { id: '1', type: 'Certidão Negativa Civil', file: null, status: 'pending', progress: 0 },
    { id: '2', type: 'Comprovante de Endereço', file: null, status: 'pending', progress: 0 },
    { id: '3', type: 'Cartão do CNPJ/CPF', file: null, status: 'pending', progress: 0 },
    { id: '4', type: 'Certidão de Antecedente Criminal', file: null, status: 'pending', progress: 0 }
  ]);

  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Carregar status dos documentos do banco
  useEffect(() => {
    loadDocumentStatus();
  }, [representativeId]);

  const loadDocumentStatus = async () => {
    try {
      setIsLoading(true);
      
      const { data, error } = await supabase
        .from('representative_documents')
        .select('*')
        .eq('representative_id', representativeId)
        .order('document_type');

      if (error) {
        console.error('Error loading documents:', error);
        return;
      }

      console.log('📋 Documentos carregados do banco:', data);

      // Atualizar status dos documentos baseado no banco
      if (data && data.length > 0) {
        setDocuments(prev => prev.map(doc => {
          const dbDoc = data.find(db => db.document_type === doc.type);
          console.log(`🔍 Comparando: "${dbDoc?.document_type}" === "${doc.type}"`);
          if (dbDoc && dbDoc.file_url && dbDoc.file_url.trim() !== '') {
            // Só considera enviado se tem file_url válida
            console.log(`✅ Documento encontrado: ${doc.type} - ${dbDoc.file_url}`);
            return {
              ...doc,
              status: dbDoc.status === 'Aprovado' ? 'approved' : 
                     dbDoc.status === 'Reprovado' ? 'rejected' : 'uploaded',
              progress: dbDoc.status === 'Aprovado' ? 100 : 
                       dbDoc.status === 'Reprovado' ? 0 : 100
            };
          }
          return doc; // Mantém status original se não tem arquivo
        }));
      }
    } catch (error) {
      console.error('Error loading document status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileSelect = (documentId: string, file: File) => {
    setDocuments(prev => prev.map(doc => 
      doc.id === documentId 
        ? { ...doc, file, status: 'pending' }
        : doc
    ));
    setError(null);
  };

  const saveToDatabase = async (fileData: any, representativeId: string) => {
    try {
      console.log('💾 Salvando metadados no banco:', fileData);
      console.log('🔍 Representative ID:', representativeId);
      console.log('📄 Document Type:', fileData.documentType);
      console.log('📁 File Path:', fileData.path || fileData.filePath);
      
      // Validar dados obrigatórios
      if (!fileData.path && !fileData.filePath && !fileData.directory) {
        throw new Error('path, filePath ou directory é obrigatório');
      }
      
      if (!fileData.documentType) {
        throw new Error('documentType é obrigatório');
      }
      
      const insertData = {
        representative_id: representativeId,
        document_type: fileData.documentType,
        file_url: fileData.path || fileData.filePath || fileData.directory,
        status: 'Pendente',
        uploaded_at: new Date().toISOString()
      };
      
      console.log('📝 Dados para inserção:', insertData);
      
      const { data, error } = await supabase
        .from('representative_documents')
        .insert(insertData)
        .select();

      if (error) {
        console.error('❌ Erro ao salvar no banco:', error);
        console.error('❌ Detalhes do erro:', error.details);
        console.error('❌ Código do erro:', error.code);
        throw new Error(`Erro ao salvar no banco: ${error.message}`);
      }

      console.log('✅ Metadados salvos no banco de dados:', data);
      console.log('📁 File URL salva:', insertData.file_url);
    } catch (error) {
      console.error('❌ Erro ao salvar no banco:', error);
      throw error;
    }
  };

  const handleUpload = async (e?: React.FormEvent) => {
    // Prevenir reload da página
    if (e) {
      e.preventDefault();
    }
    
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
          // Verificar se servidor está online
          const serverStatus = await uploadService.getServerStatus();
          if (!serverStatus.online) {
            throw new Error('Servidor de upload offline. Verifique se o servidor está rodando na porta 3001.');
          }

          // Preparar dados do documento
          const docInfo: DocumentInfo = {
            representativeId: representativeId,
            cpfCnpj: representativeCpfCnpj,
            documentType: doc.type,
            fileName: doc.file.name,
            fileSize: doc.file.size,
            fileType: doc.file.type
          };

          console.log('📋 Document Info:', docInfo);
          console.log('🔍 CPF/CNPJ:', representativeCpfCnpj);

          // Upload completo: criar pastas + salvar arquivo
          const result = await uploadService.uploadComplete(doc.file, docInfo);

          if (!result.success) {
            throw new Error(result.error || 'Erro ao salvar arquivo');
          }

          console.log(`✅ Document ${doc.type} saved successfully:`, result.data?.filePath);

          // Salvar metadados no banco de dados
          console.log('💾 Salvando metadados para:', doc.type);
          console.log('📁 Dados do upload:', result.data);
          
          // Validar dados antes de salvar
          if (!result.data || (!result.data.path && !result.data.filePath && !result.data.directory)) {
            throw new Error(`Dados de upload inválidos para ${doc.type}: sem path, filePath ou directory`);
          }
          
          const saveData = {
            ...result.data,
            documentType: doc.type
          };
          
          console.log('📝 Dados validados para salvar:', saveData);
          
          await saveToDatabase(saveData, representativeId);
          
          console.log('✅ Metadados salvos para:', doc.type);

          // Atualizar status para uploaded
          setDocuments(prev => prev.map(d => 
            d.id === doc.id ? { ...d, status: 'uploaded', progress: 100 } : d
          ));

          completedUploads++;
          setUploadProgress((completedUploads / filesToUpload.length) * 100);

        } catch (docError) {
          console.error(`❌ Error uploading ${doc.type}:`, docError);
          console.error(`❌ Error details:`, {
            message: docError instanceof Error ? docError.message : 'Erro desconhecido',
            stack: docError instanceof Error ? docError.stack : undefined,
            docType: doc.type,
            representativeId: representativeId
          });
          
          setDocuments(prev => prev.map(d => 
            d.id === doc.id 
              ? { 
                  ...d, 
                  status: 'error', 
                  error: docError instanceof Error ? docError.message : 'Erro desconhecido'
                } 
              : d
          ));
          
          // Tentar novamente uma vez
          console.log(`🔄 Tentando novamente upload de ${doc.type}...`);
          try {
            await new Promise(resolve => setTimeout(resolve, 1000)); // Aguardar 1 segundo
            
            const retryResult = await uploadService.uploadComplete(doc.file, docInfo);
            if (retryResult.success) {
              console.log(`✅ Retry bem-sucedido para ${doc.type}`);
              await saveToDatabase({
                ...retryResult.data,
                documentType: doc.type
              }, representativeId);
              
              setDocuments(prev => prev.map(d => 
                d.id === doc.id ? { ...d, status: 'uploaded', progress: 100, error: null } : d
              ));
              completedUploads++;
            } else {
              throw new Error(retryResult.error || 'Erro no retry');
            }
          } catch (retryError) {
            console.error(`❌ Retry falhou para ${doc.type}:`, retryError);
          }
        }
      }

      if (completedUploads === filesToUpload.length) {
        // Todos os uploads foram bem-sucedidos
        console.log('✅ Todos os documentos foram enviados com sucesso!');
        
        // Não fechar automaticamente - deixar usuário decidir
        // Apenas chamar onUploadComplete para atualizar a notificação
        onUploadComplete?.();
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
      case 'approved':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'uploaded':
        return <Clock className="h-4 w-4 text-yellow-600" />;
      case 'rejected':
        return <AlertCircle className="h-4 w-4 text-red-600" />;
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
      case 'approved':
        return 'Aprovado';
      case 'uploaded':
        return 'Pendente de Aprovação';
      case 'rejected':
        return 'Rejeitado';
      case 'error':
        return 'Erro';
      case 'uploading':
        return 'Enviando...';
      default:
        return 'Pendente';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'text-green-600';
      case 'uploaded':
        return 'text-yellow-600';
      case 'rejected':
        return 'text-red-600';
      case 'error':
        return 'text-red-600';
      case 'uploading':
        return 'text-blue-600';
      default:
        return 'text-gray-600';
    }
  };

  const uploadedCount = documents.filter(doc => doc.status === 'uploaded' || doc.status === 'approved').length;
  const totalCount = documents.length;

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <Card className="w-full max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
          <CardContent className="p-6 flex items-center justify-center">
            <div className="text-center">
              <Clock className="h-8 w-8 text-blue-600 animate-spin mx-auto mb-4" />
              <p className="text-gray-600">Carregando status dos documentos...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
        <CardHeader className="bg-gray-50 border-b">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Envio de Documentos
              </CardTitle>
              <CardDescription>
                Envie os documentos obrigatórios para ativar seu perfil
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
          <div className="space-y-4">
            {documents.map((doc) => (
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
                      </div>
                    </div>
                    <Badge variant={doc.status === 'uploaded' ? 'default' : 'secondary'}>
                      {getStatusText(doc.status)}
                    </Badge>
                  </div>

                  {/* File Input */}
                  {doc.status !== 'uploaded' && doc.status !== 'approved' && doc.status !== 'rejected' && (
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
                        <span>Enviando...</span>
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
          
          {uploadedCount === totalCount ? (
            <Button 
              type="button"
              onClick={() => {
                onUploadComplete?.();
                onClose();
              }}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
            >
              <CheckCircle className="h-4 w-4" />
              Concluir
            </Button>
          ) : (
          <Button 
            type="button"
            onClick={handleUpload}
            disabled={isUploading || uploadedCount === totalCount}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-700"
          >
            <Send className="h-4 w-4" />
            {isUploading ? 'Enviando...' : 'Enviar Documentos'}
          </Button>
          )}
        </div>
      </Card>
    </div>
  );
};

export default DocumentUploadModal;
