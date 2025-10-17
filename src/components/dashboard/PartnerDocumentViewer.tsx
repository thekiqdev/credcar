import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
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
import { partnersService, uploadService } from '../../lib/supabase';
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

interface PartnerDocumentViewerProps {
  partner: {
    id: string;
    name: string;
    cpf: string;
    email: string | null;
    phone: string | null;
  };
  isOpen: boolean;
  onClose: () => void;
}

const PartnerDocumentViewer: React.FC<PartnerDocumentViewerProps> = ({
  partner,
  isOpen,
  onClose
}) => {
  const [documents, setDocuments] = useState<PartnerDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    if (isOpen && partner.id) {
      loadPartnerDocuments();
    }
  }, [isOpen, partner.id]);

  const loadPartnerDocuments = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const { data, error } = await partnersService.getPartnerDocuments(partner.id);
      
      if (error) {
        throw error;
      }
      
      setDocuments(data || []);
    } catch (err) {
      console.error('Error loading partner documents:', err);
      setError('Erro ao carregar documentos do sócio.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleApproveDocument = async (documentId: number) => {
    try {
      setIsUpdating(true);
      await partnersService.updateDocumentStatus(documentId, 'Aprovado');
      await loadPartnerDocuments(); // Recarregar documentos
    } catch (err) {
      console.error('Error approving document:', err);
      setError('Erro ao aprovar documento.');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleRejectDocument = async (documentId: number) => {
    const reason = prompt('Motivo da rejeição:');
    if (!reason || !reason.trim()) {
      alert('Motivo da rejeição é obrigatório.');
      return;
    }

    try {
      setIsUpdating(true);
      await partnersService.updateDocumentStatus(documentId, 'Reprovado', reason);
      await loadPartnerDocuments(); // Recarregar documentos
    } catch (err) {
      console.error('Error rejecting document:', err);
      setError('Erro ao reprovar documento.');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDownloadDocument = async (fileUrl: string, documentType: string) => {
    try {
      const fullUrl = uploadService.getDownloadUrl(fileUrl);
      window.open(fullUrl, '_blank');
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

  const approvedCount = documents.filter(doc => doc.status === 'Aprovado').length;
  const totalCount = documents.length;
  const progressPercentage = totalCount > 0 ? (approvedCount / totalCount) * 100 : 0;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Documentos do Sócio: {partner.name}
          </DialogTitle>
          <DialogDescription>
            Visualize e gerencie os documentos enviados pelo sócio {partner.name} (CPF: {partner.cpf})
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Informações do Sócio */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Informações do Sócio</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-600">Nome</p>
                  <p className="text-sm">{partner.name}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">CPF</p>
                  <p className="text-sm">{partner.cpf}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Email</p>
                  <p className="text-sm">{partner.email || 'Não informado'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Telefone</p>
                  <p className="text-sm">{partner.phone || 'Não informado'}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Progresso dos Documentos */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Progresso dos Documentos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Documentos Aprovados</span>
                  <span className="text-sm text-gray-600">{approvedCount}/{totalCount}</span>
                </div>
                <Progress value={progressPercentage} className="h-2" />
                <div className="flex gap-2">
                  <Badge variant="default" className="flex items-center gap-1">
                    <CheckCircle className="h-3 w-3" />
                    Aprovados ({approvedCount})
                  </Badge>
                  <Badge variant="secondary" className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Pendentes ({documents.filter(d => d.status === 'Pendente').length})
                  </Badge>
                  <Badge variant="destructive" className="flex items-center gap-1">
                    <XCircle className="h-3 w-3" />
                    Reprovados ({documents.filter(d => d.status === 'Reprovado').length})
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Error Alert */}
          {error && (
            <Alert className="border-red-200 bg-red-50">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">
                {error}
              </AlertDescription>
            </Alert>
          )}

          {/* Lista de Documentos */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Documentos Enviados</CardTitle>
            </CardHeader>
            <CardContent>
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
                            {doc.status === 'Pendente' && (
                              <>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleApproveDocument(doc.id)}
                                  disabled={isUpdating}
                                  className="text-green-600 hover:text-green-700"
                                  title="Aprovar Documento"
                                >
                                  <CheckCircle className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleRejectDocument(doc.id)}
                                  disabled={isUpdating}
                                  className="text-red-600 hover:text-red-700"
                                  title="Reprovar Documento"
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
            </CardContent>
          </Card>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PartnerDocumentViewer;
