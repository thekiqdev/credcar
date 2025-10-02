import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { authService, clientService } from "@/lib/supabase";
import ClientLogin from "@/components/auth/ClientLogin";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
  FileText,
  DollarSign,
  Calendar,
  Eye,
  Download,
  Filter,
  Bell,
  CreditCard,
  TrendingUp,
  Clock,
  AlertCircle,
  CheckCircle,
  XCircle,
  User,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ClientDashboardProps {
  clientName?: string;
  clientData?: {
    contractNumber: string;
    totalValue: number;
    paidValue: number;
    remainingValue: number;
    nextDueDate: string;
    status: string;
  };
  invoices?: {
    id: string;
    invoiceNumber: string;
    dueDate: string;
    value: number;
    status: "paid" | "pending" | "overdue";
    paymentMethod?: string;
  }[];
  anticipationRequests?: {
    id: string;
    requestDate: string;
    quotas: number;
    requestedValue: number;
    status: "pending" | "approved" | "rejected";
    reason?: string;
  }[];
}

const ClientDashboard: React.FC<ClientDashboardProps> = ({
  clientName: propClientName,
  clientData: propClientData,
  invoices: propInvoices,
  anticipationRequests: propAnticipationRequests,
}) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [currentUser, setCurrentUser] = useState(authService.getCurrentUser());
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [clientData, setClientData] = useState(
    propClientData || {
      contractNumber: "CT-2024-001",
      totalValue: 50000,
      paidValue: 7500,
      remainingValue: 42500,
      nextDueDate: "15/02/2025",
      status: "Ativo",
    },
  );
  const [clientName, setClientName] = useState(propClientName || "Cliente");
  const [invoices, setInvoices] = useState(
    propInvoices || [
      {
        id: "1",
        invoiceNumber: "FAT-001",
        dueDate: "15/01/2025",
        value: 625,
        status: "paid" as const,
        paymentMethod: "PIX",
      },
      {
        id: "2",
        invoiceNumber: "FAT-002",
        dueDate: "15/02/2025",
        value: 625,
        status: "pending" as const,
      },
      {
        id: "3",
        invoiceNumber: "FAT-003",
        dueDate: "15/03/2025",
        value: 625,
        status: "pending" as const,
      },
    ],
  );
  const [anticipationRequests, setAnticipationRequests] = useState(
    propAnticipationRequests || [
      {
        id: "1",
        requestDate: "10/01/2025",
        quotas: 5,
        requestedValue: 3000,
        status: "approved" as const,
      },
      {
        id: "2",
        requestDate: "05/01/2025",
        quotas: 3,
        requestedValue: 1800,
        status: "pending" as const,
      },
    ],
  );
  const [activeTab, setActiveTab] = useState("overview");
  const [isAnticipationDialogOpen, setIsAnticipationDialogOpen] =
    useState(false);
  const [anticipationQuotas, setAnticipationQuotas] = useState("");
  const [anticipationReason, setAnticipationReason] = useState("");

  // Check authentication on component mount
  useEffect(() => {
    const checkAuth = async () => {
      const user = authService.getCurrentUser();
      const clientId = searchParams.get("clientId");

      // If user is logged in and is a client, or if accessed from admin/representative with clientId
      if (
        (user && user.role === "Cliente") ||
        (user &&
          (user.role === "Administrador" || user.role === "Representante") &&
          clientId)
      ) {
        setIsAuthenticated(true);

        // If accessed with clientId parameter, load client data
        if (clientId) {
          try {
            const client = await clientService.getById(parseInt(clientId));
            if (client) {
              setClientName(client.full_name || client.name || "Cliente");
              // Load additional client-specific data here if needed
            }
          } catch (error) {
            console.error("Error loading client data:", error);
          }
        } else if (user && user.role === "Cliente") {
          setClientName(user.name || "Cliente");
        }
      } else {
        setIsAuthenticated(false);
      }
    };

    checkAuth();
  }, [searchParams]);

  const handleLogout = async () => {
    console.log("🔓 Client logout clicked");
    await authService.logout();
    console.log("✅ Logout complete, navigating to home");
    navigate("/", { replace: true });
  };

  const handleLoginSuccess = () => {
    setIsAuthenticated(true);
    setCurrentUser(authService.getCurrentUser());
  };

  // Show login form if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-full max-w-md">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Acesso do Cliente
            </h1>
            <p className="text-gray-600">
              Faça login com seu CPF e senha para acessar seu painel
            </p>
          </div>
          <ClientLogin onLogin={handleLoginSuccess} />
        </div>
      </div>
    );
  }

  const handleAnticipationRequest = () => {
    const quotas = parseInt(anticipationQuotas);
    if (quotas > 0 && anticipationReason.trim()) {
      console.log(
        `Anticipation request: ${quotas} quotas, reason: ${anticipationReason}`,
      );
      setIsAnticipationDialogOpen(false);
      setAnticipationQuotas("");
      setAnticipationReason("");
      alert(
        `Solicitação de antecipação de ${quotas} cotas enviada com sucesso!`,
      );
    } else {
      alert("Por favor, preencha todos os campos corretamente");
    }
  };

  const paymentProgress = (clientData.paidValue / clientData.totalValue) * 100;
  const pendingInvoices = invoices.filter(
    (inv) => inv.status === "pending",
  ).length;
  const overdueInvoices = invoices.filter(
    (inv) => inv.status === "overdue",
  ).length;
  const paidInvoices = invoices.filter((inv) => inv.status === "paid").length;

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b bg-background p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div
              className="flex items-center cursor-pointer"
              onClick={() => navigate("/")}
            >
              <div className="h-8 w-8 rounded-md bg-red-600 mr-2"></div>
              <h1 className="text-xl font-bold text-red-600">CredCar</h1>
            </div>
            <h2 className="text-lg font-medium text-foreground">
              Painel do Cliente
            </h2>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="outline" size="sm">
              <Bell className="h-4 w-4 mr-2" />
              Notificações
            </Button>
            <div className="flex items-center gap-2">
              <Avatar>
                <AvatarFallback className="bg-green-100 text-green-600">
                  <User className="h-6 w-6" />
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-medium">{clientName}</p>
                <p className="text-xs text-muted-foreground">Cliente</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="ml-2 text-muted-foreground hover:text-foreground"
              >
                Sair
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar Navigation */}
        <aside className="hidden md:flex w-64 flex-col border-r bg-background p-4">
          <nav className="space-y-2">
            <Button
              variant={activeTab === "overview" ? "default" : "ghost"}
              className="w-full justify-start"
              onClick={() => setActiveTab("overview")}
            >
              <TrendingUp className="mr-2 h-4 w-4" />
              Resumo do Consórcio
            </Button>
            <Button
              variant={activeTab === "invoices" ? "default" : "ghost"}
              className="w-full justify-start"
              onClick={() => setActiveTab("invoices")}
            >
              <FileText className="mr-2 h-4 w-4" />
              Faturas
            </Button>
            <Button
              variant={activeTab === "anticipation" ? "default" : "ghost"}
              className="w-full justify-start"
              onClick={() => setActiveTab("anticipation")}
            >
              <DollarSign className="mr-2 h-4 w-4" />
              Antecipações
            </Button>
          </nav>
        </aside>

        {/* Main Dashboard Content */}
        <main className="flex-1 overflow-y-auto p-6">
          {activeTab === "overview" && (
            <>
              {/* Consortium Summary */}
              <div className="mb-6">
                <h2 className="text-2xl font-bold mb-4">Resumo do Consórcio</h2>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">
                        Contrato
                      </CardTitle>
                      <FileText className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-red-600">
                        {clientData.contractNumber}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Status: {clientData.status}
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">
                        Valor Total
                      </CardTitle>
                      <CreditCard className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-blue-600">
                        R$ {clientData.totalValue.toLocaleString("pt-BR")}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Valor do consórcio
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">
                        Valor Pago
                      </CardTitle>
                      <CheckCircle className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-green-600">
                        R$ {clientData.paidValue.toLocaleString("pt-BR")}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {paymentProgress.toFixed(1)}% do total
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">
                        Próximo Vencimento
                      </CardTitle>
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-orange-600">
                        {clientData.nextDueDate}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        R$ 625,00
                      </p>
                    </CardContent>
                  </Card>
                </div>

                {/* Payment Progress */}
                <Card className="mb-6">
                  <CardHeader>
                    <CardTitle>Progresso de Pagamento</CardTitle>
                    <CardDescription>
                      Acompanhe o andamento do seu consórcio
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex justify-between text-sm">
                        <span>
                          Pago: R${" "}
                          {clientData.paidValue.toLocaleString("pt-BR")}
                        </span>
                        <span>
                          Restante: R${" "}
                          {clientData.remainingValue.toLocaleString("pt-BR")}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-green-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${paymentProgress}%` }}
                        ></div>
                      </div>
                      <div className="text-center text-sm text-muted-foreground">
                        {paymentProgress.toFixed(1)}% concluído
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          )}

          {activeTab === "invoices" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">Faturas</h2>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">
                    <Filter className="mr-2 h-4 w-4" />
                    Filtrar
                  </Button>
                  <Button variant="outline" size="sm">
                    <Download className="mr-2 h-4 w-4" />
                    Exportar
                  </Button>
                </div>
              </div>

              {/* Invoice Summary Cards */}
              <div className="grid gap-4 md:grid-cols-3 mb-6">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">
                      Faturas Pagas
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600">
                      {paidInvoices}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Pagamentos em dia
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">
                      Faturas Pendentes
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-orange-600">
                      {pendingInvoices}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Aguardando pagamento
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">
                      Faturas em Atraso
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-red-600">
                      {overdueInvoices}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Vencidas
                    </p>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Lista de Faturas</CardTitle>
                  <CardDescription>
                    Todas as suas faturas do consórcio
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Número</TableHead>
                        <TableHead>Vencimento</TableHead>
                        <TableHead>Valor</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Pagamento</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {invoices.map((invoice) => (
                        <TableRow key={invoice.id}>
                          <TableCell className="font-medium">
                            {invoice.invoiceNumber}
                          </TableCell>
                          <TableCell>{invoice.dueDate}</TableCell>
                          <TableCell>
                            R$ {invoice.value.toLocaleString("pt-BR")}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={
                                invoice.status === "paid"
                                  ? "bg-green-100 text-green-800 hover:bg-green-100"
                                  : invoice.status === "pending"
                                    ? "bg-orange-100 text-orange-800 hover:bg-orange-100"
                                    : "bg-red-100 text-red-800 hover:bg-red-100"
                              }
                            >
                              {invoice.status === "paid" && "Pago"}
                              {invoice.status === "pending" && "Pendente"}
                              {invoice.status === "overdue" && "Em Atraso"}
                            </Badge>
                          </TableCell>
                          <TableCell>{invoice.paymentMethod || "-"}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex gap-2 justify-end">
                              <Button variant="ghost" size="sm">
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button variant="outline" size="sm">
                                <Download className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === "anticipation" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">Pedidos de Antecipação</h2>
                <Dialog
                  open={isAnticipationDialogOpen}
                  onOpenChange={setIsAnticipationDialogOpen}
                >
                  <DialogTrigger asChild>
                    <Button className="bg-red-600 hover:bg-red-700">
                      <DollarSign className="mr-2 h-4 w-4" />
                      Nova Antecipação
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                      <DialogTitle>Solicitar Antecipação</DialogTitle>
                      <DialogDescription>
                        Solicite a antecipação de cotas do seu consórcio
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="quotas" className="text-right">
                          Cotas
                        </Label>
                        <Input
                          id="quotas"
                          type="number"
                          value={anticipationQuotas}
                          onChange={(e) =>
                            setAnticipationQuotas(e.target.value)
                          }
                          className="col-span-3"
                          placeholder="Número de cotas"
                          min="1"
                        />
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="reason" className="text-right">
                          Motivo
                        </Label>
                        <Textarea
                          id="reason"
                          value={anticipationReason}
                          onChange={(e) =>
                            setAnticipationReason(e.target.value)
                          }
                          className="col-span-3"
                          placeholder="Descreva o motivo da antecipação"
                          rows={3}
                        />
                      </div>
                      {anticipationQuotas && (
                        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                          <p className="text-sm font-medium text-blue-800">
                            Valor estimado da antecipação:
                          </p>
                          <p className="text-lg font-bold text-blue-900">
                            R${" "}
                            {(
                              parseInt(anticipationQuotas || "0") * 600
                            ).toLocaleString("pt-BR")}
                          </p>
                          <p className="text-xs text-blue-700">
                            *Valor sujeito à análise e aprovação
                          </p>
                        </div>
                      )}
                    </div>
                    <DialogFooter>
                      <Button
                        variant="outline"
                        onClick={() => setIsAnticipationDialogOpen(false)}
                      >
                        Cancelar
                      </Button>
                      <Button onClick={handleAnticipationRequest}>
                        Solicitar Antecipação
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Histórico de Antecipações</CardTitle>
                  <CardDescription>
                    Suas solicitações de antecipação de cotas
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {anticipationRequests.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Data da Solicitação</TableHead>
                          <TableHead>Cotas</TableHead>
                          <TableHead>Valor Solicitado</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Motivo</TableHead>
                          <TableHead className="text-right">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {anticipationRequests.map((request) => (
                          <TableRow key={request.id}>
                            <TableCell>{request.requestDate}</TableCell>
                            <TableCell>{request.quotas}</TableCell>
                            <TableCell>
                              R${" "}
                              {request.requestedValue.toLocaleString("pt-BR")}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant="outline"
                                className={
                                  request.status === "approved"
                                    ? "bg-green-100 text-green-800 hover:bg-green-100"
                                    : request.status === "pending"
                                      ? "bg-orange-100 text-orange-800 hover:bg-orange-100"
                                      : "bg-red-100 text-red-800 hover:bg-red-100"
                                }
                              >
                                {request.status === "approved" && (
                                  <>
                                    <CheckCircle className="w-3 h-3 mr-1" />
                                    Aprovado
                                  </>
                                )}
                                {request.status === "pending" && (
                                  <>
                                    <Clock className="w-3 h-3 mr-1" />
                                    Pendente
                                  </>
                                )}
                                {request.status === "rejected" && (
                                  <>
                                    <XCircle className="w-3 h-3 mr-1" />
                                    Rejeitado
                                  </>
                                )}
                              </Badge>
                            </TableCell>
                            <TableCell>{request.reason || "-"}</TableCell>
                            <TableCell className="text-right">
                              <Button variant="ghost" size="sm">
                                <Eye className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="text-center py-8">
                      <DollarSign className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                      <p className="text-lg font-medium mb-2">
                        Nenhuma antecipação encontrada
                      </p>
                      <p className="text-muted-foreground mb-4">
                        Você ainda não fez nenhuma solicitação de antecipação.
                      </p>
                      <Button
                        variant="outline"
                        onClick={() => setIsAnticipationDialogOpen(true)}
                      >
                        <DollarSign className="mr-2 h-4 w-4" />
                        Fazer Primeira Solicitação
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default ClientDashboard;
