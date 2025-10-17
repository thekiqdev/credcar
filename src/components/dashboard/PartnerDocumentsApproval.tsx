/**
 * Componente de Aprovação de Documentos de Sócios
 * Permite ao admin aprovar/reprovar documentos enviados pelos sócios
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { 
  CheckCircle, 
  XCircle, 
  Clock,
  Eye,
  Download,
  FileText,
  Users,
  AlertCircle,
  Filter
} from 'lucide-react';
import { partnersService, supabase } from '../../lib/supabase';
import { uploadService } from '../../lib/upload.service';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface Partner {
  id: string;
  representative_id: string;
  name: string;
  cpf: string;
  email: string | null;
  phone: string | null;
  status: string | null;
  documents_approved: boolean | null;
  created_at: string;
  representative?: {
    name: string;
    email: string;
  };
}

interface PartnerDocument {
  id: number;
  partner_id: string;
  document_type: string;
  file_url: string;
  status: string;
  uploaded_at: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  rejection_reason: string | null;
  partner?: Partner;
}

const PartnerDocumentsApproval: React.FC = () => {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [documents, setDocuments] = useState<PartnerDocument[]>([]);
  const [filteredDocuments, setFilteredDocuments] = useState<PartnerDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  
  // Dialog states
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<PartnerDocument | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Statistics
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    partnersWithPendingDocs: 0
  });

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    applyFilter();
  }, [filter, documents]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Load all partners with their representative info
      const { data: partnersData, error: partnersError } = await supabase
        .from('partners')
        .select(`
          *,
          profiles:representative_id (
            name,
            email
          )
        `)
        .order('created_at', { ascending: false });

      if (partnersError) throw partnersError;

      // Load all partner documents
      const { data: documentsData, error: documentsError } = await supabase
        .from('partner_documents')
        .select(`
          *,
          partners:partner_id (
            id,
            name,
            cpf,
            email,
            phone,
            status,
            documents_approved,
            representative_id,
            profiles:representative_id (
              name,
              email
            )
          )
        `)
        .order('uploaded_at', { ascending: false });

      if (documentsError) throw documentsError;

      setPartners(partnersData || []);
      setDocuments(documentsData || []);

      // Calculate statistics
      const totalDocs = documentsData?.length || 0;
      const pendingDocs = documentsData?.filter(d => d.status === 'Pendente').length || 0;
      const approvedDocs = documentsData?.filter(d => d.status === 'Aprovado').length || 0;
      const rejectedDocs = documentsData?.filter(d => d.status === 'Reprovado').length || 0;
      
      // Count partners with pending documents
      const partnersWithPending = new Set(
        documentsData?.filter(d => d.status === 'Pendente').map(d => d.partner_id)
      ).size;

      setStats({
        total: totalDocs,
        pending: pendingDocs,
        approved: approvedDocs,
        rejected: rejectedDocs,
        partnersWithPendingDocs: partnersWithPending
      });

    } catch (error) {
      console.error('Error loading data:', error);
      setError('Erro ao carregar dados');
    } finally {
      setIsLoading(false);
    }
  };

  const applyFilter = () => {
    let filtered = documents;

    switch (filter) {
      case 'pending':
        filtered = documents.filter(d => d.status === 'Pendente');
        break;
      case 'approved':
        filtered = documents.filter(d => d.status === 'Aprovado');
        break;
      case 'rejected':
        filtered = documents.filter(d => d.status === 'Reprovado');
        break;
      default:
        filtered = documents;
    }

    setFilteredDocuments(filtered);
  };

  const handleViewDocument = (document: PartnerDocument) => {
    setSelectedDocument(document);
    setShowViewDialog(true);
  };

  const handleOpenApproveDialog = (document: PartnerDocument) => {
    setSelectedDocument(document);
    setShowApproveDialog(true);
  };

  const handleOpenRejectDialog = (document: PartnerDocument) => {
    setSelectedDocument(document);
    setRejectionReason('');
    setShowRejectDialog(true);
  };

  const handleApproveDocument = async () => {
    if (!selectedDocument) return;

    try {
      setIsProcessing(true);
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      // Update document status
      await partnersService.updateDocumentStatus(
        selectedDocument.id,
        'Aprovado',
        user.id,
        null
      );

      // Check if all documents for this partner are approved
      const allApproved = await partnersService.checkAllDocumentsApproved(selectedDocument.partner_id);
      
      if (allApproved) {
        await partnersService.approveAllDocuments(selectedDocument.partner_id, user.id);
      }

      setShowApproveDialog(false);
      setSelectedDocument(null);
      await loadData();
      
    } catch (error) {
      console.error('Error approving document:', error);
      setError('Erro ao aprovar documento');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRejectDocument = async () => {
    if (!selectedDocument || !rejectionReason.trim()) {
      setError('Motivo da rejeição é obrigatório');
      return;
    }

    try {
      setIsProcessing(true);
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      // Update document status
      await partnersService.updateDocumentStatus(
        selectedDocument.id,
        'Reprovado',
        user.id,
        rejectionReason
      );

      // Excluir arquivo fisicamente do servidor
      if (selectedDocument.file_url) {
        console.log('🗑️ Excluindo arquivo fisicamente:', selectedDocument.file_url);
        const deleteResult = await uploadService.deleteFile(selectedDocument.file_url);
        
        if (deleteResult.success) {
          console.log('✅ Arquivo excluído com sucesso:', deleteResult.message);
        } else {
          console.warn('⚠️ Erro ao excluir arquivo (continuando):', deleteResult.error);
          // Não falha a operação se não conseguir excluir o arquivo
        }
      }

      setShowRejectDialog(false);
      setSelectedDocument(null);
      setRejectionReason('');
      await loadData();
      
    } catch (error) {
      console.error('Error rejecting document:', error);
      setError('Erro ao reprovar documento');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownloadDocument = (fileUrl: string) => {
    window.open(fileUrl, '_blank');
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Aprovado':
        return (
          <Badge className="bg-green-100 text-green-800">
            <CheckCircle className="h-3 w-3 mr-1" />
            Aprovado
          </Badge>
        );
      case 'Reprovado':
        return (
          <Badge className="bg-red-100 text-red-800">
            <XCircle className="h-3 w-3 mr-1" />
            Reprovado
          </Badge>
        );
      case 'Pendente':
        return (
          <Badge className="bg-yellow-100 text-yellow-800">
            <Clock className="h-3 w-3 mr-1" />
            Pendente
          </Badge>
        );
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6 flex items-center justify-center">
          <div className="text-center">
            <Clock className="h-8 w-8 text-blue-600 animate-spin mx-auto mb-4" />
            <p className="text-gray-600">Carregando documentos...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total de Documentos</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Pendentes</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Aprovados</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.approved}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Reprovados</CardTitle>
            <XCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.rejected}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Sócios c/ Docs Pendentes</CardTitle>
            <Users className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.partnersWithPendingDocs}</div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Documentos de Sócios
              </CardTitle>
              <CardDescription>
                Aprove ou reprove documentos enviados pelos sócios
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <div className="flex gap-1">
                <Button
                  variant={filter === 'all' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilter('all')}
                >
                  Todos ({stats.total})
                </Button>
                <Button
                  variant={filter === 'pending' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilter('pending')}
                >
                  Pendentes ({stats.pending})
                </Button>
                <Button
                  variant={filter === 'approved' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilter('approved')}
                >
                  Aprovados ({stats.approved})
                </Button>
                <Button
                  variant={filter === 'rejected' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilter('rejected')}
                >
                  Reprovados ({stats.rejected})
                </Button>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {/* Error Alert */}
          {error && (
            <Alert className="border-red-200 bg-red-50 mb-4">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">
                {error}
              </AlertDescription>
            </Alert>
          )}

          {/* Documents Table */}
          {filteredDocuments.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Sócio</TableHead>
                  <TableHead>Representante</TableHead>
                  <TableHead>Tipo de Documento</TableHead>
                  <TableHead>Data de Envio</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDocuments.map((document) => (
                  <TableRow key={document.id}>
                    <TableCell className="font-medium">
                      <div>
                        <div>{document.partner?.name || 'N/A'}</div>
                        <div className="text-xs text-muted-foreground">
                          {document.partner?.cpf || 'N/A'}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div>{document.partner?.representative?.name || 'N/A'}</div>
                        <div className="text-xs text-muted-foreground">
                          {document.partner?.representative?.email || 'N/A'}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{document.document_type}</TableCell>
                    <TableCell>
                      {new Date(document.uploaded_at).toLocaleDateString('pt-BR')}
                    </TableCell>
                    <TableCell>{getStatusBadge(document.status)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleViewDocument(document)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleDownloadDocument(document.file_url)}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        {document.status === 'Pendente' && (
                          <>
                            <Button 
                              variant="outline" 
                              size="sm"
                              className="text-green-600 hover:text-green-700"
                              onClick={() => handleOpenApproveDialog(document)}
                            >
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm"
                              className="text-red-600 hover:text-red-700"
                              onClick={() => handleOpenRejectDialog(document)}
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
          ) : (
            <div className="text-center py-12">
              <FileText className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
              <p className="text-lg font-medium mb-2">Nenhum documento encontrado</p>
              <p className="text-muted-foreground">
                {filter === 'pending' && 'Não há documentos pendentes de aprovação.'}
                {filter === 'approved' && 'Não há documentos aprovados.'}
                {filter === 'rejected' && 'Não há documentos reprovados.'}
                {filter === 'all' && 'Não há documentos cadastrados.'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* View Document Dialog */}
      <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Visualizar Documento</DialogTitle>
            <DialogDescription>
              Detalhes do documento enviado
            </DialogDescription>
          </DialogHeader>
          {selectedDocument && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Sócio</Label>
                  <p className="font-medium">{selectedDocument.partner?.name}</p>
                </div>
                <div>
                  <Label>CPF</Label>
                  <p className="font-medium">{selectedDocument.partner?.cpf}</p>
                </div>
                <div>
                  <Label>Tipo de Documento</Label>
                  <p className="font-medium">{selectedDocument.document_type}</p>
                </div>
                <div>
                  <Label>Status</Label>
                  {getStatusBadge(selectedDocument.status)}
                </div>
                <div>
                  <Label>Data de Envio</Label>
                  <p className="font-medium">
                    {new Date(selectedDocument.uploaded_at).toLocaleString('pt-BR')}
                  </p>
                </div>
                {selectedDocument.reviewed_at && (
                  <div>
                    <Label>Data de Revisão</Label>
                    <p className="font-medium">
                      {new Date(selectedDocument.reviewed_at).toLocaleString('pt-BR')}
                    </p>
                  </div>
                )}
              </div>
              {selectedDocument.rejection_reason && (
                <div>
                  <Label>Motivo da Rejeição</Label>
                  <p className="p-3 bg-red-50 border border-red-200 rounded-md text-sm">
                    {selectedDocument.rejection_reason}
                  </p>
                </div>
              )}
              <div className="flex justify-center p-4 bg-gray-50 rounded-md">
                <Button onClick={() => handleDownloadDocument(selectedDocument.file_url)}>
                  <Download className="h-4 w-4 mr-2" />
                  Baixar Documento
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Approve Document Dialog */}
      <AlertDialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Aprovar Documento</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja aprovar este documento?<br />
              <strong className="text-gray-900">
                {selectedDocument?.document_type} - {selectedDocument?.partner?.name}
              </strong>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleApproveDocument}
              disabled={isProcessing}
              className="bg-green-600 hover:bg-green-700"
            >
              {isProcessing ? 'Aprovando...' : 'Aprovar Documento'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reject Document Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reprovar Documento</DialogTitle>
            <DialogDescription>
              Informe o motivo da reprovação do documento
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Documento</Label>
              <p className="font-medium">
                {selectedDocument?.document_type} - {selectedDocument?.partner?.name}
              </p>
            </div>
            <div>
              <Label htmlFor="rejection-reason">Motivo da Rejeição *</Label>
              <Textarea
                id="rejection-reason"
                placeholder="Descreva o motivo da reprovação..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={4}
                className="resize-none"
              />
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowRejectDialog(false)}
              disabled={isProcessing}
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleRejectDocument}
              disabled={isProcessing || !rejectionReason.trim()}
              className="bg-red-600 hover:bg-red-700"
            >
              {isProcessing ? 'Reprovando...' : 'Reprovar Documento'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PartnerDocumentsApproval;

