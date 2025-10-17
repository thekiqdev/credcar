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
  const [selectedDocument, setSelectedDocument] = useState<PartnerDocument | null>(null);
  const [showReviewDialog, setShowReviewDialog] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
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

  const handleReviewDocument = (document: PartnerDocument) => {
    setSelectedDocument(document);
    setRejectionReason(document.rejection_reason || '');
    setShowReviewDialog(true);
  };

  const handleApproveDocument = async () => {
    if (!selectedDocument) return;
    
    setIsSubmitting(true);
    try {
      await partnersService.updateDocumentStatus(selectedDocument.id, 'Aprovado');
      setShowReviewDialog(false);
      loadPartnerDocuments();
      onStatusChange?.();
    } catch (err) {
      console.error('Error approving document:', err);
      setError('Erro ao aprovar documento.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRejectDocument = async () => {
    if (!selectedDocument || !rejectionReason.trim()) {
      alert('Por favor, forneça um motivo para a rejeição.');
      return;
    }
    
    setIsSubmitting(true);
    try {
      await partnersService.updateDocumentStatus(selectedDocument.id, 'Reprovado', rejectionReason);
      setShowReviewDialog(false);
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
        throw new Error(`Erro ao baixar arquivo: ${response.statusText}`);
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
                            onClick={() => handleReviewDocument(doc)}
                            title="Visualizar Documento"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {isAdminMode && (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleReviewDocument(doc)}
                                title="Revisar Documento"
                                className="text-blue-600 hover:text-blue-700"
                              >
                                <CheckCircle className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleReviewDocument(doc)}
                                title="Reprovar Documento"
                                className="text-red-600 hover:text-red-700"
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

      {/* Review Document Dialog */}
      <Dialog open={showReviewDialog} onOpenChange={setShowReviewDialog}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Revisar Documento</DialogTitle>
            <DialogDescription>
              Revise o documento: {selectedDocument?.document_type}
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Sócio:</label>
              <p className="text-sm text-gray-600">{partnerName} ({partnerCpf})</p>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Tipo de Documento:</label>
              <p className="text-sm text-gray-600">{selectedDocument?.document_type}</p>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Status Atual:</label>
              <Badge variant={getStatusBadgeVariant(selectedDocument?.status || 'Pendente')}>
                {getStatusIcon(selectedDocument?.status || 'Pendente')}
                {selectedDocument?.status || 'Pendente'}
              </Badge>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Link do Documento:</label>
              <a
                href={selectedDocument?.file_url ? `${window.location.hostname === 'localhost' ? 'http://localhost:3001' : 'https://sistema.credcarmultimarcas.com.br'}/api/download-file?path=${encodeURIComponent(selectedDocument.file_url.includes('documentos/') ? selectedDocument.file_url.split('documentos/')[1] : selectedDocument.file_url)}` : '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline flex items-center gap-1"
              >
                {selectedDocument?.file_url ? 'Visualizar/Baixar' : 'N/A'} <Eye className="h-4 w-4" />
              </a>
            </div>
            
            {selectedDocument?.status === 'Reprovado' && selectedDocument?.rejection_reason && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Motivo da Rejeição Anterior:</label>
                <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
                  {selectedDocument.rejection_reason}
                </p>
              </div>
            )}
            
            {isAdminMode && selectedDocument?.status !== 'Aprovado' && (
              <div className="space-y-2">
                <label htmlFor="rejectionReason" className="text-sm font-medium">
                  Motivo da Rejeição (se reprovar)
                </label>
                <textarea
                  id="rejectionReason"
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Descreva o motivo da rejeição do documento..."
                  className="w-full p-2 border rounded-md resize-none"
                  rows={3}
                />
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReviewDialog(false)} disabled={isSubmitting}>
              Cancelar
            </Button>
            {isAdminMode && selectedDocument?.status !== 'Aprovado' && (
              <Button 
                onClick={handleApproveDocument} 
                disabled={isSubmitting} 
                className="bg-green-600 hover:bg-green-700"
              >
                {isSubmitting ? 'Aprovando...' : 'Aprovar'}
              </Button>
            )}
            {isAdminMode && selectedDocument?.status !== 'Reprovado' && (
              <Button 
                onClick={handleRejectDocument} 
                disabled={isSubmitting || !rejectionReason.trim()} 
                className="bg-red-600 hover:bg-red-700"
              >
                {isSubmitting ? 'Reprovando...' : 'Reprovar'}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default PartnerDocumentsView;
