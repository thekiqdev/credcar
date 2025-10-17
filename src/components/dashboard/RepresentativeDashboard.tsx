import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
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
import { Progress } from "@/components/ui/progress";
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
  ChevronRight,
  BarChart3,
  Users,
  FileText,
  Calculator,
  DollarSign,
  TrendingUp,
  Clock,
  Wallet,
  Bell,
  Calendar,
  Eye,
  Download,
  Filter,
  Edit,
  Trash2,
  Key,
  User,
  Mail,
  Phone,
  MapPin,
  Building,
  FileCheck,
  Upload,
  CheckCircle,
  XCircle,
  AlertCircle,
} from "lucide-react";
import DocumentNotification from './DocumentNotification';
import DocumentUploadModal from './DocumentUploadModal';
import { withdrawalService } from "../../lib/withdrawal.service";
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
import {
  dashboardService,
  authService,
  contractService,
  clientService,
  supabase,
} from "@/lib/supabase";
import { uploadService, DocumentInfo } from "@/lib/upload.service";
import ContractCreationFlow from "@/components/sales/ContractCreationFlow";
import ContractDetails from "@/components/sales/ContractDetails";

interface RepresentativeDashboardProps {
  representativeName?: string;
  performanceData?: {
    totalSales: number;
    targetSales: number;
    activeContracts: number;
    completedContracts: number;
    pendingCommission: number;
    nextCommissionDate: string;
    nextCommissionValue: number;
  };
  myContracts?: {
    id: string;
    contractNumber: string;
    clientName: string;
    date: string;
    value: number;
    status: "active" | "completed" | "pending" | "cancelled";
    commission: number;
  }[];
  commissionHistory?: {
    id: string;
    contract: string;
    date: string;
    value: number;
    status: "pending" | "paid";
    dueDate?: string;
  }[];
}

