import React, { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  CheckCircle,
  XCircle,
  Clock,
  Search,
  Filter,
  RefreshCw,
} from "lucide-react";
import { withdrawalService, WithdrawalRequest } from "../../lib/withdrawal.service";

interface WithdrawalManagementProps {
  onClose?: () => void;
}

const WithdrawalManagement: React.FC<WithdrawalManagementProps> = ({ onClose }) => {
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [filteredWithdrawals, setFilteredWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<WithdrawalRequest | null>(null);
  const [isApproveDialogOpen, setIsApproveDialogOpen] = useState(false);
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  // Carregar solicitações
  const loadWithdrawals = async () => {
    try {
      setIsLoading(true);
      const data = await withdrawalService.getAllWithdrawals();
      setWithdrawals(data);
      setFilteredWithdrawals(data);
    } catch (error) {
      console.error("Erro ao carregar solicitações:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Filtrar solicitações
  const filterWithdrawals = () => {
    let filtered = withdrawals;

    // Filtro por status
    if (statusFilter !== "all") {
      filtered = filtered.filter(w => w.status === statusFilter);
    }

    // Filtro por busca
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(w => 
        w.request_code.toLowerCase().includes(term) ||
        w.profiles?.full_name?.toLowerCase().includes(term) ||
        w.profiles?.email?.toLowerCase().includes(term)
      );
    }

    setFilteredWithdrawals(filtered);
  };

  // Aprovar solicitação
  const handleApprove = async () => {
    if (!selectedWithdrawal) return;

    try {
      setIsProcessing(true);
      await withdrawalService.approveWithdrawal(selectedWithdrawal.id);
      
      // Recarregar dados
      await loadWithdrawals();
      
      // Fechar dialog
      setIsApproveDialogOpen(false);
      setSelectedWithdrawal(null);
      
      alert(`✅ Solicitação ${selectedWithdrawal.request_code} aprovada com sucesso!`);
    } catch (error) {
      console.error("Erro ao aprovar solicitação:", error);
      alert("❌ Erro ao aprovar solicitação. Tente novamente.");
    } finally {
      setIsProcessing(false);
    }
  };

  // Rejeitar solicitação
  const handleReject = async () => {
    if (!selectedWithdrawal || !rejectionReason.trim()) {
      alert("Por favor, informe o motivo da rejeição");
      return;
    }

    try {
      setIsProcessing(true);
      await withdrawalService.rejectWithdrawal(selectedWithdrawal.id, rejectionReason);
      
      // Recarregar dados
      await loadWithdrawals();
      
      // Fechar dialog
      setIsRejectDialogOpen(false);
      setSelectedWithdrawal(null);
      setRejectionReason("");
      
      alert(`✅ Solicitação ${selectedWithdrawal.request_code} rejeitada com sucesso!`);
    } catch (error) {
      console.error("Erro ao rejeitar solicitação:", error);
      alert("❌ Erro ao rejeitar solicitação. Tente novamente.");
    } finally {
      setIsProcessing(false);
    }
  };

  // Formatar data
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Formatar valor
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  // Obter cor do status
  const getStatusColor = (status: string) => {
    switch (status) {
      case "Aprovado":
        return "bg-green-500 text-white hover:bg-green-600 border-green-500";
      case "Rejeitado":
        return "bg-red-500 text-white hover:bg-red-600 border-red-500";
      case "Pendente":
        return "bg-yellow-500 text-white hover:bg-yellow-600 border-yellow-500";
      default:
        return "bg-gray-500 text-white hover:bg-gray-600 border-gray-500";
    }
  };

  // Contar solicitações por status
  const getStatusCounts = () => {
    const counts = {
      total: withdrawals.length,
      pending: withdrawals.filter(w => w.status === "Pendente").length,
      approved: withdrawals.filter(w => w.status === "Aprovado").length,
      rejected: withdrawals.filter(w => w.status === "Rejeitado").length,
    };
    return counts;
  };

  const statusCounts = getStatusCounts();

  useEffect(() => {
    loadWithdrawals();
  }, []);

  useEffect(() => {
    filterWithdrawals();
  }, [searchTerm, statusFilter, withdrawals]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-8 w-8 animate-spin" />
        <span className="ml-2">Carregando solicitações...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Solicitações de Retirada</h2>
          <p className="text-gray-600">
            Gerencie as solicitações de retirada dos representantes
          </p>
        </div>
        <Button onClick={loadWithdrawals} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Atualizar
        </Button>
      </div>

      {/* Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <Clock className="h-8 w-8 text-yellow-500" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Pendentes</p>
                <p className="text-2xl font-bold text-yellow-600">{statusCounts.pending}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <CheckCircle className="h-8 w-8 text-green-500" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Aprovadas</p>
                <p className="text-2xl font-bold text-green-600">{statusCounts.approved}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <XCircle className="h-8 w-8 text-red-500" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Rejeitadas</p>
                <p className="text-2xl font-bold text-red-600">{statusCounts.rejected}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <Filter className="h-8 w-8 text-blue-500" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Total</p>
                <p className="text-2xl font-bold text-blue-600">{statusCounts.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Buscar por código, nome ou email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="md:w-48">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Todos os status</option>
                <option value="Pendente">Pendente</option>
                <option value="Aprovado">Aprovado</option>
                <option value="Rejeitado">Rejeitado</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabela */}
      <Card>
        <CardHeader>
          <CardTitle>Solicitações</CardTitle>
          <CardDescription>
            {filteredWithdrawals.length} solicitação(ões) encontrada(s)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Representante</TableHead>
                  <TableHead>Valor Solicitado</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredWithdrawals.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                      Nenhuma solicitação encontrada
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredWithdrawals.map((withdrawal) => (
                    <TableRow key={withdrawal.id}>
                      <TableCell className="font-mono text-sm">
                        {withdrawal.request_code}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{withdrawal.profiles?.full_name || "N/A"}</p>
                          <p className="text-sm text-gray-500">{withdrawal.profiles?.email || "N/A"}</p>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">
                        {formatCurrency(withdrawal.requested_value)}
                      </TableCell>
                      <TableCell className="text-sm">
                        {formatDate(withdrawal.requested_at)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={getStatusColor(withdrawal.status)}
                        >
                          {withdrawal.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {withdrawal.status === "Pendente" ? (
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-green-600 hover:text-green-700 hover:bg-green-50"
                              onClick={() => {
                                setSelectedWithdrawal(withdrawal);
                                setIsApproveDialogOpen(true);
                              }}
                            >
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              onClick={() => {
                                setSelectedWithdrawal(withdrawal);
                                setIsRejectDialogOpen(true);
                              }}
                            >
                              <XCircle className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-500">
                            {withdrawal.status === "Aprovado" ? "Processado" : "Rejeitado"}
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Dialog de Aprovação */}
      <Dialog open={isApproveDialogOpen} onOpenChange={setIsApproveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Aprovar Solicitação</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja aprovar esta solicitação de retirada?
            </DialogDescription>
          </DialogHeader>
          {selectedWithdrawal && (
            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <p><strong>Código:</strong> {selectedWithdrawal.request_code}</p>
                <p><strong>Representante:</strong> {selectedWithdrawal.profiles?.full_name}</p>
                <p><strong>Valor:</strong> {formatCurrency(selectedWithdrawal.requested_value)}</p>
                <p><strong>Data:</strong> {formatDate(selectedWithdrawal.requested_at)}</p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsApproveDialogOpen(false)}
              disabled={isProcessing}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleApprove}
              disabled={isProcessing}
              className="bg-green-600 hover:bg-green-700"
            >
              {isProcessing ? "Processando..." : "Aprovar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Rejeição */}
      <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rejeitar Solicitação</DialogTitle>
            <DialogDescription>
              Informe o motivo da rejeição desta solicitação de retirada.
            </DialogDescription>
          </DialogHeader>
          {selectedWithdrawal && (
            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <p><strong>Código:</strong> {selectedWithdrawal.request_code}</p>
                <p><strong>Representante:</strong> {selectedWithdrawal.profiles?.full_name}</p>
                <p><strong>Valor:</strong> {formatCurrency(selectedWithdrawal.requested_value)}</p>
                <p><strong>Data:</strong> {formatDate(selectedWithdrawal.requested_at)}</p>
              </div>
              <div>
                <Label htmlFor="rejection-reason">Motivo da Rejeição *</Label>
                <Input
                  id="rejection-reason"
                  placeholder="Ex: Documentação incompleta, valor acima do permitido..."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsRejectDialogOpen(false);
                setRejectionReason("");
              }}
              disabled={isProcessing}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleReject}
              disabled={isProcessing || !rejectionReason.trim()}
              className="bg-red-600 hover:bg-red-700"
            >
              {isProcessing ? "Processando..." : "Rejeitar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default WithdrawalManagement;
