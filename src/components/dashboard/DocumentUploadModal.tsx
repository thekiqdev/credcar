/**
 * Componente de Upload de Documentos - Modal
 * Funciona dentro do dashboard do representante
 */

import React, { useState, useEffect, useCallback } from 'react';
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
  status: 'pending' | 'uploaded' | 'error' | 'approved' | 'rejected';
  progress: number;
  error?: string;
}

// Componente otimizado para cada documento
const DocumentCard = React.memo(({ doc, onFileSelect, onStatusChange }: {
  doc: DocumentFile;
  onFileSelect: (id: string, file: File) => void;
  onStatusChange: (id: string, updates: Partial<DocumentFile>) => void;
}) => {
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
      default:
        return 'text-gray-600';
    }
  };

  return (
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
                  onFileSelect(doc.id, file);
                }
              }}
              disabled={false}
              className="cursor-pointer"
            />
            <p className="text-xs text-gray-500">
              Formatos aceitos: PDF, JPG, PNG, DOC, DOCX (máx. 10MB)
            </p>
          </div>
        )}

        {/* Status removido para evitar qualquer atualização visual */}

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
  );
});

const DocumentUploadModal: React.FC<DocumentUploadModalProps> = ({
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
    { id: '4', type: 'comprovante de endereço em nome da empresa', file: null, status: 'pending', progress: 0 },
    { id: '5', type: 'dados bancários para recebimento das comissões', file: null, status: 'pending', progress: 0 },
    // Documentos do Sócio
    { id: '6', type: 'cartilha de credenciamento pf', file: null, status: 'pending', progress: 0 },
    { id: '7', type: 'comprovante de endereço em nome do sócio', file: null, status: 'pending', progress: 0 },
    { id: '8', type: 'certidão de antecedentes criminais', file: null, status: 'pending', progress: 0 },
    { id: '9', type: 'certidão negativa cível de 1º grau', file: null, status: 'pending', progress: 0 },
    { id: '10', type: 'certidão negativa criminal de 1º grau', file: null, status: 'pending', progress: 0 },
    { id: '11', type: 'foto de identidade ou cnh (frente)', file: null, status: 'pending', progress: 0 },
    { id: '12', type: 'foto de identidade ou cnh (verso)', file: null, status: 'pending', progress: 0 }
  ]);

  const [isUploading, setIsUploading] = useState(false);
  // Removido uploadProgress para evitar atualizações visuais
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Carregar status dos documentos do banco apenas uma vez
  useEffect(() => {
    console.log('🔄 DocumentUploadModal: Carregando status dos documentos...');
    loadDocumentStatus();
  }, [representativeId]); // Apenas quando representativeId muda

  const loadDocumentStatus = async () => {
    try {
      console.log('📋 DocumentUploadModal: loadDocumentStatus chamado');
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
      console.log('📋 Total de documentos no banco:', data?.length || 0);

      // Atualizar status dos documentos baseado no banco
      if (data && data.length > 0) {
        setDocuments(prev => prev.map(doc => {
          const dbDoc = data.find(db => {
            const match = db.document_type === doc.type;
            console.log(`🔍 Comparando: "${db.document_type}" === "${doc.type}" = ${match}`);
            return match;
          });
          
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
          } else {
            console.log(`❌ Documento não encontrado ou sem file_url: ${doc.type}`);
            if (dbDoc) {
              console.log(`📄 dbDoc encontrado mas sem file_url:`, dbDoc);
            }
          }
          return doc; // Mantém status original se não tem arquivo
        }));
      } else {
        console.log('⚠️ Nenhum documento encontrado no banco para este representante');
      }
    } catch (error) {
      console.error('Error loading document status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Função otimizada para atualizar documentos
  const updateDocumentStatus = useCallback((documentId: string, updates: Partial<DocumentFile>) => {
    setDocuments(prev => prev.map(doc => 
      doc.id === documentId ? { ...doc, ...updates } : doc
    ));
  }, []);

  const handleFileSelect = (documentId: string, file: File) => {
    updateDocumentStatus(documentId, { file, status: 'pending' });
    setError(null);
  };

  const saveToDatabase = async (fileData: any, representativeId: string) => {
    try {
      console.log('💾 === INÍCIO saveToDatabase ===');
      console.log('💾 Salvando metadados no banco:', fileData);
      console.log('🔍 Representative ID:', representativeId);
      console.log('📄 Document Type:', fileData.documentType);
      console.log('📁 File Path:', fileData.filePath);
      console.log('⏰ Timestamp:', new Date().toISOString());
      
      // Validar dados obrigatórios
      if (!fileData.filePath && !fileData.directory) {
        console.error('❌ Dados inválidos: filePath e directory estão vazios');
        throw new Error('filePath ou directory é obrigatório');
      }
      
      if (!fileData.documentType) {
        console.error('❌ Dados inválidos: documentType está vazio');
        throw new Error('documentType é obrigatório');
      }

      // Validação adicional: verificar se o caminho do arquivo não está vazio
      const filePath = fileData.filePath || fileData.directory;
      if (!filePath || filePath.trim() === '') {
        console.error('❌ Dados inválidos: caminho do arquivo está vazio');
        throw new Error('Caminho do arquivo não pode estar vazio');
      }

      // Validação adicional: verificar se o caminho contém informações válidas
      if (filePath === 'EMPTY' || filePath.toLowerCase().includes('empty')) {
        console.error('❌ Dados inválidos: arquivo marcado como EMPTY');
        throw new Error('Arquivo não pode estar vazio');
      }
      
      const insertData = {
        representative_id: representativeId,
        document_type: fileData.documentType,
        file_url: filePath,
        status: 'Pendente' as const,
        uploaded_at: new Date().toISOString()
      };
      
      console.log('📝 Dados para inserção:', insertData);
      console.log('🔍 Verificando se já existe registro para este documento...');
      
      // Verificar se já existe um registro para este documento
      const { data: existingDoc, error: checkError } = await supabase
        .from('representative_documents')
        .select('*')
        .eq('representative_id', representativeId)
        .eq('document_type', fileData.documentType)
        .maybeSingle();

      if (checkError && checkError.code !== 'PGRST116') {
        console.error('❌ Erro ao verificar documento existente:', checkError);
        throw new Error(`Erro ao verificar documento: ${checkError.message}`);
      }

      if (existingDoc) {
        console.log('⚠️ Documento já existe no banco, atualizando...', existingDoc);
        
        // Atualizar registro existente
        const { data, error } = await supabase
          .from('representative_documents')
          .update({
            file_url: filePath,
            status: 'Pendente' as const,
            uploaded_at: new Date().toISOString()
          })
          .eq('id', existingDoc.id)
          .select();

        if (error) {
          console.error('❌ Erro ao atualizar no banco:', error);
          console.error('❌ Detalhes do erro:', error.details);
          console.error('❌ Código do erro:', error.code);
          throw new Error(`Erro ao atualizar no banco: ${error.message}`);
        }

        console.log('✅ Documento atualizado no banco de dados:', data);
        console.log('📁 File URL atualizada:', filePath);
        console.log('💾 === FIM saveToDatabase (UPDATE) ===');
        return;
      }
      
      console.log('✅ Nenhum registro existente, criando novo...');
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
      console.log('💾 === FIM saveToDatabase (INSERT) ===');
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
      // Removido setUploadProgress para evitar atualizações visuais

      const filesToUpload = documents.filter(doc => doc.file);
      
      if (filesToUpload.length === 0) {
        setError('Selecione pelo menos um documento para enviar.');
        setIsUploading(false);
        return;
      }

      let completedUploads = 0;

      for (const doc of filesToUpload) {
        if (!doc.file) continue;

        // Validação adicional: verificar se o arquivo não está vazio
        if (doc.file.size === 0) {
          console.error(`❌ Arquivo vazio detectado: ${doc.type} - ${doc.file.name}`);
          updateDocumentStatus(doc.id, { 
            status: 'error', 
            error: 'Arquivo vazio detectado. Selecione um arquivo válido.' 
          });
          continue;
        }

        // Validação adicional: verificar se o arquivo tem tamanho mínimo (1KB)
        if (doc.file.size < 1024) {
          console.error(`❌ Arquivo muito pequeno detectado: ${doc.type} - ${doc.file.name} (${doc.file.size} bytes)`);
          updateDocumentStatus(doc.id, { 
            status: 'error', 
            error: 'Arquivo muito pequeno. Verifique se o arquivo foi selecionado corretamente.' 
          });
          continue;
        }

          console.log(`📤 Iniciando upload: ${doc.type} - ${doc.file.name} (${doc.file.size} bytes)`);
          console.log(`🏢 Documento da empresa? ${doc.type.includes('empresa') || doc.type.includes('cnpj') || doc.type.includes('contrato') || doc.type.includes('bancários') || doc.type.includes('cartilha de credenciamento preenchida')}`);
          console.log(`👤 Documento do sócio? ${doc.type.includes('socio') || doc.type.includes('pf') || doc.type.includes('certidão') || doc.type.includes('foto')}`);

        // Não atualizar status durante upload para evitar piscar

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
          console.log('🔍 Document Type específico:', doc.type);
          console.log('🔍 Document Type lowercase:', doc.type.toLowerCase());

          // Upload completo: criar pastas + salvar arquivo
          const result = await uploadService.uploadComplete(doc.file, docInfo);

          if (!result.success) {
            console.error(`❌ Upload falhou para ${doc.type}:`, result.error);
            console.error(`🔍 Detalhes do erro:`, {
              documentType: doc.type,
              fileName: doc.file.name,
              fileSize: doc.file.size,
              cpfCnpj: representativeCpfCnpj,
              error: result.error
            });
            throw new Error(result.error || 'Erro ao salvar arquivo');
          }

          console.log(`✅ Document ${doc.type} saved successfully:`, result.data?.filePath);

          // Salvar metadados no banco de dados
          console.log('💾 Salvando metadados para:', doc.type);
          console.log('📁 Dados do upload:', result.data);
          console.log('📋 === CHAMANDO saveToDatabase ===');
          
          // Validar dados antes de salvar
          if (!result.data || (!result.data.filePath && !result.data.directory)) {
            throw new Error(`Dados de upload inválidos para ${doc.type}: sem filePath ou directory`);
          }
          
          const saveData = {
            ...result.data,
            documentType: doc.type
          };
          
          console.log('📝 Dados validados para salvar:', saveData);
          
          await saveToDatabase(saveData, representativeId);
          
          console.log('✅ Metadados salvos para:', doc.type);

          // Forçar recarga dos documentos após salvar
          console.log('🔄 Forçando recarga dos documentos após upload...');
          setTimeout(() => {
            loadDocumentStatus();
          }, 500); // Aguardar 500ms para garantir que o banco foi atualizado

          // Atualizar status para uploaded (sem progresso para evitar piscar)
          updateDocumentStatus(doc.id, { status: 'uploaded' });

          completedUploads++;
          // Removido setUploadProgress para evitar atualizações visuais

        } catch (docError) {
          console.error(`❌ Error uploading ${doc.type}:`, docError);
          console.error(`❌ Error details:`, {
            message: docError instanceof Error ? docError.message : 'Erro desconhecido',
            stack: docError instanceof Error ? docError.stack : undefined,
            docType: doc.type,
            representativeId: representativeId
          });
          
          updateDocumentStatus(doc.id, { 
                  status: 'error', 
                  error: docError instanceof Error ? docError.message : 'Erro desconhecido'
          });
          
          // Tentar novamente uma vez
          console.log(`🔄 Tentando novamente upload de ${doc.type}...`);
          try {
            await new Promise(resolve => setTimeout(resolve, 1000)); // Aguardar 1 segundo
            
            const retryResult = await uploadService.uploadComplete(doc.file, {
              representativeId: representativeId,
              cpfCnpj: representativeCpfCnpj,
              documentType: doc.type,
              fileName: doc.file.name,
              fileSize: doc.file.size,
              fileType: doc.file.type
            });
            if (retryResult.success) {
              console.log(`✅ Retry bem-sucedido para ${doc.type}`);
              await saveToDatabase({
                ...retryResult.data,
                documentType: doc.type
              }, representativeId);
              
              updateDocumentStatus(doc.id, { status: 'uploaded', error: null });
              completedUploads++;
              // Removido setUploadProgress para evitar atualizações visuais
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
                <DocumentCard 
                  key={doc.id} 
                  doc={doc} 
                  onFileSelect={handleFileSelect}
                  onStatusChange={updateDocumentStatus}
                />
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
                <DocumentCard 
                  key={doc.id} 
                  doc={doc} 
                  onFileSelect={handleFileSelect}
                  onStatusChange={updateDocumentStatus}
                />
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
