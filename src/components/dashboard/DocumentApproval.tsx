import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, CheckCircle, XCircle, Eye, Download, Trash2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface DocumentApprovalProps {
  representativeId: string;
  onDocumentStatusChange?: () => void;
}

interface Document {
  id: number;
  document_type: string;
  file_url: string;
  status: string;
  uploaded_at: string;
  representative_id: string;
}

const DocumentApproval: React.FC<DocumentApprovalProps> = ({
  representativeId,
  onDocumentStatusChange
}) => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);

  // Documentos obrigatórios esperados - Nova estrutura com 13 tipos
  const expectedDocuments = [
    // Documentos da Empresa
    'cartilha de credenciamento preenchida',
    'cartão cnpj',
    'contrato social e última alteração',
    'comprovante de endereço em nome da empresa',
    'dados bancários para recebimento das comissões',
    // Documentos do Sócio
    'cartilha de credenciamento pf',
    'comprovante de endereço em nome do sócio',
    'certidão de antecedentes criminais',
    'certidão negativa cível de 1º grau',
    'certidão negativa criminal de 1º grau',
    'foto de identidade ou cnh (frente)',
    'foto de identidade ou cnh (verso)'
  ];

  useEffect(() => {
    loadDocuments();
  }, [representativeId]);

  const loadDocuments = async () => {
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

      // Criar lista completa com documentos esperados
      const allDocuments: Document[] = expectedDocuments.map(docType => {
        // Buscar documento correspondente EXATO (sem variações)
        // Encontrar o documento mais recente (por uploaded_at) do tipo correto
        const dbDocs = data?.filter(doc => doc.document_type === docType) || [];
        const existingDoc = dbDocs.length > 0 
          ? dbDocs.reduce((latest, current) => {
              const latestDate = new Date(latest.uploaded_at || 0);
              const currentDate = new Date(current.uploaded_at || 0);
              return currentDate > latestDate ? current : latest;
            })
          : undefined;
        
        // Log específico para cartilha de credenciamento preenchida
        if (docType === 'cartilha de credenciamento preenchida') {
          console.log('🔍 === DEBUG CARTILHA ADMIN LOAD ===');
          console.log('📄 docType:', docType);
          console.log('📄 Total de registros encontrados:', dbDocs.length);
          if (dbDocs.length > 1) {
            console.log('⚠️ MÚLTIPLOS REGISTROS ENCONTRADOS NO ADMIN:');
            dbDocs.forEach((d, i) => {
              console.log(`  ${i + 1}. ID: ${d.id}, file_url: "${d.file_url}", uploaded_at: ${d.uploaded_at}`);
            });
            console.log('📄 Usando o mais recente (ID:', existingDoc?.id, ')');
          }
          console.log('📄 existingDoc encontrado:', !!existingDoc);
          if (existingDoc) {
            console.log('📄 existingDoc COMPLETO:', JSON.stringify(existingDoc, null, 2));
            console.log('📄 existingDoc.file_url:', existingDoc.file_url);
            console.log('📄 existingDoc.file_url.trim() !== "":', existingDoc.file_url?.trim() !== '');
          }
          console.log('🔍 === FIM DEBUG CARTILHA ADMIN LOAD ===');
        }
        
        if (existingDoc && existingDoc.file_url && existingDoc.file_url.trim() !== '') {
          // Só considera enviado se tem file_url válida
          return existingDoc;
        }
        return {
          id: 0,
          document_type: docType,
          file_url: '',
          status: 'Pendente',
          uploaded_at: '',
          representative_id: representativeId
        };
      });

      setDocuments(allDocuments);
    } catch (error) {
      console.error('Error loading documents:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApproveDocument = async (documentId: number) => {
    if (documentId === 0) return; // Documento não enviado ainda
    
    try {
      setIsUpdating(true);
      
      const { error } = await supabase
        .from('representative_documents')
        .update({ status: 'Aprovado' })
        .eq('id', documentId);

      if (error) {
        console.error('Error approving document:', error);
        alert('Erro ao aprovar documento');
        return;
      }

      // Verificar se todos os documentos foram aprovados
      const { data: allDocuments, error: fetchError } = await supabase
        .from('representative_documents')
        .select('status')
        .eq('representative_id', representativeId);

      if (fetchError) {
        console.error('Error fetching documents for approval check:', fetchError);
      } else {
        // Verificar se todos os documentos enviados estão aprovados
        const sentDocuments = allDocuments?.filter(doc => doc.status !== 'Pendente' || doc.status !== 'Reprovado');
        const allApproved = sentDocuments?.every(doc => doc.status === 'Aprovado');
        
        if (allApproved && sentDocuments && sentDocuments.length > 0) {
          // Atualizar status de documentos aprovados na tabela profiles
          const { error: profileError } = await supabase
            .from('profiles')
            .update({ documents_approved: true })
            .eq('id', representativeId);

          if (profileError) {
            console.error('Error updating profile documents_approved:', profileError);
          } else {
            console.log('✅ Todos os documentos aprovados - perfil atualizado');
          }
        }
      }

      await loadDocuments();
      onDocumentStatusChange?.();
      console.log('✅ Documento aprovado');
    } catch (error) {
      console.error('Error approving document:', error);
      alert('Erro ao aprovar documento');
    } finally {
      setIsUpdating(false);
    }
  };


  const handleDeleteDocument = async (documentId: number) => {
    if (documentId === 0) return; // Documento não enviado ainda
    
    if (!confirm('Tem certeza que deseja deletar este documento?')) {
      return;
    }

    try {
      setIsUpdating(true);
      
      const { error } = await supabase
        .from('representative_documents')
        .delete()
        .eq('id', documentId);

      if (error) {
        console.error('Error deleting document:', error);
        alert('Erro ao deletar documento');
        return;
      }

      await loadDocuments();
      onDocumentStatusChange?.();
      console.log('🗑️ Documento deletado');
    } catch (error) {
      console.error('Error deleting document:', error);
      alert('Erro ao deletar documento');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleApproveAll = async () => {
    if (!confirm('Tem certeza que deseja aprovar todos os documentos enviados?')) {
      return;
    }

    try {
      setIsUpdating(true);
      
      // Aprovar todos os documentos pendentes
      const { error: documentsError } = await supabase
        .from('representative_documents')
        .update({ status: 'Aprovado' })
        .eq('representative_id', representativeId)
        .eq('status', 'Pendente');

      if (documentsError) {
        console.error('Error approving all documents:', documentsError);
        alert('Erro ao aprovar documentos');
        return;
      }

      // Atualizar status de documentos aprovados na tabela profiles
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ documents_approved: true })
        .eq('id', representativeId);

      if (profileError) {
        console.error('Error updating profile documents_approved:', profileError);
        alert('Erro ao atualizar status do perfil');
        return;
      }

      await loadDocuments();
      onDocumentStatusChange?.();
      console.log('✅ Todos os documentos aprovados e perfil atualizado');
    } catch (error) {
      console.error('Error approving all documents:', error);
      alert('Erro ao aprovar documentos');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDownloadDocument = async (fileUrl: string, documentType: string) => {
    try {
      console.log('📥 Iniciando download:', fileUrl);
      
      // Extrair apenas o caminho relativo do file_url
      let relativePath = fileUrl;
      
      // Se contém caminho do servidor de produção, extrair apenas a parte após 'documentos/'
      if (fileUrl.includes('/var/www/CredCar-Finance/documentos/')) {
        relativePath = fileUrl.split('/var/www/CredCar-Finance/documentos/')[1];
      } else if (fileUrl.includes('documentos/')) {
        // Se contém 'documentos/', pegar apenas a parte após isso
        relativePath = fileUrl.split('documentos/')[1];
      }
      
      console.log('🔍 Original file_url:', fileUrl);
      console.log('🔍 Extracted relative path:', relativePath);
      
      // Extrair nome do arquivo da URL
      const fileName = relativePath.split('/').pop() || `${documentType}.pdf`;
      
      // Determinar URL base baseada no ambiente
      const baseUrl = window.location.hostname === 'localhost' 
        ? 'http://localhost:3001' 
        : 'https://sistema.credcarmultimarcas.com.br';
      
      console.log('🌐 Base URL:', baseUrl);
      
      // Fazer download do arquivo usando a URL correta
      const response = await fetch(`${baseUrl}/api/download-file?path=${encodeURIComponent(relativePath)}`);
      
      if (!response.ok) {
        throw new Error('Erro ao baixar arquivo');
      }
      
      const blob = await response.blob();
      
      // Criar link de download
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      console.log('✅ Download concluído:', fileName);
    } catch (error) {
      console.error('❌ Erro no download:', error);
      alert('Erro ao baixar documento. Tente novamente.');
    }
  };

  const handleViewDocument = (fileUrl: string, documentType: string) => {
    try {
      console.log('👁️ Visualizando documento:', fileUrl);
      
      // Extrair apenas o caminho relativo do file_url
      // Se o file_url contém caminho completo do servidor, extrair apenas a parte relativa
      let relativePath = fileUrl;
      
      // Se contém caminho do servidor de produção, extrair apenas a parte após 'documentos/'
      if (fileUrl.includes('/var/www/CredCar-Finance/documentos/')) {
        relativePath = fileUrl.split('/var/www/CredCar-Finance/documentos/')[1];
      } else if (fileUrl.includes('documentos/')) {
        // Se contém 'documentos/', pegar apenas a parte após isso
        relativePath = fileUrl.split('documentos/')[1];
      }
      
      console.log('🔍 Original file_url:', fileUrl);
      console.log('🔍 Extracted relative path:', relativePath);
      
      // Extrair extensão do arquivo
      const ext = relativePath.split('.').pop()?.toLowerCase();
      const viewableTypes = ['pdf', 'jpg', 'jpeg', 'png', 'gif'];
      
      // Verificar se o tipo de arquivo é visualizável
      if (!ext || !viewableTypes.includes(ext)) {
        alert('Tipo de arquivo inválido para visualização. Apenas PDF e imagens podem ser visualizados.');
        return;
      }
      
      // Determinar URL base baseada no ambiente
      const baseUrl = window.location.hostname === 'localhost' 
        ? 'http://localhost:3001' 
        : 'https://sistema.credcarmultimarcas.com.br';
      
      console.log('🌐 Base URL:', baseUrl);
      
      // Construir URL de visualização usando a URL correta
      const viewUrl = `${baseUrl}/api/view-file?path=${encodeURIComponent(relativePath)}`;
      
      console.log('🔗 View URL:', viewUrl);
      
      // Abrir em nova aba
      window.open(viewUrl, '_blank');
      
      console.log('✅ Documento aberto em nova aba');
    } catch (error) {
      console.error('❌ Erro ao visualizar documento:', error);
      alert('Erro ao visualizar documento. Tente novamente.');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Aprovado':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'Reprovado':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'Pendente':
        return <FileText className="h-4 w-4 text-yellow-600" />;
      default:
        return <FileText className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Aprovado':
        return 'bg-green-100 text-green-800';
      case 'Reprovado':
        return 'bg-red-100 text-red-800';
      case 'Pendente':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const uploadedDocuments = documents.filter(doc => doc.id !== 0);
  const pendingDocuments = uploadedDocuments.filter(doc => doc.status === 'Pendente');

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
            <span className="ml-2">Carregando documentos...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Documentos
            </CardTitle>
            <CardDescription>
              Status dos documentos enviados pelo representante
            </CardDescription>
          </div>
          {pendingDocuments.length > 0 && (
            <Button
              onClick={handleApproveAll}
              disabled={isUpdating}
              className="bg-green-600 hover:bg-green-700"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Aprovar Todos
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Documentos da Empresa */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <div className="h-1 w-8 bg-blue-600"></div>
              <h4 className="text-lg font-semibold text-blue-800">Documentos da Empresa</h4>
              <Badge variant="outline" className="bg-blue-50 text-blue-700">
                {documents.filter(d => d.document_type.includes('empresa') || d.document_type.includes('cnpj') || d.document_type.includes('contrato') || d.document_type.includes('mei') || d.document_type.includes('bancários') || d.document_type.includes('declaração') || d.document_type.includes('cartilha de credenciamento preenchida')).length} documentos
              </Badge>
            </div>
            
            <div className="grid gap-4 md:grid-cols-2">
              {documents.filter(doc => doc.document_type.includes('empresa') || doc.document_type.includes('cnpj') || doc.document_type.includes('contrato') || doc.document_type.includes('mei') || doc.document_type.includes('bancários') || doc.document_type.includes('declaração') || doc.document_type.includes('cartilha de credenciamento preenchida')).map((doc) => {
                const uploadDate = doc.uploaded_at
                  ? new Date(doc.uploaded_at).toLocaleDateString("pt-BR")
                  : null;

                return (
                  <div
                    key={doc.document_type}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      {getStatusIcon(doc.status)}
                      <div>
                        <p className="text-sm font-medium">
                          {doc.document_type}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {uploadDate ? `Enviado em ${uploadDate}` : 'Não enviado'}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Badge className={getStatusColor(doc.status)}>
                        {doc.status}
                      </Badge>
                      
                      {/* Ações apenas para documentos enviados */}
                      {doc.id !== 0 && (
                        <>
                          {/* Visualizar */}
                          {doc.file_url && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleViewDocument(doc.file_url, doc.document_type)}
                              title="Visualizar documento"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          )}
                          
                          {/* Download */}
                          {doc.file_url && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDownloadDocument(doc.file_url, doc.document_type)}
                              title="Baixar documento"
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                          )}
                          
                          {/* Aprovar */}
                          {doc.status === 'Pendente' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleApproveDocument(doc.id)}
                              disabled={isUpdating}
                              className="text-green-600 hover:text-green-700"
                              title="Aprovar documento"
                            >
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                          )}
                          
                          {/* Deletar - apenas para documentos não aprovados */}
                          {doc.status !== 'Aprovado' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteDocument(doc.id)}
                              disabled={isUpdating}
                              className="text-red-600 hover:text-red-700"
                              title="Deletar documento"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Documentos do Sócio */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <div className="h-1 w-8 bg-green-600"></div>
              <h4 className="text-lg font-semibold text-green-800">Documentos do Sócio</h4>
              <Badge variant="outline" className="bg-green-50 text-green-700">
                {documents.filter(d => d.document_type.includes('sócio') || d.document_type.includes('pf') || d.document_type.includes('certidão') || d.document_type.includes('foto') || d.document_type.includes('cnh') || d.document_type.includes('identidade')).length} documentos
              </Badge>
            </div>
            
            <div className="grid gap-4 md:grid-cols-2">
              {documents.filter(doc => doc.document_type.includes('sócio') || doc.document_type.includes('pf') || doc.document_type.includes('certidão') || doc.document_type.includes('foto') || doc.document_type.includes('cnh') || doc.document_type.includes('identidade')).map((doc) => {
                const uploadDate = doc.uploaded_at
                  ? new Date(doc.uploaded_at).toLocaleDateString("pt-BR")
                  : null;

                return (
                  <div
                    key={doc.document_type}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      {getStatusIcon(doc.status)}
                      <div>
                        <p className="text-sm font-medium">
                          {doc.document_type}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {uploadDate ? `Enviado em ${uploadDate}` : 'Não enviado'}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Badge className={getStatusColor(doc.status)}>
                        {doc.status}
                      </Badge>
                      
                      {/* Ações apenas para documentos enviados */}
                      {doc.id !== 0 && (
                        <>
                          {/* Visualizar */}
                          {doc.file_url && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleViewDocument(doc.file_url, doc.document_type)}
                              title="Visualizar documento"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          )}
                          
                          {/* Download */}
                          {doc.file_url && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDownloadDocument(doc.file_url, doc.document_type)}
                              title="Baixar documento"
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                          )}
                          
                          {/* Aprovar */}
                          {doc.status === 'Pendente' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleApproveDocument(doc.id)}
                              disabled={isUpdating}
                              className="text-green-600 hover:text-green-700"
                              title="Aprovar documento"
                            >
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                          )}
                          
                          {/* Deletar - apenas para documentos não aprovados */}
                          {doc.status !== 'Aprovado' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteDocument(doc.id)}
                              disabled={isUpdating}
                              className="text-red-600 hover:text-red-700"
                              title="Deletar documento"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default DocumentApproval;
