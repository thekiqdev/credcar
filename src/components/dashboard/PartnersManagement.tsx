/**
 * Componente de Gerenciamento de Sócios
 * Permite ao representante adicionar, editar e gerenciar sócios
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
  Plus, 
  Edit, 
  Trash2, 
  Eye, 
  Upload, 
  CheckCircle, 
  XCircle, 
  Clock,
  Users,
  FileText
} from 'lucide-react';
import { partnersService } from '../../lib/supabase';
import { Alert, AlertDescription } from '@/components/ui/alert';
import PartnerDocumentUpload from './PartnerDocumentUpload';
import PartnerDocumentsView from './PartnerDocumentsView';

interface Partner {
  id: string;
  representative_id: string;
  name: string;
  cpf: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  birth_date: string | null;
  nationality: string | null;
  marital_status: string | null;
  spouse_name: string | null;
  spouse_phone: string | null;
  position: string | null;
  participation_percentage: number | null;
  status: string | null;
  documents_approved: boolean | null;
  documents_approved_at: string | null;
  documents_approved_by: string | null;
  created_at: string;
  updated_at: string;
}

interface PartnersManagementProps {
  representativeId: string;
  onPartnersChange?: () => void;
  isAdminMode?: boolean; // Nova prop para identificar se é modo admin
}

const PartnersManagement: React.FC<PartnersManagementProps> = ({
  representativeId,
  onPartnersChange,
  isAdminMode = false
}) => {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingPartner, setEditingPartner] = useState<Partner | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDocumentUpload, setShowDocumentUpload] = useState(false);
  const [selectedPartnerForUpload, setSelectedPartnerForUpload] = useState<Partner | null>(null);
  const [showDocumentsView, setShowDocumentsView] = useState(false);
  const [selectedPartnerForView, setSelectedPartnerForView] = useState<Partner | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Form data for creating/editing partners - Simplified
  const [formData, setFormData] = useState({
    name: '',
    cpf: '',
    email: '',
    phone: '',
  });

  useEffect(() => {
    loadPartners();
  }, [representativeId]);

  const loadPartners = async () => {
    try {
      setIsLoading(true);
      const data = await partnersService.getByRepresentativeId(representativeId);
      setPartners(data);
    } catch (error) {
      console.error('Error loading partners:', error);
      setError('Erro ao carregar sócios');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreatePartner = async () => {
    try {
      setIsCreating(true);
      setError(null);

      const partnerData = {
        representative_id: representativeId,
        name: formData.name,
        cpf: formData.cpf,
        email: formData.email || null,
        phone: formData.phone || null,
        status: 'Ativo',
        documents_approved: false,
      };

      await partnersService.create(partnerData);
      
      // Reset form
      setFormData({
        name: '',
        cpf: '',
        email: '',
        phone: '',
      });

      setShowCreateDialog(false);
      await loadPartners();
      onPartnersChange?.();
    } catch (error) {
      console.error('Error creating partner:', error);
      setError('Erro ao criar sócio');
    } finally {
      setIsCreating(false);
    }
  };

  const handleEditPartner = async () => {
    if (!editingPartner) return;

    try {
      setIsEditing(true);
      setError(null);

      const updateData = {
        name: formData.name,
        cpf: formData.cpf,
        email: formData.email || null,
        phone: formData.phone || null,
      };

      await partnersService.update(editingPartner.id, updateData);
      
      setShowEditDialog(false);
      setEditingPartner(null);
      await loadPartners();
      onPartnersChange?.();
    } catch (error) {
      console.error('Error updating partner:', error);
      setError('Erro ao atualizar sócio');
    } finally {
      setIsEditing(false);
    }
  };

  const handleDeletePartner = async (partnerId: string) => {
    if (!confirm('Tem certeza que deseja excluir este sócio? Esta ação não pode ser desfeita.')) {
      return;
    }

    try {
      await partnersService.delete(partnerId);
      await loadPartners();
      onPartnersChange?.();
    } catch (error) {
      console.error('Error deleting partner:', error);
      setError('Erro ao excluir sócio');
    }
  };

  const openEditDialog = (partner: Partner) => {
    setEditingPartner(partner);
    setFormData({
      name: partner.name,
      cpf: partner.cpf,
      email: partner.email || '',
      phone: partner.phone || '',
    });
    setShowEditDialog(true);
  };

  const handleOpenDocumentUpload = (partner: Partner) => {
    setSelectedPartnerForUpload(partner);
    setShowDocumentUpload(true);
  };

  const handleCloseDocumentUpload = () => {
    setShowDocumentUpload(false);
    setSelectedPartnerForUpload(null);
  };

  const handleDocumentUploadComplete = () => {
    // Recarregar lista de sócios para atualizar status dos documentos
    loadPartners();
    onPartnersChange?.();
  };

  const handleOpenDocumentsView = (partner: Partner) => {
    setSelectedPartnerForView(partner);
    setShowDocumentsView(true);
  };

  const handleCloseDocumentsView = () => {
    setShowDocumentsView(false);
    setSelectedPartnerForView(null);
  };

  const handleDocumentsStatusChange = () => {
    loadPartners();
    onPartnersChange?.();
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Ativo':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'Pendente de Aprovação':
        return <Clock className="h-4 w-4 text-yellow-600" />;
      case 'Documentos Pendentes':
        return <FileText className="h-4 w-4 text-blue-600" />;
      default:
        return <XCircle className="h-4 w-4 text-red-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Ativo':
        return 'bg-green-100 text-green-800';
      case 'Pendente de Aprovação':
        return 'bg-yellow-100 text-yellow-800';
      case 'Documentos Pendentes':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-red-100 text-red-800';
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6 flex items-center justify-center">
          <div className="text-center">
            <Clock className="h-8 w-8 text-blue-600 animate-spin mx-auto mb-4" />
            <p className="text-gray-600">Carregando sócios...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Gerenciar Sócios
          </CardTitle>
          <CardDescription>
            Adicione e gerencie os sócios da sua empresa
          </CardDescription>
        </CardHeader>

      <CardContent className="space-y-6">
        {/* Error Alert */}
        {error && (
          <Alert className="border-red-200 bg-red-50">
            <XCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              {error}
            </AlertDescription>
          </Alert>
        )}

        {/* Add Partner Button */}
        <div className="flex justify-end">
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Adicionar Sócio
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Adicionar Novo Sócio</DialogTitle>
                <DialogDescription>
                  Preencha as informações do sócio
                </DialogDescription>
              </DialogHeader>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Nome Completo *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Nome completo do sócio"
                  />
                </div>
                <div>
                  <Label htmlFor="cpf">CPF *</Label>
                  <Input
                    id="cpf"
                    value={formData.cpf}
                    onChange={(e) => setFormData({ ...formData, cpf: e.target.value })}
                    placeholder="000.000.000-00"
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="email@exemplo.com"
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Telefone</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="(00) 00000-0000"
                  />
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleCreatePartner} disabled={isCreating || !formData.name || !formData.cpf}>
                  {isCreating ? 'Criando...' : 'Criar Sócio'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Partners List */}
        {partners.length > 0 ? (
          <div className="space-y-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>CPF</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Documentos</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {partners.map((partner) => (
                  <TableRow key={partner.id}>
                    <TableCell className="font-medium">{partner.name}</TableCell>
                    <TableCell>{partner.cpf}</TableCell>
                    <TableCell>{partner.email || 'Não informado'}</TableCell>
                    <TableCell>{partner.phone || 'Não informado'}</TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(partner.status || 'Inativo')}>
                        {getStatusIcon(partner.status || 'Inativo')}
                        <span className="ml-1">{partner.status || 'Inativo'}</span>
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={partner.documents_approved ? "default" : "secondary"}>
                        {partner.documents_approved ? 'Aprovados' : 'Pendentes'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => openEditDialog(partner)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleOpenDocumentsView(partner)}
                          title="Visualizar documentos do sócio"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleOpenDocumentUpload(partner)}
                          title="Enviar documentos do sócio"
                        >
                          <Upload className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => handleDeletePartner(partner.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="text-center py-8">
            <Users className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <p className="text-lg font-medium mb-2">Nenhum sócio cadastrado</p>
            <p className="text-muted-foreground mb-4">
              Adicione sócios para gerenciar documentos e informações.
            </p>
          </div>
        )}

        {/* Edit Dialog */}
        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Editar Sócio</DialogTitle>
              <DialogDescription>
                Atualize as informações do sócio
              </DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-name">Nome Completo *</Label>
                <Input
                  id="edit-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Nome completo do sócio"
                />
              </div>
              <div>
                <Label htmlFor="edit-cpf">CPF *</Label>
                <Input
                  id="edit-cpf"
                  value={formData.cpf}
                  onChange={(e) => setFormData({ ...formData, cpf: e.target.value })}
                  placeholder="000.000.000-00"
                />
              </div>
              <div>
                <Label htmlFor="edit-email">Email</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="email@exemplo.com"
                />
              </div>
              <div>
                <Label htmlFor="edit-phone">Telefone</Label>
                <Input
                  id="edit-phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="(00) 00000-0000"
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowEditDialog(false)}>
                Cancelar
              </Button>
              <Button onClick={handleEditPartner} disabled={isEditing || !formData.name || !formData.cpf}>
                {isEditing ? 'Salvando...' : 'Salvar Alterações'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>

      {/* Partner Document Upload Modal */}
      {showDocumentUpload && selectedPartnerForUpload && (
        <PartnerDocumentUpload
          partnerId={selectedPartnerForUpload.id}
          partnerName={selectedPartnerForUpload.name}
          partnerCpf={selectedPartnerForUpload.cpf}
          representativeId={representativeId}
          onClose={handleCloseDocumentUpload}
          onUploadComplete={handleDocumentUploadComplete}
        />
      )}

      {/* Partner Documents View Modal */}
      {showDocumentsView && selectedPartnerForView && (
        <PartnerDocumentsView
          partnerId={selectedPartnerForView.id}
          partnerName={selectedPartnerForView.name}
          partnerCpf={selectedPartnerForView.cpf}
          isOpen={showDocumentsView}
          onClose={handleCloseDocumentsView}
          onStatusChange={handleDocumentsStatusChange}
          isAdminMode={isAdminMode}
        />
      )}
    </div>
  );
};

export default PartnersManagement;
