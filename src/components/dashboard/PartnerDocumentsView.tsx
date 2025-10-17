import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  Eye, 
  Download, 
  CheckCircle, 
  XCircle, 
  Clock,
  FileText,
  AlertCircle
} from 'lucide-react';
import { partnersService } from '../../lib/supabase';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface PartnerDocument {
  id: number;
  partner_id: string;
  document_type: string;
  file_url: string;
  status: 'Pendente' | 'Aprovado' | 'Reprovado';
  uploaded_at: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  rejection_reason: string | null;
  created_at: string;
}

interface PartnerDocumentsViewProps {
  partnerId: string;
  partnerName: string;
  partnerCpf: string;
  isOpen: boolean;
  onClose: () => void;
  onStatusChange?: () => void;
  isAdminMode?: boolean; // Nova prop para identificar se é modo admin
}

const PartnerDocumentsView: React.FC<PartnerDocumentsViewProps> = ({
  partnerId,
  partnerName,
  partnerCpf,
  isOpen,
  onClose,
  onStatusChange,
  isAdminMode = false
}) => {
  const [documents, setDocuments] = useState<PartnerDocument[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen && partnerId) {
      console.log('🔄 PartnerDocumentsView: useEffect triggered');
      console.log('📋 Partner ID:', partnerId);
      console.log('📋 Partner Name:', partnerName);
      console.log('📋 Partner CPF:', partnerCpf);
      loadPartnerDocuments();
    }
  }, [isOpen, partnerId]);

  const loadPartnerDocuments = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      console.log('🔍 Loading documents for partner:', partnerId);
      
      // Teste direto com Supabase para debug
      const { createClient } = await import('@supabase/supabase-js');
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      const supabase = createClient(supabaseUrl, supabaseKey);
      
      console.log('🔍 Supabase URL:', supabaseUrl);
      console.log('🔍 Supabase Key exists:', !!supabaseKey);
      
      // Buscar todos os documentos primeiro para debug
      const { data: allDocs, error: allError } = await supabase
        .from('partner_documents')
        .select('*')
        .order('created_at', { ascending: false });
      
      console.log('📋 All partner documents:', allDocs);
      console.log('📋 All partner documents error:', allError);
      
      // Buscar documentos específicos do sócio
      const { data, error } = await supabase
        .from('partner_documents')
        .select('*')
        .eq('partner_id', partnerId)
        .order('created_at', { ascending: false });
      
      console.log('📋 Partner documents response:', { data, error });
      
      if (error) {
        throw error;
      }
      
      setDocuments(data || []);
      console.log('📄 Documents loaded:', data?.length || 0);
    } catch (err) {
      console.error('Error loading partner documents:', err);
      setError('Erro ao carregar documentos do sócio.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewDocument = async (fileUrl: string, documentType: string) => {
    try {
      console.log('👁️ Viewing document:', fileUrl);
      
      // Extract path after /documentos/
      let relativePath = fileUrl;
      if (fileUrl.includes('/documentos/')) {
        relativePath = fileUrl.split('/documentos/')[1];
      }
      
      // Decode the path
      relativePath = decodeURIComponent(relativePath);
      
      // Replace backslashes with forward slashes
      relativePath = relativePath.replace(/\\/g, '/');
      
      console.log('👁️ Relative path:', relativePath);
      
      // Determine base URL based on environment
      const hostname = window.location.hostname;
      const baseUrl = hostname === 'localhost' 
        ? 'http://localhost:3001' 
        : 'https://sistema.credcarmultimarcas.com.br';
      
      // Check file type
      const fileExtension = relativePath.split('.').pop()?.toLowerCase();
      const viewableTypes = ['pdf'];
      
      if (viewableTypes.includes(fileExtension || '')) {
        // Open viewable files in new tab
        const viewUrl = `${baseUrl}/api/view-file?path=${encodeURIComponent(relativePath)}`;
        console.log('👁️ Opening view URL:', viewUrl);
        window.open(viewUrl, '_blank');
      } else {
        // For non-viewable files (DOC, DOCX), download them
        const downloadUrl = `${baseUrl}/api/download-file?path=${encodeURIComponent(relativePath)}`;
        console.log('⬇️ Opening download URL:', downloadUrl);
        window.open(downloadUrl, '_blank');
      }
    } catch (err) {
      console.error('Error viewing document:', err);
      alert('Erro ao visualizar documento. Tente novamente.');
    }
  };

  const handleApproveDocument = async (document: PartnerDocument) => {
    setIsSubmitting(true);
    try {
      await partnersService.updateDocumentStatus(document.id, 'Aprovado');
      loadPartnerDocuments();
      onStatusChange?.();
    } catch (err) {
      console.error('Error approving document:', err);
      setError('Erro ao aprovar documento.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRejectDocument = async (document: PartnerDocument) => {
    const rejectionReason = prompt('Por favor, forneça um motivo para a rejeição:');
    if (!rejectionReason || !rejectionReason.trim()) {
      return;
    }
    
    setIsSubmitting(true);
    try {
      await partnersService.updateDocumentStatus(document.id, 'Reprovado', rejectionReason);
      loadPartnerDocuments();
      onStatusChange?.();
    } catch (err) {
      console.error('Error rejecting document:', err);
      setError('Erro ao reprovar documento.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDownloadDocument = async (fileUrl: string, documentType: string) => {
    try {
      console.log('📄 Downloading document:', fileUrl);
      
      // Extract path after /documentos/
      let relativePath = fileUrl;
      if (fileUrl.includes('/documentos/')) {
        relativePath = fileUrl.split('/documentos/')[1];
      }
      
      // Decode the path
      relativePath = decodeURIComponent(relativePath);
      
      // Replace backslashes with forward slashes
      relativePath = relativePath.replace(/\\/g, '/');
      
      console.log('📄 Relative path:', relativePath);
      
      // Determine base URL based on environment
      const hostname = window.location.hostname;
      const baseUrl = hostname === 'localhost' 
        ? 'http://localhost:3001' 
        : 'https://sistema.credcarmultimarcas.com.br';
      
      // Check file type
      const fileExtension = relativePath.split('.').pop()?.toLowerCase();
      const viewableTypes = ['pdf'];
      
      if (viewableTypes.includes(fileExtension || '')) {
        // Open viewable files in new tab
        const viewUrl = `${baseUrl}/api/view-file?path=${encodeURIComponent(relativePath)}`;
        console.log('👁️ Opening view URL:', viewUrl);
        window.open(viewUrl, '_blank');
      } else {
        // For non-viewable files (DOC, DOCX), download them
        const downloadUrl = `${baseUrl}/api/download-file?path=${encodeURIComponent(relativePath)}`;
        console.log('⬇️ Opening download URL:', downloadUrl);
        window.open(downloadUrl, '_blank');
      }
    } catch (err) {
      console.error('Error downloading document:', err);
      alert('Erro ao baixar documento. Tente novamente.');
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'Aprovado':
        return 'default';
      case 'Reprovado':
        return 'destructive';
      case 'Pendente':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Aprovado':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'Reprovado':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'Pendente':
        return <Clock className="h-4 w-4 text-yellow-600" />;
      default:
        return <FileText className="h-4 w-4 text-gray-600" />;
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Documentos do Sócio: {partnerName}
            </DialogTitle>
            <DialogDescription>
              CPF: {partnerCpf} - Gerencie os documentos enviados por este sócio
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {error && (
              <Alert className="border-red-200 bg-red-50">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-800">
                  {error}
                </AlertDescription>
              </Alert>
            )}

            {isLoading ? (
              <div className="text-center py-8">
                <Clock className="h-8 w-8 text-blue-600 animate-spin mx-auto mb-4" />
                <p className="text-gray-600">Carregando documentos...</p>
              </div>
            ) : documents.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                <p className="text-lg font-medium mb-2">Nenhum documento encontrado</p>
                <p className="text-muted-foreground">
                  Este sócio ainda não enviou nenhum documento.
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tipo de Documento</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Enviado Em</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {documents.map((doc) => (
                    <TableRow key={doc.id}>
                      <TableCell className="font-medium">
                        {doc.document_type}
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusBadgeVariant(doc.status)} className="flex items-center gap-1">
                          {getStatusIcon(doc.status)}
                          {doc.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {format(new Date(doc.uploaded_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDownloadDocument(doc.file_url, doc.document_type)}
                            title="Baixar Documento"
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewDocument(doc.file_url, doc.document_type)}
                            title="Visualizar Documento"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {isAdminMode && (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleApproveDocument(doc)}
                                title="Aprovar Documento"
                                className="text-green-600 hover:text-green-700"
                                disabled={isSubmitting || doc.status === 'Aprovado'}
                              >
                                <CheckCircle className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleRejectDocument(doc)}
                                title="Reprovar Documento"
                                className="text-red-600 hover:text-red-700"
                                disabled={isSubmitting || doc.status === 'Reprovado'}
                              >
                                <XCircle className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={onClose}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default PartnerDocumentsView;