const RepresentativeDashboard: React.FC<RepresentativeDashboardProps> = ({
  representativeName,
  performanceData: propPerformanceData,
  myContracts: propMyContracts,
  commissionHistory: propCommissionHistory,
}) => {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const [performanceData, setPerformanceData] = useState(
    propPerformanceData || {
      totalSales: 0,
      targetSales: 500000,
      activeContracts: 0,
      completedContracts: 0,
      pendingCommission: 0,
      nextCommissionDate: "15/08/2025",
      nextCommissionValue: 0,
    },
  );
  const [myContracts, setMyContracts] = useState(propMyContracts || []);
  const [commissionHistory, setCommissionHistory] = useState(
    propCommissionHistory || [],
  );
  const [myClients, setMyClients] = useState([]);
  const [clientStats, setClientStats] = useState({
    totalClients: 0,
    newClientsThisMonth: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isWithdrawalDialogOpen, setIsWithdrawalDialogOpen] =
    React.useState(false);
  const [withdrawalAmount, setWithdrawalAmount] = React.useState("");
  const [isProcessing, setIsProcessing] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState("dashboard");
  const [showContractFlow, setShowContractFlow] = React.useState(false);
  const [selectedContractId, setSelectedContractId] = React.useState<
    string | null
  >(null);
  const [isContractModalOpen, setIsContractModalOpen] = React.useState(false);
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = React.useState(false);
  const [selectedClientForPassword, setSelectedClientForPassword] =
    React.useState<any>(null);
  const [newPassword, setNewPassword] = React.useState("");
  
  // My Account states
  const [representativeDocuments, setRepresentativeDocuments] = useState<any[]>([]);
  const [isLoadingDocuments, setIsLoadingDocuments] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileData, setProfileData] = useState({
    name: "",
    email: "",
    phone: "",
    cnpj: "",
    address: "",
  });
  
  // Document upload modal state
  const [showDocumentUploadModal, setShowDocumentUploadModal] = useState(false);
  
  // Document management states
  const [requiredDocuments, setRequiredDocuments] = useState<any[]>([]);
  const [isLoadingRequiredDocuments, setIsLoadingRequiredDocuments] = useState(false);
  const [uploadingDocuments, setUploadingDocuments] = useState<Set<string>>(new Set());

  const displayName =
    representativeName || currentUser?.name || "Representante";

  // Check authentication on component mount
  useEffect(() => {
    const checkAuth = async () => {
      console.log("🔍 RepresentativeDashboard: Iniciando verificação de autenticação");
      
      // Primeiro tentar Supabase Auth (admins)
      let user = await authService.getCurrentUser();
      console.log("🔍 Supabase Auth user:", user);
      
      // Se não encontrar, tentar localStorage (representantes)
      if (!user) {
        console.log("🔍 Tentando localStorage...");
        const { authService: oldAuthService } = await import("../../lib/supabase");
        user = oldAuthService.getCurrentUser();
        console.log("🔍 localStorage user:", user);
      }
      
      if (!user || user.role !== "Representante") {
        console.log(
          "❌ RepresentativeDashboard: User not authenticated or not representative, redirecting to login"
        );
        navigate("/");
        return false;
      }
      
      console.log("🔍 User encontrado:", user);
      console.log("🔍 CPF/CNPJ:", user.cnpj);
      
      // Definir currentUser
      setCurrentUser(user);
      return true;
    };

    checkAuth().then((isAuthenticated) => {
      if (!isAuthenticated) return;

    // Continue with existing data loading logic
    const loadDashboardData = async () => {
      if (!currentUser?.id) {
        console.warn("No current user found");
        setError("Usuário não encontrado. Faça login novamente.");
        setIsLoading(false);
        return;
      }

      try {
        console.log("Loading dashboard data for user:", currentUser.id);
        setIsLoading(true);
        setError(null);

        const dashboardData =
          await dashboardService.getRepresentativeDashboardData(currentUser.id);

        console.log("Dashboard data loaded successfully:", dashboardData);

        if (dashboardData) {
          setPerformanceData(
            dashboardData.performanceData || {
              totalSales: 0,
              targetSales: 500000,
              activeContracts: 0,
              completedContracts: 0,
              pendingCommission: 0,
              nextCommissionDate: "15/08/2025",
              nextCommissionValue: 0,
            },
          );
          setMyContracts(dashboardData.myContracts || []);
          setCommissionHistory(dashboardData.commissionHistory || []);
        }

        // Load clients data
        try {
          const clients = await clientService.getByRepresentative(
            currentUser.id,
          );
          console.log("Clients loaded for representative:", clients);
          setMyClients(clients || []);
        } catch (clientError) {
          console.error("Error loading clients:", clientError);
          setMyClients([]);
        }

        // Load client statistics
        try {
          const stats = await clientService.getRepresentativeClientStats(
            currentUser.id,
          );
          console.log("Client stats loaded:", stats);
          setClientStats(stats || { totalClients: 0, newClientsThisMonth: 0 });
        } catch (statsError) {
          console.error("Error loading client stats:", statsError);
          setClientStats({ totalClients: 0, newClientsThisMonth: 0 });
        }
      } catch (err) {
        console.error("Error loading dashboard data:", err);
        const errorMessage =
          err instanceof Error ? err.message : "Erro desconhecido";
        setError(`Erro ao carregar dados: ${errorMessage}`);

        // Set default data even on error
        setPerformanceData({
          totalSales: 0,
          targetSales: 500000,
          activeContracts: 0,
          completedContracts: 0,
          pendingCommission: 0,
          nextCommissionDate: "15/08/2025",
          nextCommissionValue: 0,
        });
        setMyContracts([]);
        setCommissionHistory([]);
        setMyClients([]);
        setClientStats({
          totalClients: 0,
          newClientsThisMonth: 0,
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadDashboardData();
    });
  }, [navigate, currentUser && currentUser.id, showContractFlow]); // Add navigate and showContractFlow as dependency to reload when contract is created

  // Load documents when My Account tab is active
  useEffect(() => {
    console.log('🔄 useEffect My Account triggered:', { activeTab, currentUserId: currentUser?.id });
    if (activeTab === "my-account" && currentUser?.id) {
      console.log('📋 Carregando documentos para My Account...');
      loadRepresentativeDocuments();
      loadProfileData();
      loadRequiredDocuments();
    }
  }, [activeTab, currentUser?.id]);

  const salesProgress =
    (performanceData.totalSales / performanceData.targetSales) * 100;
  const availableBalance = performanceData.pendingCommission;

  const handleLogout = async () => {
    console.log("🔓 Representative logout clicked");
    
    // Limpar AMBOS os sistemas
    await authService.logout(); // Supabase Auth (caso exista)
    
    const { authService: oldAuthService } = await import("../../lib/supabase");
    oldAuthService.logout(); // localStorage (representantes)
    
    console.log("✅ Logout complete, navigating to home");
    navigate("/", { replace: true });
  };

  // Load representative documents
  const loadRepresentativeDocuments = async () => {
    if (!currentUser?.id) return;
    
    try {
      setIsLoadingDocuments(true);
      const { data: documents, error } = await supabase
        .from('representative_documents')
        .select('*')
        .eq('representative_id', currentUser.id);
      
      if (error) {
        console.error("Error loading representative documents:", error);
        setRepresentativeDocuments([]);
      } else {
        setRepresentativeDocuments(documents || []);
      }
    } catch (error) {
      console.error("Error loading representative documents:", error);
      setRepresentativeDocuments([]);
    } finally {
      setIsLoadingDocuments(false);
    }
  };

  // Load profile data
  const loadProfileData = () => {
    if (currentUser) {
      setProfileData({
        name: currentUser.name || currentUser.full_name || "",
        email: currentUser.email || "",
        phone: currentUser.phone || "",
        cnpj: currentUser.cnpj || "",
        address: currentUser.address || "",
      });
    }
  };

  // Handle profile edit
  const handleEditProfile = () => {
    setIsEditingProfile(true);
    loadProfileData();
  };

  const handleCancelEditProfile = () => {
    setIsEditingProfile(false);
    loadProfileData();
  };

  const handleSaveProfile = async () => {
    if (!currentUser?.id) return;
    
    try {
      const { representativeService } = await import("../../lib/supabase");
      await representativeService.update(currentUser.id, profileData);
      
      // Update current user data
      setCurrentUser({ ...currentUser, ...profileData });
      setIsEditingProfile(false);
      
      alert("Perfil atualizado com sucesso!");
    } catch (error) {
      console.error("Error updating profile:", error);
      alert("Erro ao atualizar perfil. Tente novamente.");
    }
  };

  // Handle document upload modal
  const handleOpenDocumentUpload = () => {
    setShowDocumentUploadModal(true);
  };

  const handleCloseDocumentUpload = () => {
    setShowDocumentUploadModal(false);
  };

  const handleDocumentUploadComplete = () => {
    // Reload documents after upload
    loadRepresentativeDocuments();
    setShowDocumentUploadModal(false);
  };

  // Load required documents with status
  const loadRequiredDocuments = async () => {
    if (!currentUser?.id) return;
    
    try {
      setIsLoadingRequiredDocuments(true);
      
      // Lista de documentos obrigatórios
      const documentTypes = [
        'cartilha de credenciamento preenchida',
        'cartão cnpj',
        'contrato social e última alteração',
        'comprovante de endereço em nome da empresa',
        'dados bancários para recebimento das comissões',
        'cartilha de credenciamento pf',
        'comprovante de endereço em nome do sócio',
        'certidão de antecedentes criminais',
        'certidão negativa cível de 1º grau',
        'certidão negativa criminal de 1º grau',
        'foto de identidade ou cnh (frente)',
        'foto de identidade ou cnh (verso)'
      ];

      // Buscar documentos existentes no banco
      console.log('🔍 Buscando documentos existentes para:', currentUser.id);
      const { data: existingDocs, error } = await supabase
        .from('representative_documents')
        .select('*')
        .eq('representative_id', currentUser.id);

      console.log('📋 Documentos encontrados no banco:', existingDocs);
      console.log('❌ Erro na busca:', error);

      if (error) {
        console.error('Error loading existing documents:', error);
      }

      // Criar lista completa de documentos com status
      const documentsWithStatus = documentTypes.map(type => {
        // Buscar TODOS os documentos deste tipo e pegar o mais recente com arquivo
        const docsOfType = existingDocs?.filter(doc => doc.document_type === type) || [];
        
        // Ordenar por data de upload (mais recente primeiro) e pegar o primeiro que tem file_url
        const latestDocWithFile = docsOfType
          .filter(doc => doc.file_url && doc.file_url.trim() !== '')
          .sort((a, b) => new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime())[0];
        
        // Se não encontrar com arquivo, pegar o mais recente de qualquer forma
        const latestDoc = latestDocWithFile || docsOfType
          .sort((a, b) => new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime())[0];
        
        console.log(`🔍 Processando documento: ${type}`);
        console.log(`📄 Total de documentos deste tipo: ${docsOfType.length}`);
        console.log(`📄 Documento mais recente com arquivo:`, latestDocWithFile);
        console.log(`📄 Documento mais recente geral:`, latestDoc);
        
        const result = {
          id: type,
          type: type,
          status: latestDoc ? latestDoc.status : 'Pendente',
          file_url: latestDoc?.file_url || null,
          uploaded_at: latestDoc?.uploaded_at || null,
          approved_at: latestDoc?.approved_at || null,
          rejection_reason: latestDoc?.rejection_reason || null,
          file: null
        };
        
        console.log(`✅ Resultado final para ${type}:`, result);
        return result;
      });

      console.log('📋 Lista final de documentos com status:', documentsWithStatus);
      setRequiredDocuments(documentsWithStatus);
      console.log('✅ requiredDocuments atualizado com:', documentsWithStatus.length, 'documentos');
    } catch (error) {
      console.error('Error loading required documents:', error);
    } finally {
      setIsLoadingRequiredDocuments(false);
    }
  };

  // Handle individual document upload
  const handleDocumentFileSelect = (documentId: string, file: File) => {
    setRequiredDocuments(prev => prev.map(doc => 
      doc.id === documentId ? { ...doc, file } : doc
    ));
  };

  const handleUploadDocument = async (documentId: string) => {
    if (!currentUser?.id) return;
    
    const document = requiredDocuments.find(doc => doc.id === documentId);
    if (!document || !document.file) return;

    try {
      setUploadingDocuments(prev => new Set(prev).add(documentId));
      
      console.log('🚀 Iniciando upload do documento:', document.type);
      console.log('📁 Arquivo:', document.file.name, document.file.size, 'bytes');
      console.log('👤 Representante:', currentUser.id, currentUser.cnpj);
      
      // Preparar dados do documento
      const docInfo: DocumentInfo = {
        representativeId: currentUser.id,
        cpfCnpj: currentUser.cnpj || '',
        documentType: document.type,
        fileName: document.file.name,
        fileSize: document.file.size,
        fileType: document.file.type
      };

      console.log('📋 Document Info:', docInfo);

      // Upload do arquivo
      const result = await uploadService.uploadComplete(document.file, docInfo);
      
      console.log('📤 Resultado do upload:', result);
      
      if (!result.success) {
        throw new Error(result.error || 'Erro ao fazer upload do arquivo');
      }

      // Salvar no banco de dados
      console.log('💾 Salvando no banco de dados...');
      const dataToSave = {
        representative_id: currentUser.id,
        document_type: document.type,
        file_url: result.data?.filePath || result.data?.directory,
        status: 'Pendente',
        uploaded_at: new Date().toISOString()
      };
      console.log('📋 Dados para salvar:', dataToSave);

      const { data: savedData, error: dbError } = await supabase
        .from('representative_documents')
        .upsert(dataToSave)
        .select();

      console.log('💾 Resultado do salvamento:', { savedData, dbError });
      console.log('🔍 Dados salvos detalhados:', savedData);
      console.log('❌ Erro detalhado:', dbError);

      if (dbError) {
        console.error('❌ Erro ao salvar no banco:', dbError);
        throw new Error(`Erro ao salvar no banco: ${dbError.message}`);
      }

      console.log('✅ Documento salvo no banco com sucesso!');

      // Atualizar status do documento
      setRequiredDocuments(prev => prev.map(doc => 
        doc.id === documentId 
          ? { ...doc, status: 'Pendente', file_url: result.data?.filePath || result.data?.directory, uploaded_at: new Date().toISOString(), file: null }
          : doc
      ));

      alert('Documento enviado com sucesso!');
      
    } catch (error) {
      console.error('Error uploading document:', error);
      alert(`Erro ao enviar documento: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    } finally {
      setUploadingDocuments(prev => {
        const newSet = new Set(prev);
        newSet.delete(documentId);
        return newSet;
      });
    }
  };

  const handleWithdrawalRequest = async () => {
    try {
      const amount = parseFloat(withdrawalAmount);
      
      if (!amount || amount <= 0) {
        alert("Por favor, informe um valor válido");
        return;
      }
      
      if (amount > availableBalance) {
        alert(`Saldo insuficiente. Valor disponível: R$ ${availableBalance.toLocaleString("pt-BR")}`);
        return;
      }
      
      setIsProcessing(true);
      
      const withdrawal = await withdrawalService.createWithdrawalRequest(
        currentUser.id,
        amount
      );
      
      // Atualizar UI
      setIsWithdrawalDialogOpen(false);
      setWithdrawalAmount("");
      
      // Recarregar dados do dashboard para atualizar saldo
      const loadData = async () => {
        if (!currentUser?.id) return;
        
        try {
          const { dashboardService } = await import("../../lib/supabase");
          const dashboardData = await dashboardService.getRepresentativeDashboardData(currentUser.id);
          
          if (dashboardData) {
            setPerformanceData(
              dashboardData.performanceData || {
                totalSales: 0,
                targetSales: 500000,
                activeContracts: 0,
                completedContracts: 0,
                pendingCommission: 0,
                nextCommissionDate: "15/08/2025",
                nextCommissionValue: 0,
              },
            );
            setMyContracts(dashboardData.myContracts || []);
            setCommissionHistory(dashboardData.commissionHistory || []);
          }
        } catch (error) {
          console.error("Erro ao recarregar dados:", error);
        }
      };
      
      await loadData();
      
      alert(
        `✅ Solicitação ${withdrawal.request_code} criada com sucesso!\n\n` +
        `Valor: R$ ${amount.toLocaleString("pt-BR")}\n` +
        `Status: Pendente de aprovação\n\n` +
        `Acompanhe o status na aba Comissão.`
      );
    } catch (error) {
      console.error("Erro ao criar solicitação:", error);
      alert("❌ Erro ao criar solicitação de retirada. Tente novamente.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleEditClientPassword = (client: any) => {
    setSelectedClientForPassword(client);
    setNewPassword("");
    setIsPasswordDialogOpen(true);
  };

  const handleUpdateClientPassword = async () => {
    if (!selectedClientForPassword || !newPassword.trim()) {
      alert("Por favor, insira uma nova senha");
      return;
    }

    try {
      await clientService.updatePassword(
        selectedClientForPassword.id,
        newPassword,
      );
      alert(
        `Senha do cliente ${selectedClientForPassword.full_name || selectedClientForPassword.name} atualizada com sucesso!`,
      );
      setIsPasswordDialogOpen(false);
      setSelectedClientForPassword(null);
      setNewPassword("");
    } catch (error) {
      console.error("Error updating client password:", error);
      alert("Erro ao atualizar senha do cliente");
    }
  };

  const handleStartSimulation = () => {
    setShowContractFlow(true);
  };

  const handleContractFlowComplete = () => {
    setShowContractFlow(false);
    setActiveTab("contracts");
    // Refresh dashboard data after contract creation by re-triggering the useEffect
    // The useEffect will run again because showContractFlow changed
  };

  const handleViewContract = (contractId: string) => {
    setSelectedContractId(contractId);
    setIsContractModalOpen(true);
  };

  const handleEditContract = (contractId: string) => {
    setSelectedContractId(contractId);
    setIsContractModalOpen(true);
  };

  const handleCloseContractModal = () => {
    setIsContractModalOpen(false);
    setSelectedContractId(null);
    // Refresh dashboard data when modal closes
    window.location.reload();
  };

  const handleDeleteContract = async (contractId: string) => {
    const contract = myContracts.find((c) => c.id === contractId);
    if (!contract) {
      alert("Contrato não encontrado");
      return;
    }

    // Check if user can delete this contract
    const canDelete =
      contract.status.toLowerCase() === "pendente" ||
      contract.status.toLowerCase() === "cancelado" ||
      contract.status.toLowerCase() === "reprovado";

    if (!canDelete) {
      alert(
        "Você só pode excluir contratos com status Pendente, Cancelado ou Reprovado.",
      );
      return;
    }

    const confirmDelete = window.confirm(
      `Tem certeza que deseja excluir o contrato ${contract.contractNumber}?\n\nEsta ação irá:\n• Excluir o contrato permanentemente\n• Remover todos os documentos associados\n• Remover todas as assinaturas\n\nEsta ação não pode ser desfeita.`,
    );

    if (!confirmDelete) return;

    try {
      if (!currentUser) {
        alert("Usuário não autenticado");
        return;
      }

      await contractService.delete(contractId, currentUser.id, false); // false for isAdmin (representative)

      // Refresh dashboard data
      const dashboardData =
        await dashboardService.getRepresentativeDashboardData(currentUser.id);
      if (dashboardData) {
        setMyContracts(dashboardData.myContracts || []);
        setPerformanceData(
          dashboardData.performanceData || {
            totalSales: 0,
            targetSales: 500000,
            activeContracts: 0,
            completedContracts: 0,
            pendingCommission: 0,
            nextCommissionDate: "15/08/2025",
            nextCommissionValue: 0,
          },
        );
      }

      alert("Contrato excluído com sucesso!");
    } catch (error) {
      console.error("Error deleting contract:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Erro desconhecido";
      alert(`Erro ao excluir contrato: ${errorMessage}`);
    }
  };

  // Contract creation flow is now integrated within the dashboard

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
              Dashboard do Representante
            </h2>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="outline" size="sm">
              <Bell className="h-4 w-4 mr-2" />
              Notificações
            </Button>
            <div className="flex items-center gap-2">
              <Avatar>
                <AvatarFallback className="bg-blue-100 text-blue-600">
                  <User className="h-6 w-6" />
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-medium">{displayName}</p>
                <p className="text-xs text-muted-foreground">Representante</p>
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
              variant={activeTab === "dashboard" ? "default" : "ghost"}
              className="w-full justify-start"
              onClick={() => setActiveTab("dashboard")}
            >
              <BarChart3 className="mr-2 h-4 w-4" />
              Dashboard
            </Button>

            <Button
              variant={activeTab === "contracts" ? "default" : "ghost"}
              className="w-full justify-start"
              onClick={() => setActiveTab("contracts")}
            >
              <FileText className="mr-2 h-4 w-4" />
              Meus Contratos
            </Button>
            <Button
              variant={activeTab === "commission" ? "default" : "ghost"}
              className="w-full justify-start"
              onClick={() => setActiveTab("commission")}
            >
              <DollarSign className="mr-2 h-4 w-4" />
              Área de Comissão
            </Button>
            <Button
              variant={activeTab === "clients" ? "default" : "ghost"}
              className="w-full justify-start"
              onClick={() => setActiveTab("clients")}
            >
              <Users className="mr-2 h-4 w-4" />
              Meus Clientes
            </Button>
            <Button
              variant={activeTab === "my-account" ? "default" : "ghost"}
              className="w-full justify-start"
              onClick={() => setActiveTab("my-account")}
            >
              <User className="mr-2 h-4 w-4" />
              Minha Conta
            </Button>
          </nav>
        </aside>

        {/* Main Dashboard Content */}
        <main className="flex-1 overflow-y-auto p-6">
          {/* Document Notification - Fixa até todos documentos enviados */}
          {currentUser && currentUser.status === 'Pendente de Aprovação' && (
            <>
              {console.log('🔍 Current User:', currentUser)}
              {console.log('🔍 CPF/CNPJ:', currentUser.cnpj)}
              <DocumentNotification 
                representativeId={currentUser.id}
                representativeName={currentUser.name || currentUser.full_name || 'Representante'}
                representativeCpfCnpj={currentUser.cnpj || ''}
                onClose={() => {
                  // Notificação não pode ser fechada - sempre visível até documentos enviados
                  console.log('Notificação obrigatória - não pode ser fechada');
                }}
              />
            </>
          )}
          
          {showContractFlow && (
            <div className="mb-6">
              <ContractCreationFlow onComplete={handleContractFlowComplete} />
            </div>
          )}
          {!showContractFlow && isLoading && (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto mb-4"></div>
                <p className="text-muted-foreground">Carregando dados...</p>
              </div>
            </div>
          )}

          {!showContractFlow && error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg
                    className="h-5 w-5 text-red-400"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">
                    Erro no Dashboard
                  </h3>
                  <p className="text-sm text-red-700 mt-1">{error}</p>
                  <div className="mt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.location.reload()}
                      className="text-red-800 border-red-300 hover:bg-red-100"
                    >
                      Tentar Novamente
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {!showContractFlow &&
            !isLoading &&
            !error &&
            activeTab === "dashboard" && (
              <>
                {/* Performance Overview Cards */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">
                        Total de Vendas
                      </CardTitle>
                      <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-red-600">
                        R$ {performanceData.totalSales.toLocaleString("pt-BR")}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Meta: R${" "}
                        {performanceData.targetSales.toLocaleString("pt-BR")}
                      </p>
                      <Progress className="mt-2" value={salesProgress} />
                      <p className="text-xs text-muted-foreground mt-1">
                        {salesProgress.toFixed(0)}% da meta
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">
                        Contratos Ativos
                      </CardTitle>
                      <FileText className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-blue-600">
                        {performanceData.activeContracts}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {performanceData.completedContracts} concluídos
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">
                        Comissão Pendente
                      </CardTitle>
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-green-600">
                        R${" "}
                        {performanceData.pendingCommission.toLocaleString(
                          "pt-BR",
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        A receber
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">
                        Meus Clientes
                      </CardTitle>
                      <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-blue-600">
                        {clientStats.totalClients}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        +{clientStats.newClientsThisMonth} este mês
                      </p>
                    </CardContent>
                  </Card>
                </div>

                {/* Quick Actions */}
                <div className="mb-6">
                  <h2 className="text-lg font-semibold mb-4">Ações Rápidas</h2>
                  <div className="grid gap-4 md:grid-cols-4">
                    <Button
                      className="h-auto py-4 flex flex-col items-center justify-center gap-2 bg-red-600 hover:bg-red-700"
                      onClick={handleStartSimulation}
                    >
                      <Calculator className="h-6 w-6" />
                      <span>Nova Simulação</span>
                    </Button>
                    <Button
                      className="h-auto py-4 flex flex-col items-center justify-center gap-2"
                      variant="outline"
                      onClick={() => setActiveTab("contracts")}
                    >
                      <FileText className="h-6 w-6" />
                      <span>Meus Contratos</span>
                    </Button>
                    <Button
                      className="h-auto py-4 flex flex-col items-center justify-center gap-2"
                      variant="outline"
                      onClick={() => setActiveTab("commission")}
                    >
                      <DollarSign className="h-6 w-6" />
                      <span>Área de Comissão</span>
                    </Button>
                    <Button
                      className="h-auto py-4 flex flex-col items-center justify-center gap-2"
                      variant="outline"
                      onClick={() => setActiveTab("clients")}
                    >
                      <Users className="h-6 w-6" />
                      <span>Meus Clientes</span>
                    </Button>
                  </div>
                </div>
              </>
            )}

          {!showContractFlow &&
            !isLoading &&
            !error &&
            activeTab === "contracts" && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold">Meus Contratos</h2>
                  <div className="flex gap-2">
                    <Button
                      onClick={handleStartSimulation}
                      className="bg-red-600 hover:bg-red-700 text-white"
                      size="sm"
                    >
                      <FileText className="mr-2 h-4 w-4" />
                      Criar Contrato
                    </Button>
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
                <Card>
                  <CardHeader>
                    <CardTitle>Lista de Contratos</CardTitle>
                    <CardDescription>
                      Todos os contratos que você vendeu.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {myContracts.length > 0 ? (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Contrato</TableHead>
                            <TableHead>Cliente</TableHead>
                            <TableHead>Data</TableHead>
                            <TableHead>Valor</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Comissão</TableHead>
                            <TableHead className="text-right">Ações</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {myContracts.map((contract) => (
                            <TableRow key={contract.id}>
                              <TableCell className="font-medium">
                                {contract.contractNumber}
                              </TableCell>
                              <TableCell>{contract.clientName}</TableCell>
                              <TableCell>{contract.date}</TableCell>
                              <TableCell>
                                R$ {contract.value.toLocaleString("pt-BR")}
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant="outline"
                                  className={
                                    contract.status === "Ativo" ||
                                    contract.status === "Em Análise"
                                      ? "bg-blue-100 text-blue-800 hover:bg-blue-100"
                                      : contract.status === "Concluído" ||
                                          contract.status === "Aprovado"
                                        ? "bg-green-100 text-green-800 hover:bg-green-100"
                                        : contract.status === "Pendente"
                                          ? "bg-amber-100 text-amber-800 hover:bg-amber-100"
                                          : contract.status === "Cancelado" ||
                                              contract.status === "Reprovado" ||
                                              contract.status === "Em Atraso"
                                            ? "bg-red-100 text-red-800 hover:bg-red-100"
                                            : contract.status === "Faturado"
                                              ? "bg-purple-100 text-purple-800 hover:bg-purple-100"
                                              : "bg-gray-100 text-gray-800 hover:bg-gray-100"
                                  }
                                >
                                  {contract.status}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                R$ {contract.commission.toLocaleString("pt-BR")}
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex gap-2 justify-end">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() =>
                                      handleViewContract(contract.id)
                                    }
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                  {(contract.status === "Pendente" ||
                                    contract.status === "Cancelado" ||
                                    contract.status === "Reprovado") && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() =>
                                        handleEditContract(contract.id)
                                      }
                                    >
                                      <Edit className="h-4 w-4" />
                                    </Button>
                                  )}
                                  {(contract.status === "Pendente" ||
                                    contract.status === "Cancelado" ||
                                    contract.status === "Reprovado") && (
                                    <Button
                                      variant="destructive"
                                      size="sm"
                                      onClick={() =>
                                        handleDeleteContract(contract.id)
                                      }
                                      title="Excluir contrato"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    ) : (
                      <div className="text-center py-8">
                        <FileText className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                        <p className="text-lg font-medium mb-2">
                          Nenhum contrato encontrado
                        </p>
                        <p className="text-muted-foreground mb-4">
                          Você ainda não possui contratos registrados no
                          sistema.
                        </p>
                        <Button
                          variant="outline"
                          onClick={handleStartSimulation}
                        >
                          <Calculator className="mr-2 h-4 w-4" />
                          Criar Primeira Simulação
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}

          {!showContractFlow &&
            !isLoading &&
            !error &&
            activeTab === "commission" && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold">Área de Comissão</h2>
                  <Dialog
                    open={isWithdrawalDialogOpen}
                    onOpenChange={setIsWithdrawalDialogOpen}
                  >
                    <DialogTrigger asChild>
                      <Button className="bg-red-600 hover:bg-red-700">
                        <Wallet className="mr-2 h-4 w-4" />
                        Solicitar Retirada
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px]">
                      <DialogHeader>
                        <DialogTitle>Solicitar Retirada</DialogTitle>
                        <DialogDescription>
                          Solicite o saque do seu saldo de comissão disponível.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="p-4 bg-muted rounded-lg">
                          <h4 className="font-medium mb-2">Saldo Disponível</h4>
                          <p className="text-2xl font-bold text-green-600">
                            R$ {availableBalance.toLocaleString("pt-BR")}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Valor disponível para saque
                          </p>
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                          <Label htmlFor="amount" className="text-right">
                            Valor
                          </Label>
                          <Input
                            id="amount"
                            type="number"
                            value={withdrawalAmount}
                            onChange={(e) =>
                              setWithdrawalAmount(e.target.value)
                            }
                            className="col-span-3"
                            placeholder="0,00"
                            min="0"
                            max={availableBalance}
                            step="0.01"
                          />
                        </div>
                        {withdrawalAmount && (
                          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                            <p className="text-sm font-medium text-blue-800">
                              Valor da solicitação:
                            </p>
                            <p className="text-lg font-bold text-blue-900">
                              R${" "}
                              {parseFloat(
                                withdrawalAmount || "0",
                              ).toLocaleString("pt-BR", {
                                minimumFractionDigits: 2,
                              })}
                            </p>
                            <p className="text-xs text-blue-700">
                              Processamento em até 2 dias úteis
                            </p>
                          </div>
                        )}
                      </div>
                      <DialogFooter>
                        <Button
                          variant="outline"
                          onClick={() => setIsWithdrawalDialogOpen(false)}
                          disabled={isProcessing}
                        >
                          Cancelar
                        </Button>
                        <Button 
                          onClick={handleWithdrawalRequest}
                          disabled={isProcessing}
                        >
                          {isProcessing ? "Processando..." : "Solicitar Retirada"}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>

                {/* Commission Summary Cards */}
                <div className="grid gap-4 md:grid-cols-3 mb-6">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">
                        Saldo Disponível
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-green-600">
                        R${" "}
                        {performanceData.pendingCommission.toLocaleString(
                          "pt-BR",
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Pronto para saque
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">
                        Próximo Pagamento
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-orange-600">
                        R${" "}
                        {performanceData.nextCommissionValue.toLocaleString(
                          "pt-BR",
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {performanceData.nextCommissionDate}
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">
                        Total do Mês
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-blue-600">
                        R${" "}
                        {(
                          performanceData.pendingCommission +
                          performanceData.nextCommissionValue
                        ).toLocaleString("pt-BR")}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Julho 2023
                      </p>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle>Extrato de Comissões</CardTitle>
                    <CardDescription>
                      Histórico detalhado das suas comissões.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {commissionHistory.length > 0 ? (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Código</TableHead>
                            <TableHead>Data Solicitação</TableHead>
                            <TableHead>Valor</TableHead>
                            <TableHead>Status Solicitação</TableHead>
                            <TableHead>Data Aprovação</TableHead>
                            <TableHead>Status Pagamento</TableHead>
                            <TableHead>Data Pagamento</TableHead>
                            <TableHead className="text-right">Ações</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {commissionHistory.map((commission) => (
                            <TableRow key={commission.id}>
                              <TableCell className="font-medium">
                                {commission.contract}
                              </TableCell>
                              <TableCell>{commission.date}</TableCell>
                              <TableCell>
                                R$ {commission.value.toLocaleString("pt-BR")}
                              </TableCell>
                              <TableCell>
                                {commission.status === "paid" && (
                                  <Badge
                                    variant="outline"
                                    className="bg-green-500 text-white hover:bg-green-600 border-green-500"
                                  >
                                    Aprovado
                                  </Badge>
                                )}
                                {commission.status === "pending" && (
                                  <Badge
                                    variant="outline"
                                    className="bg-yellow-500 text-white hover:bg-yellow-600 border-yellow-500"
                                  >
                                    Pendente
                                  </Badge>
                                )}
                                {commission.status === "rejected" && (
                                  <Badge
                                    variant="outline"
                                    className="bg-red-500 text-white hover:bg-red-600 border-red-500"
                                  >
                                    Rejeitado
                                  </Badge>
                                )}
                              </TableCell>
                              <TableCell>{commission.approvalDate || "-"}</TableCell>
                              <TableCell>
                                {commission.type === "withdrawal" && commission.paymentStatus ? (
                                  <Badge
                                    variant="outline"
                                    className={
                                      commission.paymentStatus === "Pago"
                                        ? "bg-green-500 text-white hover:bg-green-600 border-green-500"
                                        : "bg-yellow-500 text-white hover:bg-yellow-600 border-yellow-500"
                                    }
                                  >
                                    {commission.paymentStatus}
                                  </Badge>
                                ) : (
                                  <span className="text-gray-500">-</span>
                                )}
                              </TableCell>
                              <TableCell>
                                {commission.type === "withdrawal" && commission.paymentDate ? (
                                  commission.paymentDate
                                ) : (
                                  <span className="text-gray-500">-</span>
                                )}
                              </TableCell>
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
                          Nenhuma comissão encontrada
                        </p>
                        <p className="text-muted-foreground mb-4">
                          Você ainda não possui histórico de comissões.
                        </p>
                        <Button
                          variant="outline"
                          onClick={() => setActiveTab("contracts")}
                        >
                          <FileText className="mr-2 h-4 w-4" />
                          Ver Contratos
                        </Button>
                      </div>
                    )}
                    <div className="flex justify-end mt-4">
                      <Button variant="outline" size="sm">
                        <Download className="mr-2 h-4 w-4" />
                        Exportar Extrato
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

          {!showContractFlow &&
            !isLoading &&
            !error &&
            activeTab === "clients" && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold">Meus Clientes</h2>
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

                {/* Client Statistics Cards */}
                <div className="grid gap-4 md:grid-cols-3 mb-6">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">
                        Total de Clientes
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-blue-600">
                        {clientStats.totalClients}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Clientes cadastrados
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">
                        Novos Este Mês
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-green-600">
                        {clientStats.newClientsThisMonth}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Clientes novos
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">
                        Com Contratos
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-orange-600">
                        {myContracts.length}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Clientes ativos
                      </p>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle>Lista de Clientes</CardTitle>
                    <CardDescription>
                      Todos os clientes cadastrados por você.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {myClients.length > 0 ? (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Nome</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Telefone</TableHead>
                            <TableHead>CPF/CNPJ</TableHead>
                            <TableHead>Cidade</TableHead>
                            <TableHead>Data Cadastro</TableHead>
                            <TableHead className="text-right">Ações</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {myClients.map((client) => (
                            <TableRow key={client.id}>
                              <TableCell className="font-medium">
                                {client.full_name || client.name}
                              </TableCell>
                              <TableCell>{client.email}</TableCell>
                              <TableCell>{client.phone || "-"}</TableCell>
                              <TableCell>{client.cpf_cnpj || "-"}</TableCell>
                              <TableCell>
                                {client.address_city || "-"}
                              </TableCell>
                              <TableCell>
                                {client.created_at
                                  ? new Date(
                                      client.created_at,
                                    ).toLocaleDateString("pt-BR")
                                  : "-"}
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex gap-2 justify-end">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() =>
                                      navigate(`/cliente?clientId=${client.id}`)
                                    }
                                    title="Acessar painel do cliente"
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() =>
                                      handleEditClientPassword(client)
                                    }
                                    title="Editar senha do cliente"
                                  >
                                    <Key className="h-4 w-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    ) : (
                      <div className="text-center py-8">
                        <Users className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                        <p className="text-lg font-medium mb-2">
                          Nenhum cliente encontrado
                        </p>
                        <p className="text-muted-foreground mb-4">
                          Os clientes aparecerão aqui quando você criar
                          contratos.
                        </p>
                        <Button
                          variant="outline"
                          onClick={handleStartSimulation}
                        >
                          <Calculator className="mr-2 h-4 w-4" />
                          Criar Primeiro Contrato
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}

          {/* My Account Section */}
          {!showContractFlow &&
            !isLoading &&
            !error &&
            activeTab === "my-account" && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold">Minha Conta</h2>
                  <div className="flex gap-2">
                    {isEditingProfile ? (
                      <>
                        <Button variant="outline" onClick={handleCancelEditProfile}>
                          Cancelar
                        </Button>
                        <Button onClick={handleSaveProfile}>
                          <CheckCircle className="mr-2 h-4 w-4" />
                          Salvar
                        </Button>
                      </>
                    ) : (
                      <Button onClick={handleEditProfile}>
                        <Edit className="mr-2 h-4 w-4" />
                        Editar Perfil
                      </Button>
                    )}
                  </div>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                  {/* Personal Information */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <User className="h-5 w-5" />
                        Dados Pessoais
                      </CardTitle>
                      <CardDescription>
                        Suas informações pessoais e de contato
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="name">Nome Completo</Label>
                          {isEditingProfile ? (
                            <Input
                              id="name"
                              value={profileData.name}
                              onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                            />
                          ) : (
                            <p className="text-sm font-medium">{profileData.name || "Não informado"}</p>
                          )}
                        </div>
                        <div>
                          <Label htmlFor="cnpj">CPF/CNPJ</Label>
                          {isEditingProfile ? (
                            <Input
                              id="cnpj"
                              value={profileData.cnpj}
                              onChange={(e) => setProfileData({ ...profileData, cnpj: e.target.value })}
                            />
                          ) : (
                            <p className="text-sm font-medium">{profileData.cnpj || "Não informado"}</p>
                          )}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="email">Email</Label>
                          {isEditingProfile ? (
                            <Input
                              id="email"
                              type="email"
                              value={profileData.email}
                              onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                            />
                          ) : (
                            <p className="text-sm font-medium">{profileData.email || "Não informado"}</p>
                          )}
                        </div>
                        <div>
                          <Label htmlFor="phone">Telefone</Label>
                          {isEditingProfile ? (
                            <Input
                              id="phone"
                              value={profileData.phone}
                              onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                            />
                          ) : (
                            <p className="text-sm font-medium">{profileData.phone || "Não informado"}</p>
                          )}
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="address">Endereço</Label>
                        {isEditingProfile ? (
                          <Input
                            id="address"
                            value={profileData.address}
                            onChange={(e) => setProfileData({ ...profileData, address: e.target.value })}
                          />
                        ) : (
                          <p className="text-sm font-medium">{profileData.address || "Não informado"}</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Account Status */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Building className="h-5 w-5" />
                        Status da Conta
                      </CardTitle>
                      <CardDescription>
                        Informações sobre sua conta no sistema
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Status</span>
                        <Badge variant={currentUser?.status === "Ativo" ? "default" : "secondary"}>
                          {currentUser?.status || "Não definido"}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Código de Comissão</span>
                        <span className="text-sm font-mono">{currentUser?.commission_code || "Não definido"}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Data de Cadastro</span>
                        <span className="text-sm">{currentUser?.created_at ? new Date(currentUser.created_at).toLocaleDateString("pt-BR") : "Não informado"}</span>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Documents Section */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      Documentos Obrigatórios
                    </CardTitle>
                    <CardDescription>
                      Gerencie seus documentos obrigatórios para ativação do perfil
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {isLoadingRequiredDocuments ? (
                      <div className="flex items-center justify-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
                        <span className="ml-2 text-muted-foreground">Carregando documentos...</span>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        {/* Documentos da Empresa */}
                        <div className="space-y-4">
                          <div className="flex items-center gap-2 mb-4">
                            <div className="h-1 w-8 bg-blue-600"></div>
                            <h4 className="text-lg font-semibold text-blue-800">Documentos da Empresa</h4>
                            <Badge variant="outline" className="bg-blue-50 text-blue-700">
                              {requiredDocuments.filter(d => d.type.includes('empresa') || d.type.includes('cnpj') || d.type.includes('contrato') || d.type.includes('bancários') || d.type.includes('cartilha de credenciamento preenchida')).length} documentos
                            </Badge>
                          </div>

                          {requiredDocuments.filter(doc => doc.type.includes('empresa') || doc.type.includes('cnpj') || doc.type.includes('contrato') || doc.type.includes('bancários') || doc.type.includes('cartilha de credenciamento preenchida')).map((doc) => (
                            <div key={doc.id} className="flex items-center justify-between p-4 border rounded-lg">
                              <div className="flex items-center gap-3 flex-1">
                                <div className="p-2 bg-blue-100 rounded-lg">
                                  <FileText className="h-5 w-5 text-blue-600" />
                                </div>
                                <div className="flex-1">
                                  <p className="font-medium">{doc.type}</p>
                                  <p className="text-sm text-muted-foreground">
                                    {doc.status === 'Pendente' && !doc.file_url ? 'Não enviado' : 
                                     doc.status === 'Pendente' ? `Enviado em ${new Date(doc.uploaded_at).toLocaleDateString("pt-BR")}` :
                                     doc.status === 'Aprovado' ? `Aprovado em ${new Date(doc.approved_at).toLocaleDateString("pt-BR")}` :
                                     `Rejeitado - ${doc.rejection_reason || 'Motivo não informado'}`}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge variant={doc.status === "Aprovado" ? "default" : doc.status === "Reprovado" ? "destructive" : "secondary"}>
                                  {doc.status}
                                </Badge>
                                {doc.file_url && (
                                  <>
                                    <Button variant="outline" size="sm">
                                      <Eye className="h-4 w-4" />
                                    </Button>
                                    <Button variant="outline" size="sm">
                                      <Download className="h-4 w-4" />
                                    </Button>
                                  </>
                                )}
                                {doc.status !== 'Aprovado' && (
                                  <div className="flex items-center gap-2">
                                    <Input
                                      type="file"
                                      accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                                      onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) {
                                          handleDocumentFileSelect(doc.id, file);
                                        }
                                      }}
                                      className="w-48"
                                      disabled={uploadingDocuments.has(doc.id)}
                                    />
                                    <Button
                                      size="sm"
                                      onClick={() => handleUploadDocument(doc.id)}
                                      disabled={!doc.file || uploadingDocuments.has(doc.id)}
                                    >
                                      {uploadingDocuments.has(doc.id) ? (
                                        <>
                                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                          Enviando...
                                        </>
                                      ) : (
                                        <>
                                          <Upload className="h-4 w-4 mr-2" />
                                          Enviar
                                        </>
                                      )}
                                    </Button>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Documentos do Sócio */}
                        <div className="space-y-4">
                          <div className="flex items-center gap-2 mb-4">
                            <div className="h-1 w-8 bg-green-600"></div>
                            <h4 className="text-lg font-semibold text-green-800">Documentos do Sócio</h4>
                            <Badge variant="outline" className="bg-green-50 text-green-700">
                              {requiredDocuments.filter(doc => doc.type.includes('sócio') || doc.type.includes('pf') || doc.type.includes('certidão') || doc.type.includes('foto') || doc.type.includes('cnh') || doc.type.includes('identidade')).length} documentos
                            </Badge>
                          </div>

                          {requiredDocuments.filter(doc => doc.type.includes('sócio') || doc.type.includes('pf') || doc.type.includes('certidão') || doc.type.includes('foto') || doc.type.includes('cnh') || doc.type.includes('identidade')).map((doc) => (
                            <div key={doc.id} className="flex items-center justify-between p-4 border rounded-lg">
                              <div className="flex items-center gap-3 flex-1">
                                <div className="p-2 bg-green-100 rounded-lg">
                                  <FileText className="h-5 w-5 text-green-600" />
                                </div>
                                <div className="flex-1">
                                  <p className="font-medium">{doc.type}</p>
                                  <p className="text-sm text-muted-foreground">
                                    {doc.status === 'Pendente' && !doc.file_url ? 'Não enviado' : 
                                     doc.status === 'Pendente' ? `Enviado em ${new Date(doc.uploaded_at).toLocaleDateString("pt-BR")}` :
                                     doc.status === 'Aprovado' ? `Aprovado em ${new Date(doc.approved_at).toLocaleDateString("pt-BR")}` :
                                     `Rejeitado - ${doc.rejection_reason || 'Motivo não informado'}`}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge variant={doc.status === "Aprovado" ? "default" : doc.status === "Reprovado" ? "destructive" : "secondary"}>
                                  {doc.status}
                                </Badge>
                                {doc.file_url && (
                                  <>
                                    <Button variant="outline" size="sm">
                                      <Eye className="h-4 w-4" />
                                    </Button>
                                    <Button variant="outline" size="sm">
                                      <Download className="h-4 w-4" />
                                    </Button>
                                  </>
                                )}
                                {doc.status !== 'Aprovado' && (
                                  <div className="flex items-center gap-2">
                                    <Input
                                      type="file"
                                      accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                                      onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) {
                                          handleDocumentFileSelect(doc.id, file);
                                        }
                                      }}
                                      className="w-48"
                                      disabled={uploadingDocuments.has(doc.id)}
                                    />
                                    <Button
                                      size="sm"
                                      onClick={() => handleUploadDocument(doc.id)}
                                      disabled={!doc.file || uploadingDocuments.has(doc.id)}
                                    >
                                      {uploadingDocuments.has(doc.id) ? (
                                        <>
                                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                          Enviando...
                                        </>
                                      ) : (
                                        <>
                                          <Upload className="h-4 w-4 mr-2" />
                                          Enviar
                                        </>
                                      )}
                                    </Button>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}
        </main>
      </div>

      {/* Contract Details Modal */}
      <Dialog open={isContractModalOpen} onOpenChange={setIsContractModalOpen}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] overflow-hidden p-0">
          <div className="h-[95vh] overflow-y-auto">
            {selectedContractId && (
              <ContractDetails
                contractId={selectedContractId}
                onBack={handleCloseContractModal}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Client Password Edit Dialog */}
      <Dialog
        open={isPasswordDialogOpen}
        onOpenChange={setIsPasswordDialogOpen}
      >
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Editar Senha do Cliente</DialogTitle>
            <DialogDescription>
              Altere a senha de acesso do cliente{" "}
              {selectedClientForPassword?.full_name ||
                selectedClientForPassword?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-4 bg-muted rounded-lg">
              <h4 className="font-medium mb-2">Cliente</h4>
              <p className="text-sm">
                <strong>Nome:</strong>{" "}
                {selectedClientForPassword?.full_name ||
                  selectedClientForPassword?.name}
              </p>
              <p className="text-sm">
                <strong>CPF:</strong>{" "}
                {selectedClientForPassword?.cpf_cnpj || "Não informado"}
              </p>
              <p className="text-sm">
                <strong>Email:</strong>{" "}
                {selectedClientForPassword?.email || "Não informado"}
              </p>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="newPassword" className="text-right">
                Nova Senha
              </Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="col-span-3"
                placeholder="Digite a nova senha"
              />
            </div>
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm font-medium text-blue-800">
                Instruções para o cliente:
              </p>
              <p className="text-xs text-blue-700 mt-1">
                O cliente deve usar seu CPF e esta nova senha para fazer login
                no sistema.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsPasswordDialogOpen(false)}
            >
              Cancelar
            </Button>
            <Button onClick={handleUpdateClientPassword}>
              Atualizar Senha
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Document Upload Modal */}
      {showDocumentUploadModal && currentUser && (
        <DocumentUploadModal
          representativeId={currentUser.id}
          representativeName={currentUser.name || currentUser.full_name || 'Representante'}
          representativeCpfCnpj={currentUser.cnpj || ''}
          onClose={handleCloseDocumentUpload}
          onUploadComplete={handleDocumentUploadComplete}
        />
      )}
    </div>
  );
};

export default RepresentativeDashboard;
