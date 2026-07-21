import React, { useEffect, useState, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { authService, clientService, contractService, invoiceService, anticipationService } from "@/lib/supabase";
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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
  Settings,
  Lock,
  EyeOff,
  Loader2,
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
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import InvoiceView from "@/components/sales/InvoiceView";
import { ensureInvoiceInAsaas, getEnsureAsaasErrorMessage } from "@/lib/invoice-asaas.client";

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
      contractNumber: "N/A",
      totalValue: 0,
      paidValue: 0,
      remainingValue: 0,
      nextDueDate: "N/A",
      status: "Carregando...",
    },
  );
  const [clientName, setClientName] = useState(propClientName || "Cliente");
  const [clientCpfCnpj, setClientCpfCnpj] = useState<string>("");
  const [clientDataFull, setClientDataFull] = useState<any>(null);
  const [invoices, setInvoices] = useState(propInvoices || []);
  const [anticipationRequests, setAnticipationRequests] = useState<any[]>([]);
  const [selectedAnticipation, setSelectedAnticipation] = useState<any>(null);
  const [isAnticipationModalOpen, setIsAnticipationModalOpen] = useState(false);
  const [anticipationCalculation, setAnticipationCalculation] = useState<{
    available: number;
    requested: number;
    canProceed: boolean;
    originalAmount: number;
    discountPercentage: number;
    discountAmount: number;
    finalAmount: number;
  } | null>(null);
  const [isCalculatingAnticipation, setIsCalculatingAnticipation] = useState(false);
  const [isCreatingAnticipation, setIsCreatingAnticipation] = useState(false);
  const [anticipationError, setAnticipationError] = useState<string | null>(null);
  const [anticipationSuccess, setAnticipationSuccess] = useState<string | null>(null);
  const [selectedContractId, setSelectedContractId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [isAnticipationDialogOpen, setIsAnticipationDialogOpen] =
    useState(false);
  const [anticipationQuotas, setAnticipationQuotas] = useState("");
  const [anticipationReason, setAnticipationReason] = useState("");
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [dataError, setDataError] = useState<string | null>(null);
  
  // Estados para alteração de senha
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  
  // Estados para visualização de fatura
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [ensuringAsaas, setEnsuringAsaas] = useState(false);
  const [ensureAsaasError, setEnsureAsaasError] = useState<string | null>(null);
  const [invoiceFilter, setInvoiceFilter] = useState<"all" | "paid" | "pending" | "overdue">("all");
  const [allInvoices, setAllInvoices] = useState<any[]>([]); // Todas as faturas (antes do filtro)

  // Memoizar clientId para evitar re-renderizações desnecessárias
  const clientIdParam = useMemo(() => searchParams.get("clientId"), [searchParams]);

  // Check authentication on component mount
  useEffect(() => {
    const checkAuth = async () => {
      const user = authService.getCurrentUser();
      const clientId = clientIdParam;

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
  }, [clientIdParam]);

  // Função para aplicar filtro de faturas
  const applyInvoiceFilter = React.useCallback((invoicesList: any[], filter: "all" | "paid" | "pending" | "overdue") => {
    if (filter === "all") {
      setInvoices(invoicesList);
    } else {
      const filtered = invoicesList.filter((inv) => inv.status === filter);
      setInvoices(filtered);
    }
  }, []);

  // Handler para mudança de filtro
  const handleFilterChange = (filter: "all" | "paid" | "pending" | "overdue") => {
    setInvoiceFilter(filter);
    applyInvoiceFilter(allInvoices, filter);
  };

  // Handler para visualizar fatura
  const handleViewInvoice = async (invoiceId: string) => {
    try {
      setEnsureAsaasError(null);
      const invoice = await invoiceService.getById(invoiceId);
      if (invoice) {
        // Formatar dados da fatura para exibição
        const contractNumber =
          invoice.contracts?.contract_number ??
          invoice.contract_number ??
          (invoice.contract_id != null ? String(invoice.contract_id) : "N/A");
        const formattedInvoice = {
          id: invoice.id.toString(),
          invoiceNumber: invoice.invoice_code || `FAT-${invoice.id}`,
          contractNumber,
          contract_id: invoice.contract_id,
          dueDate: invoice.due_date ? new Date(invoice.due_date).toLocaleDateString("pt-BR") : "N/A",
          value: parseFloat(invoice.value || invoice.amount || "0"),
          status: invoice.status === "Pago" || invoice.status === "paid" 
            ? "paid" 
            : new Date(invoice.due_date) < new Date() && invoice.status !== "Pago" && invoice.status !== "paid"
              ? "overdue"
              : "pending",
          paymentDate: invoice.paid_at ? new Date(invoice.paid_at).toLocaleDateString("pt-BR") : undefined,
          paymentMethod: invoice.payment_method,
          paymentLinkPix: invoice.payment_link_pix,
          paymentLinkBoleto: invoice.payment_link_boleto,
          installmentNumber: invoice.installment_number,
          contracts: invoice.contracts,
          invoice_code: invoice.invoice_code,
          due_date: invoice.due_date,
          amount: invoice.amount,
          invoiceData: invoice,
        };
        setSelectedInvoice(formattedInvoice);
        setIsInvoiceModalOpen(true);
      }
    } catch (error) {
      console.error("Error loading invoice details:", error);
      setEnsureAsaasError(null);
      // Se não conseguir buscar detalhes, usar dados da lista
      const invoiceFromList = allInvoices.find((inv) => inv.id === invoiceId);
      if (invoiceFromList) {
        setSelectedInvoice(invoiceFromList);
        setIsInvoiceModalOpen(true);
      }
    }
  };

  // Garantir fatura no ASAAS e sincronizar status ao abrir modal (quando não está paga)
  useEffect(() => {
    if (!isInvoiceModalOpen || !selectedInvoice?.id) return;
    const inv = selectedInvoice;
    const isPaid = inv.status === "paid";
    if (isPaid) return;

    let cancelled = false;
    setEnsureAsaasError(null);
    setEnsuringAsaas(true);
    ensureInvoiceInAsaas(String(inv.id))
      .then((r) => {
        if (cancelled) return;
        if (r.success && r.invoice) {
          setSelectedInvoice((prev: any) => ({
            ...prev,
            paymentLinkPix: r.invoice.payment_link_pix ?? prev?.paymentLinkPix,
            paymentLinkBoleto: r.invoice.payment_link_boleto ?? prev?.paymentLinkBoleto,
            invoiceData: { ...prev?.invoiceData, ...r.invoice },
          }));
        } else {
          setEnsureAsaasError(getEnsureAsaasErrorMessage(r.code, r.error));
        }
      })
      .finally(() => {
        if (!cancelled) setEnsuringAsaas(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isInvoiceModalOpen, selectedInvoice?.id]);

  // Load client data from database when authenticated
  useEffect(() => {
    const loadClientData = async () => {
      if (!isAuthenticated) return;

      const user = authService.getCurrentUser();
      if (!user) return;

      setIsLoadingData(true);
      setDataError(null);

      try {
        // Determinar ID do cliente
        let clientId: number;
        
        if (clientIdParam) {
          // Se veio de admin/representante com clientId
          clientId = parseInt(clientIdParam);
        } else if (user.role === "Cliente") {
          // Se é o próprio cliente logado
          clientId = parseInt(user.id);
        } else {
          console.error("Cannot determine client ID");
          setIsLoadingData(false);
          return;
        }

        // Buscar dados completos do cliente
        const client = await clientService.getById(clientId);
        if (client) {
          setClientName(client.full_name || client.name || "Cliente");
          setClientCpfCnpj(client.cpf_cnpj || "");
          setClientDataFull(client); // Armazenar dados completos para o perfil
        }

        // Buscar contratos do cliente
        const contracts = await contractService.getByClientId(clientId);

        if (contracts && contracts.length > 0) {
          // Usar o primeiro contrato ativo ou o mais recente
          const activeContract = 
            contracts.find((c: any) => c.status === "Ativo") || 
            contracts[0];
          
          // Definir contrato ativo para antecipações
          setSelectedContractId(activeContract.id);

          // Calcular valores do contrato
          const totalValue = parseFloat(
            activeContract.total_value || 
            activeContract.credit_amount || 
            "0"
          );

          // Buscar todas as faturas do cliente usando invoiceService
          const allClientInvoices = await invoiceService.getByClientId(clientId);
          
          // Processar faturas do contrato ativo também (para compatibilidade)
          const contractInvoices = activeContract.invoices || [];
          
          // Combinar faturas (priorizar as do invoiceService que são mais completas)
          const invoicesToProcess = allClientInvoices.length > 0 ? allClientInvoices : contractInvoices;
          
          // Calcular valores pagos
          const paidInvoices = invoicesToProcess.filter(
            (inv: any) => inv.status === "Pago" || inv.status === "paid"
          );
          const paidValue = paidInvoices.reduce(
            (sum: number, inv: any) => sum + parseFloat(inv.value || inv.amount || "0"),
            0
          );
          const remainingValue = totalValue - paidValue;

          // Encontrar próxima fatura pendente
          const pendingInvoices = invoicesToProcess.filter(
            (inv: any) => inv.status === "Pendente" || inv.status === "pending"
          );
          const nextInvoice = pendingInvoices.sort(
            (a: any, b: any) => 
              new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
          )[0];

          // Atualizar dados do cliente
          setClientData({
            contractNumber:
              activeContract.contract_number ||
              activeContract.contract_code ||
              `CONT-${activeContract.id}`,
            totalValue,
            paidValue,
            remainingValue,
            nextDueDate: nextInvoice 
              ? new Date(nextInvoice.due_date).toLocaleDateString("pt-BR")
              : "N/A",
            status: activeContract.status || "Ativo",
          });

          // Formatar faturas para exibição (manter dados completos para visualização)
          const formattedInvoices = invoicesToProcess.map((inv: any) => {
            const dueDate = new Date(inv.due_date);
            const isOverdue = dueDate < new Date() && 
              inv.status !== "Pago" && inv.status !== "paid";
            
            return {
              id: inv.id.toString(),
              invoiceNumber: inv.invoice_code || `FAT-${inv.id}`,
              dueDate: dueDate.toLocaleDateString("pt-BR"),
              dueDateRaw: inv.due_date, // Para ordenação
              value: parseFloat(inv.value || inv.amount || "0"),
              status: inv.status === "Pago" || inv.status === "paid" 
                ? "paid" as const
                : isOverdue 
                  ? "overdue" as const
                  : "pending" as const,
              paymentMethod: inv.payment_method || undefined,
              paymentDate: inv.paid_at ? new Date(inv.paid_at).toLocaleDateString("pt-BR") : undefined,
              paymentLinkPix: inv.payment_link_pix,
              paymentLinkBoleto: inv.payment_link_boleto,
              installmentNumber: inv.installment_number,
              contractId: inv.contract_id || inv.contracts?.id,
              contractNumber: inv.contracts?.contract_number || activeContract.contract_number,
              // Manter dados completos da fatura original
              invoiceData: inv,
            };
          });

          // Ordenar por data de vencimento
          formattedInvoices.sort((a: any, b: any) => 
            new Date(a.dueDateRaw).getTime() - new Date(b.dueDateRaw).getTime()
          );

          setAllInvoices(formattedInvoices);
          // Aplicar filtro inicial
          if (invoiceFilter === "all") {
            setInvoices(formattedInvoices);
          } else {
            const filtered = formattedInvoices.filter((inv) => inv.status === invoiceFilter);
            setInvoices(filtered);
          }
        } else {
          // Cliente sem contratos - usar dados padrão vazios
          setClientData({
            contractNumber: "N/A",
            totalValue: 0,
            paidValue: 0,
            remainingValue: 0,
            nextDueDate: "N/A",
            status: "Sem Contratos",
          });
          setInvoices([]);
          setAllInvoices([]);
          setSelectedContractId(null);
          setAnticipationRequests([]);
        }

        // Buscar antecipações do cliente
        try {
          const anticipations = await anticipationService.getByClientId(clientId);
          const formattedAnticipations = anticipations.map((ant: any) => ({
            id: ant.id,
            requestDate: new Date(ant.created_at).toLocaleDateString("pt-BR"),
            quotas: ant.installments_count,
            requestedValue: parseFloat(ant.original_amount || "0"),
            finalValue: parseFloat(ant.final_amount || "0"),
            discountAmount: parseFloat(ant.discount_amount || "0"),
            discountPercentage: parseFloat(ant.discount_percentage || "0"),
            status: ant.status === "approved" ? "approved" as const :
                    ant.status === "paid" ? "approved" as const :
                    ant.status === "cancelled" ? "rejected" as const :
                    "pending" as const,
            reason: ant.notes || "",
            contractNumber: ant.contracts?.contract_number || "N/A",
            anticipationNumber: ant.anticipation_number || `ANT-${ant.id}`,
            anticipationData: ant,
          }));
          setAnticipationRequests(formattedAnticipations);
        } catch (error: any) {
          console.error("Error loading anticipations:", error);
          // Não mostrar erro para o usuário se não houver antecipações, apenas log
          // Se for erro de rede ou outro erro crítico, pode ser tratado aqui
          setAnticipationRequests([]);
        }

      } catch (error: any) {
        console.error("Error loading client data:", error);
        
        // Mensagens de erro mais específicas
        let errorMessage = "Erro ao carregar dados. Tente novamente.";
        
        if (error?.message?.includes("network") || error?.message?.includes("fetch")) {
          errorMessage = "Erro de conexão. Verifique sua internet e tente novamente.";
        } else if (error?.message?.includes("permission") || error?.code === "PGRST301") {
          errorMessage = "Você não tem permissão para acessar estes dados.";
        } else if (error?.message?.includes("not found") || error?.code === "PGRST116") {
          errorMessage = "Dados não encontrados. Entre em contato com o suporte.";
        }
        
        setDataError(errorMessage);
        
        // Limpar dados em caso de erro
        setClientData({
          contractNumber: "N/A",
          totalValue: 0,
          paidValue: 0,
          remainingValue: 0,
          nextDueDate: "N/A",
          status: "Erro",
        });
        setInvoices([]);
        setAllInvoices([]);
        setAnticipationRequests([]);
      } finally {
        setIsLoadingData(false);
      }
    };

    loadClientData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  // Função para formatar CPF/CNPJ
  const formatCpfCnpj = (cpfCnpj: string): string => {
    if (!cpfCnpj) return "";
    const cleaned = cpfCnpj.replace(/\D/g, "");
    if (cleaned.length === 11) {
      // CPF: 000.000.000-00
      return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
    } else if (cleaned.length === 14) {
      // CNPJ: 00.000.000/0000-00
      return cleaned.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
    }
    return cpfCnpj; // Retorna sem formatação se não for CPF nem CNPJ
  };

  const handleLogout = async () => {
    console.log("🔓 Client logout clicked");
    
    // Limpar estados primeiro
    setIsAuthenticated(false);
    setCurrentUser(null);
    setClientName("Cliente");
    setClientCpfCnpj("");
    setClientDataFull(null);
    
    // Limpar localStorage completamente
    localStorage.removeItem("currentUser");
    
    // Fazer logout do authService
    authService.logout();
    
    console.log("✅ Logout complete, navigating to /cliente");
    
    // Forçar navegação imediatamente
    navigate("/cliente", { replace: true });
  };

  const handleLoginSuccess = () => {
    setIsAuthenticated(true);
    setCurrentUser(authService.getCurrentUser());
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);

    // Validações
    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError("Por favor, preencha todos os campos.");
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError("A nova senha deve ter pelo menos 6 caracteres.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("As senhas não coincidem.");
      return;
    }

    if (currentPassword === newPassword) {
      setPasswordError("A nova senha deve ser diferente da senha atual.");
      return;
    }

    setIsChangingPassword(true);

    try {
      const user = authService.getCurrentUser();
      if (!user || user.role !== "Cliente") {
        setPasswordError("Erro ao identificar usuário.");
        return;
      }

      const clientId = parseInt(user.id);

      // Verificar senha atual
      const client = await clientService.getById(clientId);
      if (!client) {
        setPasswordError("Cliente não encontrado.");
        return;
      }

      // Verificar se a senha atual está correta
      const { verifyPassword } = await import("@/lib/password-utils");
      
      if (client.password_hash) {
        const isValid = await verifyPassword(currentPassword, client.password_hash);
        if (!isValid) {
          setPasswordError("Senha atual incorreta.");
          setIsChangingPassword(false);
          return;
        }
      } else {
        // Compatibilidade com sistema antigo
        const expectedPassword = `cliente${client.id}`;
        if (currentPassword !== expectedPassword && currentPassword !== "123456") {
          setPasswordError("Senha atual incorreta.");
          setIsChangingPassword(false);
          return;
        }
      }

      // Atualizar senha
      await clientService.updatePassword(clientId, newPassword);

      setPasswordSuccess("Senha alterada com sucesso!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");

      // Limpar mensagem de sucesso após 5 segundos
      setTimeout(() => {
        setPasswordSuccess(null);
      }, 5000);
    } catch (error) {
      console.error("Error changing password:", error);
      setPasswordError("Erro ao alterar senha. Tente novamente.");
    } finally {
      setIsChangingPassword(false);
    }
  };

  // Calcular valores de antecipação quando número de cotas mudar
  useEffect(() => {
    // Só calcular se tiver contrato selecionado e cotas informadas
    if (!selectedContractId || !anticipationQuotas) {
      setAnticipationCalculation(null);
      return;
    }

    const quotas = parseInt(anticipationQuotas);
    if (quotas <= 0) {
      setAnticipationCalculation(null);
      return;
    }

    const calculateAnticipation = async () => {
      setIsCalculatingAnticipation(true);
      setAnticipationError(null);
      
      try {
        const calculation = await anticipationService.calculateAnticipationValue(
          selectedContractId,
          quotas
        );
        setAnticipationCalculation(calculation);
      } catch (error: any) {
        console.error("Error calculating anticipation:", error);
        setAnticipationError(error.message || "Erro ao calcular valores de antecipação");
        setAnticipationCalculation(null);
      } finally {
        setIsCalculatingAnticipation(false);
      }
    };

    // Debounce para não calcular a cada tecla digitada
    const timeoutId = setTimeout(calculateAnticipation, 500);
    return () => clearTimeout(timeoutId);
  }, [anticipationQuotas, selectedContractId]);

  const handleAnticipationRequest = async () => {
    if (!selectedContractId) {
      alert("Nenhum contrato encontrado. Por favor, entre em contato com o suporte.");
      return;
    }

    const quotas = parseInt(anticipationQuotas);
    if (quotas <= 0 || !anticipationReason.trim()) {
      setAnticipationError("Por favor, preencha todos os campos corretamente");
      return;
    }

    if (!anticipationCalculation || !anticipationCalculation.canProceed) {
      setAnticipationError(
        `Não há parcelas suficientes disponíveis. Disponível: ${anticipationCalculation?.available || 0}, Solicitado: ${quotas}`
      );
      return;
    }

    setIsCreatingAnticipation(true);
    setAnticipationError(null);
    setAnticipationSuccess(null);

    try {
      const anticipation = await anticipationService.createRequest(
        selectedContractId,
        {
          installmentsCount: quotas,
          reason: anticipationReason,
        }
      );

      if (anticipation) {
        setAnticipationSuccess(
          `Solicitação de antecipação de ${quotas} cotas enviada com sucesso!`
      );
      setIsAnticipationDialogOpen(false);
      setAnticipationQuotas("");
      setAnticipationReason("");
        setAnticipationCalculation(null);

        // Recarregar antecipações
        const user = authService.getCurrentUser();
        if (user) {
          const clientId = clientIdParam 
            ? parseInt(clientIdParam) 
            : parseInt(user.id);
          const anticipations = await anticipationService.getByClientId(clientId);
          const formattedAnticipations = anticipations.map((ant: any) => ({
            id: ant.id,
            requestDate: new Date(ant.created_at).toLocaleDateString("pt-BR"),
            quotas: ant.installments_count,
            requestedValue: parseFloat(ant.original_amount || "0"),
            finalValue: parseFloat(ant.final_amount || "0"),
            discountAmount: parseFloat(ant.discount_amount || "0"),
            discountPercentage: parseFloat(ant.discount_percentage || "0"),
            status: ant.status === "approved" ? "approved" as const :
                    ant.status === "paid" ? "approved" as const :
                    ant.status === "cancelled" ? "rejected" as const :
                    "pending" as const,
            reason: ant.notes || "",
            contractNumber: ant.contracts?.contract_number || "N/A",
            anticipationNumber: ant.anticipation_number || `ANT-${ant.id}`,
            anticipationData: ant,
          }));
          setAnticipationRequests(formattedAnticipations);
        }
      }
    } catch (error: any) {
      console.error("Error creating anticipation request:", error);
      setAnticipationError(
        error.message || "Erro ao criar solicitação de antecipação. Tente novamente."
      );
    } finally {
      setIsCreatingAnticipation(false);
    }
  };

  // Handler para visualizar antecipação
  const handleViewAnticipation = async (anticipationId: string) => {
    try {
      const anticipation = await anticipationService.getById(anticipationId);
      if (anticipation) {
        const formattedAnticipation = {
          id: anticipation.id,
          requestDate: new Date(anticipation.created_at).toLocaleDateString("pt-BR"),
          quotas: anticipation.installments_count,
          requestedValue: parseFloat(anticipation.original_amount || "0"),
          finalValue: parseFloat(anticipation.final_amount || "0"),
          discountAmount: parseFloat(anticipation.discount_amount || "0"),
          discountPercentage: parseFloat(anticipation.discount_percentage || "0"),
          status: anticipation.status === "approved" ? "approved" as const :
                  anticipation.status === "paid" ? "approved" as const :
                  anticipation.status === "cancelled" ? "rejected" as const :
                  "pending" as const,
          reason: anticipation.notes || "",
          contractNumber: anticipation.contracts?.contract_number || "N/A",
          anticipationNumber: anticipation.anticipation_number || `ANT-${anticipation.id}`,
          paymentDate: anticipation.payment_date ? new Date(anticipation.payment_date).toLocaleDateString("pt-BR") : undefined,
          paymentMethod: anticipation.payment_method,
          anticipationData: anticipation,
        };
        setSelectedAnticipation(formattedAnticipation);
        setIsAnticipationModalOpen(true);
    }
    } catch (error) {
      console.error("Error loading anticipation details:", error);
      // Se não conseguir buscar detalhes, usar dados da lista
      const anticipationFromList = anticipationRequests.find((ant) => ant.id === anticipationId);
      if (anticipationFromList) {
        setSelectedAnticipation(anticipationFromList);
        setIsAnticipationModalOpen(true);
      }
    }
  };

  const paymentProgress = clientData.totalValue > 0 
    ? (clientData.paidValue / clientData.totalValue) * 100 
    : 0;
  const pendingInvoices = invoices.filter(
    (inv) => inv.status === "pending",
  ).length;
  const overdueInvoices = invoices.filter(
    (inv) => inv.status === "overdue",
  ).length;
  const paidInvoices = invoices.filter((inv) => inv.status === "paid").length;

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
                <p className="text-xs text-muted-foreground">
                  {clientCpfCnpj ? formatCpfCnpj(clientCpfCnpj) : "Cliente"}
                </p>
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
              Resumo
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
            <Button
              variant={activeTab === "profile" ? "default" : "ghost"}
              className="w-full justify-start"
              onClick={() => setActiveTab("profile")}
            >
              <Settings className="mr-2 h-4 w-4" />
              Meu Perfil
            </Button>
          </nav>
        </aside>

        {/* Main Dashboard Content */}
        <main className="flex-1 overflow-y-auto p-6">
          {isLoadingData ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto mb-4"></div>
                <p className="text-muted-foreground">Carregando dados...</p>
              </div>
            </div>
          ) : dataError ? (
            <Alert className="mb-4 bg-red-50 border-red-200">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">
                {dataError}
                <Button
                  variant="outline"
                  size="sm"
                  className="ml-4 mt-2"
                  onClick={() => {
                    setDataError(null);
                    setIsLoadingData(true);
                    // Recarregar dados
                    const loadClientData = async () => {
                      const user = authService.getCurrentUser();
                      if (user) {
                        const clientId = clientIdParam ? parseInt(clientIdParam) : parseInt(user.id);
                        try {
                          const contracts = await contractService.getByClientId(clientId);
                          const invoices = await invoiceService.getByClientId(clientId);
                          const anticipations = await anticipationService.getByClientId(clientId);
                          // Processar dados (código simplificado para recarregar)
                          window.location.reload(); // Recarregar página completa
                        } catch (error) {
                          console.error("Error reloading:", error);
                          setIsLoadingData(false);
                        }
                      }
                    };
                    loadClientData();
                  }}
                >
                  Tentar Novamente
                </Button>
              </AlertDescription>
            </Alert>
          ) : (
            <>
          {activeTab === "overview" && (
            <>
              {/* Consortium Summary */}
              <div className="mb-6">
                <h2 className="text-2xl font-bold mb-4">Resumo</h2>
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
                        Valor total
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
                      Acompanhe o andamento do seu crédito
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
                  <Select value={invoiceFilter} onValueChange={(value: any) => handleFilterChange(value)}>
                    <SelectTrigger className="w-[180px]">
                    <Filter className="mr-2 h-4 w-4" />
                      <SelectValue placeholder="Filtrar faturas" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas</SelectItem>
                      <SelectItem value="paid">Pagas</SelectItem>
                      <SelectItem value="pending">Pendentes</SelectItem>
                      <SelectItem value="overdue">Vencidas</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      // Exportar todas as faturas filtradas
                      const csvContent = [
                        ['Número', 'Vencimento', 'Valor', 'Status', 'Método de Pagamento'].join(','),
                        ...invoices.map(inv => [
                          inv.invoiceNumber,
                          inv.dueDate,
                          inv.value.toFixed(2),
                          inv.status === 'paid' ? 'PAGO' : inv.status === 'overdue' ? 'VENCIDO' : 'PENDENTE',
                          inv.paymentMethod || '-'
                        ].join(','))
                      ].join('\n');
                      
                      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `Faturas-${new Date().toISOString().split('T')[0]}.csv`;
                      document.body.appendChild(a);
                      a.click();
                      document.body.removeChild(a);
                      URL.revokeObjectURL(url);
                    }}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Exportar CSV
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
                    Todas as suas faturas
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
                      {invoices.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8">
                            <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                            <p className="text-lg font-medium text-muted-foreground mb-2">
                              Nenhuma fatura encontrada
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {invoiceFilter === "all" 
                                ? "Você ainda não possui faturas cadastradas."
                                : `Nenhuma fatura ${invoiceFilter === "paid" ? "paga" : invoiceFilter === "pending" ? "pendente" : "vencida"} encontrada.`}
                            </p>
                          </TableCell>
                        </TableRow>
                      ) : (
                        invoices.map((invoice) => (
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
                                  ? "bg-green-500 text-white hover:bg-green-600 border-green-500"
                                  : invoice.status === "overdue"
                                    ? "bg-red-500 text-white hover:bg-red-600 border-red-500"
                                    : "bg-yellow-500 text-white hover:bg-yellow-600 border-yellow-500"
                              }
                            >
                              {invoice.status === "paid" && "PAGO"}
                              {invoice.status === "pending" && "PENDENTE"}
                              {invoice.status === "overdue" && "VENCIDO"}
                            </Badge>
                          </TableCell>
                          <TableCell>{invoice.paymentMethod || "-"}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex gap-2 justify-end">
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={() => handleViewInvoice(invoice.id)}
                                  title="Visualizar fatura"
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                        ))
                      )}
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
                        Solicite a antecipação de cotas
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
                      {anticipationCalculation && anticipationCalculation.canProceed && (
                        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg space-y-2">
                          <p className="text-sm font-medium text-blue-800">
                            Resumo da Antecipação:
                          </p>
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <div>
                              <span className="text-blue-700">Valor Original:</span>
                              <p className="font-bold text-blue-900">
                                R$ {anticipationCalculation.originalAmount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                              </p>
                            </div>
                            {anticipationCalculation.discountPercentage > 0 && (
                              <>
                                <div>
                                  <span className="text-blue-700">Desconto ({anticipationCalculation.discountPercentage}%):</span>
                                  <p className="font-bold text-green-600">
                                    - R$ {anticipationCalculation.discountAmount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                                  </p>
                                </div>
                                <div className="col-span-2 border-t pt-2">
                                  <span className="text-blue-700">Valor Final:</span>
                          <p className="text-lg font-bold text-blue-900">
                                    R$ {anticipationCalculation.finalAmount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                                  </p>
                                </div>
                              </>
                            )}
                            {anticipationCalculation.discountPercentage === 0 && (
                              <div className="col-span-2 border-t pt-2">
                                <span className="text-blue-700">Valor Final:</span>
                                <p className="text-lg font-bold text-blue-900">
                                  R$ {anticipationCalculation.finalAmount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                          </p>
                              </div>
                            )}
                          </div>
                          <p className="text-xs text-blue-700 mt-2">
                            *Valor sujeito à análise e aprovação
                          </p>
                        </div>
                      )}
                      {anticipationCalculation && !anticipationCalculation.canProceed && (
                        <Alert className="bg-red-50 border-red-200">
                          <AlertCircle className="h-4 w-4 text-red-600" />
                          <AlertDescription className="text-red-800">
                            Não há parcelas suficientes disponíveis. Disponível: {anticipationCalculation.available}, Solicitado: {anticipationCalculation.requested}
                          </AlertDescription>
                        </Alert>
                      )}
                      {isCalculatingAnticipation && (
                        <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                          <p className="text-sm text-gray-600">Calculando valores...</p>
                        </div>
                      )}
                      {anticipationError && (
                        <Alert className="bg-red-50 border-red-200">
                          <AlertCircle className="h-4 w-4 text-red-600" />
                          <AlertDescription className="text-red-800">{anticipationError}</AlertDescription>
                        </Alert>
                      )}
                      {anticipationSuccess && (
                        <Alert className="bg-green-50 border-green-200">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          <AlertDescription className="text-green-800">{anticipationSuccess}</AlertDescription>
                        </Alert>
                      )}
                    </div>
                    <DialogFooter>
                      <Button
                        variant="outline"
                        onClick={() => setIsAnticipationDialogOpen(false)}
                      >
                        Cancelar
                      </Button>
                      <Button 
                        onClick={handleAnticipationRequest}
                        disabled={isCreatingAnticipation || !anticipationCalculation?.canProceed}
                      >
                        {isCreatingAnticipation ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                            Enviando...
                          </>
                        ) : (
                          "Solicitar Antecipação"
                        )}
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
                              {(request.finalValue || request.requestedValue).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                              {request.discountPercentage > 0 && (
                                <span className="text-xs text-green-600 ml-2">
                                  (desconto: {request.discountPercentage}%)
                                </span>
                              )}
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
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => handleViewAnticipation(request.id)}
                                title="Visualizar detalhes"
                              >
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

          {activeTab === "profile" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold mb-4">Meu Perfil</h2>
                <p className="text-muted-foreground">
                  Gerencie suas informações pessoais e altere sua senha
                </p>
              </div>

              {/* Informações do Cliente */}
              <Card>
                <CardHeader>
                  <CardTitle>Informações Pessoais</CardTitle>
                  <CardDescription>
                    Seus dados cadastrais no sistema
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">
                        Nome Completo
                      </Label>
                      <p className="text-sm font-medium mt-1">
                        {clientDataFull?.full_name || clientDataFull?.name || clientName || "N/A"}
                      </p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">
                        CPF/CNPJ
                      </Label>
                      <p className="text-sm font-medium mt-1">
                        {clientDataFull?.cpf_cnpj ? formatCpfCnpj(clientDataFull.cpf_cnpj) : clientCpfCnpj ? formatCpfCnpj(clientCpfCnpj) : "N/A"}
                      </p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">
                        E-mail
                      </Label>
                      <p className="text-sm font-medium mt-1">
                        {clientDataFull?.email || "N/A"}
                      </p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">
                        Telefone
                      </Label>
                      <p className="text-sm font-medium mt-1">
                        {clientDataFull?.phone || "N/A"}
                      </p>
                    </div>
                    {(clientDataFull?.address_street || clientDataFull?.address) && (
                      <div className="md:col-span-2">
                        <Label className="text-sm font-medium text-muted-foreground">
                          Endereço
                        </Label>
                        <p className="text-sm font-medium mt-1">
                          {clientDataFull?.address_street 
                            ? `${clientDataFull.address_street}${clientDataFull.address_number ? `, ${clientDataFull.address_number}` : ""}${clientDataFull.address_complement ? ` - ${clientDataFull.address_complement}` : ""}${clientDataFull.address_neighborhood ? `, ${clientDataFull.address_neighborhood}` : ""}${clientDataFull.address_city ? ` - ${clientDataFull.address_city}` : ""}${clientDataFull.address_state ? `/${clientDataFull.address_state}` : ""}${clientDataFull.address_zip ? ` - CEP: ${clientDataFull.address_zip}` : ""}`
                            : clientDataFull?.address || "N/A"}
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Alteração de Senha */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Lock className="h-5 w-5" />
                    Alterar Senha
                  </CardTitle>
                  <CardDescription>
                    Altere sua senha de acesso ao painel
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleChangePassword} className="space-y-4">
                    {passwordError && (
                      <Alert variant="destructive" className="border-red-200 bg-red-50">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription className="text-red-800">
                          {passwordError}
                        </AlertDescription>
                      </Alert>
                    )}

                    {passwordSuccess && (
                      <Alert className="border-green-200 bg-green-50">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <AlertDescription className="text-green-800">
                          {passwordSuccess}
                        </AlertDescription>
                      </Alert>
                    )}

                    <div className="space-y-2">
                      <Label htmlFor="currentPassword">Senha Atual</Label>
                      <div className="relative">
                        <Input
                          id="currentPassword"
                          type={showCurrentPassword ? "text" : "password"}
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          className="pr-10"
                          placeholder="Digite sua senha atual"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          {showCurrentPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="newPassword">Nova Senha</Label>
                      <div className="relative">
                        <Input
                          id="newPassword"
                          type={showNewPassword ? "text" : "password"}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          className="pr-10"
                          placeholder="Digite a nova senha (mínimo 6 caracteres)"
                          required
                          minLength={6}
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          {showNewPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        A senha deve ter pelo menos 6 caracteres
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword">Confirmar Nova Senha</Label>
                      <div className="relative">
                        <Input
                          id="confirmPassword"
                          type={showConfirmPassword ? "text" : "password"}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          className="pr-10"
                          placeholder="Confirme a nova senha"
                          required
                          minLength={6}
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          {showConfirmPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </div>

                    <div className="flex gap-2 pt-2">
                      <Button
                        type="submit"
                        disabled={isChangingPassword}
                        className="bg-red-600 hover:bg-red-700"
                      >
                        {isChangingPassword ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                            Alterando...
                          </>
                        ) : (
                          <>
                            <Lock className="mr-2 h-4 w-4" />
                            Alterar Senha
                          </>
                        )}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setCurrentPassword("");
                          setNewPassword("");
                          setConfirmPassword("");
                          setPasswordError(null);
                          setPasswordSuccess(null);
                        }}
                        disabled={isChangingPassword}
                      >
                        Limpar
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </div>
          )}
            </>
          )}
        </main>
      </div>

      {/* Modal de Visualização de Fatura */}
      <Dialog open={isInvoiceModalOpen} onOpenChange={setIsInvoiceModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes da Fatura</DialogTitle>
            <DialogDescription>
              Informações completas da fatura selecionada
            </DialogDescription>
          </DialogHeader>
          {selectedInvoice && (
            <div className="space-y-3">
              {ensuringAsaas && (
                <div className="flex items-center gap-2 rounded-md border border-muted bg-muted/50 p-4 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                  <span>Preparando pagamento…</span>
                </div>
              )}
              {!ensuringAsaas && ensureAsaasError && (
                <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
                  {ensureAsaasError}
                  <p className="mt-2 text-muted-foreground">
                    Você ainda pode usar o link de pagamento enviado por e-mail, se houver.
                  </p>
                </div>
              )}
              <InvoiceView
                invoice={selectedInvoice}
                showCompanyHeader={true}
                hidePrintButton={false}
                compact
                showPublicLink
              />
            </div>
          )}
          <DialogFooter className="print:hidden">
            <Button variant="outline" onClick={() => setIsInvoiceModalOpen(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Visualização de Antecipação */}
      <Dialog open={isAnticipationModalOpen} onOpenChange={setIsAnticipationModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalhes da Antecipação</DialogTitle>
            <DialogDescription>
              Informações completas da solicitação de antecipação
            </DialogDescription>
          </DialogHeader>
          
          {selectedAnticipation && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Número da Antecipação</Label>
                  <p className="text-sm font-medium">{selectedAnticipation.anticipationNumber}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Contrato</Label>
                  <p className="text-sm font-medium">{selectedAnticipation.contractNumber}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Data da Solicitação</Label>
                  <p className="text-sm font-medium">{selectedAnticipation.requestDate}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Número de Cotas</Label>
                  <p className="text-sm font-medium">{selectedAnticipation.quotas}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Valor Original</Label>
                  <p className="text-sm font-medium text-lg">
                    R$ {selectedAnticipation.requestedValue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </p>
                </div>
                {selectedAnticipation.discountPercentage > 0 && (
                  <>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Desconto ({selectedAnticipation.discountPercentage}%)</Label>
                      <p className="text-sm font-medium text-lg text-green-600">
                        - R$ {selectedAnticipation.discountAmount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                    <div className="col-span-2">
                      <Label className="text-sm font-medium text-muted-foreground">Valor Final</Label>
                      <p className="text-sm font-medium text-xl font-bold">
                        R$ {selectedAnticipation.finalValue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                  </>
                )}
                {selectedAnticipation.discountPercentage === 0 && (
                  <div className="col-span-2">
                    <Label className="text-sm font-medium text-muted-foreground">Valor Final</Label>
                    <p className="text-sm font-medium text-xl font-bold">
                      R$ {selectedAnticipation.finalValue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                )}
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Status</Label>
                  <Badge
                    variant="outline"
                    className={
                      selectedAnticipation.status === "approved"
                        ? "bg-green-100 text-green-800 hover:bg-green-100"
                        : selectedAnticipation.status === "pending"
                          ? "bg-orange-100 text-orange-800 hover:bg-orange-100"
                          : "bg-red-100 text-red-800 hover:bg-red-100"
                    }
                  >
                    {selectedAnticipation.status === "approved" && (
                      <>
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Aprovado
                      </>
                    )}
                    {selectedAnticipation.status === "pending" && (
                      <>
                        <Clock className="w-3 h-3 mr-1" />
                        Pendente
                      </>
                    )}
                    {selectedAnticipation.status === "rejected" && (
                      <>
                        <XCircle className="w-3 h-3 mr-1" />
                        Rejeitado
                      </>
                    )}
                  </Badge>
                </div>
                {selectedAnticipation.paymentDate && (
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Data de Pagamento</Label>
                    <p className="text-sm font-medium">{selectedAnticipation.paymentDate}</p>
                  </div>
                )}
                {selectedAnticipation.paymentMethod && (
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Método de Pagamento</Label>
                    <p className="text-sm font-medium">{selectedAnticipation.paymentMethod}</p>
                  </div>
                )}
              </div>

              {selectedAnticipation.reason && (
                <div className="border-t pt-4">
                  <Label className="text-sm font-medium mb-2 block">Motivo da Solicitação</Label>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{selectedAnticipation.reason}</p>
                </div>
              )}
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAnticipationModalOpen(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ClientDashboard;
