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
}

const PartnersManagement: React.FC<PartnersManagementProps> = ({
  representativeId,
  onPartnersChange
}) => {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingPartner, setEditingPartner] = useState<Partner | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form data for creating/editing partners
  const [formData, setFormData] = useState({
    name: '',
    cpf: '',
    email: '',
    phone: '',
    address: '',
    birth_date: '',
    nationality: 'Brasileira',
    marital_status: '',
    spouse_name: '',
    spouse_phone: '',
    position: 'Sócio',
    participation_percentage: 0,
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
        address: formData.address || null,
        birth_date: formData.birth_date || null,
        nationality: formData.nationality,
        marital_status: formData.marital_status || null,
        spouse_name: formData.spouse_name || null,
        spouse_phone: formData.spouse_phone || null,
        position: formData.position,
        participation_percentage: formData.participation_percentage,
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
        address: '',
        birth_date: '',
        nationality: 'Brasileira',
        marital_status: '',
        spouse_name: '',
        spouse_phone: '',
        position: 'Sócio',
        participation_percentage: 0,
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
        address: formData.address || null,
        birth_date: formData.birth_date || null,
        nationality: formData.nationality,
        marital_status: formData.marital_status || null,
        spouse_name: formData.spouse_name || null,
        spouse_phone: formData.spouse_phone || null,
        position: formData.position,
        participation_percentage: formData.participation_percentage,
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
      address: partner.address || '',
      birth_date: partner.birth_date || '',
      nationality: partner.nationality || 'Brasileira',
      marital_status: partner.marital_status || '',
      spouse_name: partner.spouse_name || '',
      spouse_phone: partner.spouse_phone || '',
      position: partner.position || 'Sócio',
      participation_percentage: partner.participation_percentage || 0,
    });
    setShowEditDialog(true);
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
                <div className="col-span-2">
                  <Label htmlFor="address">Endereço</Label>
                  <Input
                    id="address"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="Endereço completo"
                  />
                </div>
                <div>
                  <Label htmlFor="birth_date">Data de Nascimento</Label>
                  <Input
                    id="birth_date"
                    type="date"
                    value={formData.birth_date}
                    onChange={(e) => setFormData({ ...formData, birth_date: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="nationality">Nacionalidade</Label>
                  <Input
                    id="nationality"
                    value={formData.nationality}
                    onChange={(e) => setFormData({ ...formData, nationality: e.target.value })}
                    placeholder="Brasileira"
                  />
                </div>
                <div>
                  <Label htmlFor="marital_status">Estado Civil</Label>
                  <Input
                    id="marital_status"
                    value={formData.marital_status}
                    onChange={(e) => setFormData({ ...formData, marital_status: e.target.value })}
                    placeholder="Solteiro, Casado, etc."
                  />
                </div>
                <div>
                  <Label htmlFor="spouse_name">Nome do Cônjuge</Label>
                  <Input
                    id="spouse_name"
                    value={formData.spouse_name}
                    onChange={(e) => setFormData({ ...formData, spouse_name: e.target.value })}
                    placeholder="Nome do cônjuge"
                  />
                </div>
                <div>
                  <Label htmlFor="spouse_phone">Telefone do Cônjuge</Label>
                  <Input
                    id="spouse_phone"
                    value={formData.spouse_phone}
                    onChange={(e) => setFormData({ ...formData, spouse_phone: e.target.value })}
                    placeholder="(00) 00000-0000"
                  />
                </div>
                <div>
                  <Label htmlFor="position">Cargo/Posição</Label>
                  <Input
                    id="position"
                    value={formData.position}
                    onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                    placeholder="Sócio, Diretor, etc."
                  />
                </div>
                <div>
                  <Label htmlFor="participation_percentage">Percentual de Participação (%)</Label>
                  <Input
                    id="participation_percentage"
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={formData.participation_percentage}
                    onChange={(e) => setFormData({ ...formData, participation_percentage: parseFloat(e.target.value) || 0 })}
                    placeholder="0.00"
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
                  <TableHead>Status</TableHead>
                  <TableHead>Documentos</TableHead>
                  <TableHead>Participação</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {partners.map((partner) => (
                  <TableRow key={partner.id}>
                    <TableCell className="font-medium">{partner.name}</TableCell>
                    <TableCell>{partner.cpf}</TableCell>
                    <TableCell>{partner.email || 'Não informado'}</TableCell>
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
                    <TableCell>{partner.participation_percentage || 0}%</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => openEditDialog(partner)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm">
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
              <div className="col-span-2">
                <Label htmlFor="edit-address">Endereço</Label>
                <Input
                  id="edit-address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Endereço completo"
                />
              </div>
              <div>
                <Label htmlFor="edit-birth_date">Data de Nascimento</Label>
                <Input
                  id="edit-birth_date"
                  type="date"
                  value={formData.birth_date}
                  onChange={(e) => setFormData({ ...formData, birth_date: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="edit-nationality">Nacionalidade</Label>
                <Input
                  id="edit-nationality"
                  value={formData.nationality}
                  onChange={(e) => setFormData({ ...formData, nationality: e.target.value })}
                  placeholder="Brasileira"
                />
              </div>
              <div>
                <Label htmlFor="edit-marital_status">Estado Civil</Label>
                <Input
                  id="edit-marital_status"
                  value={formData.marital_status}
                  onChange={(e) => setFormData({ ...formData, marital_status: e.target.value })}
                  placeholder="Solteiro, Casado, etc."
                />
              </div>
              <div>
                <Label htmlFor="edit-spouse_name">Nome do Cônjuge</Label>
                <Input
                  id="edit-spouse_name"
                  value={formData.spouse_name}
                  onChange={(e) => setFormData({ ...formData, spouse_name: e.target.value })}
                  placeholder="Nome do cônjuge"
                />
              </div>
              <div>
                <Label htmlFor="edit-spouse_phone">Telefone do Cônjuge</Label>
                <Input
                  id="edit-spouse_phone"
                  value={formData.spouse_phone}
                  onChange={(e) => setFormData({ ...formData, spouse_phone: e.target.value })}
                  placeholder="(00) 00000-0000"
                />
              </div>
              <div>
                <Label htmlFor="edit-position">Cargo/Posição</Label>
                <Input
                  id="edit-position"
                  value={formData.position}
                  onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                  placeholder="Sócio, Diretor, etc."
                />
              </div>
              <div>
                <Label htmlFor="edit-participation_percentage">Percentual de Participação (%)</Label>
                <Input
                  id="edit-participation_percentage"
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={formData.participation_percentage}
                  onChange={(e) => setFormData({ ...formData, participation_percentage: parseFloat(e.target.value) || 0 })}
                  placeholder="0.00"
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
  );
};

export default PartnersManagement;
