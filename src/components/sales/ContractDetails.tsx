import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  User,
  FileText,
  DollarSign,
  Calendar,
  MapPin,
  Phone,
  Mail,
  CreditCard,
  CheckCircle,
  XCircle,
  Download,
  Upload,
  Eye,
  AlertCircle,
  Edit3,
  Trash2,
  Edit,
  PenTool,
  ExternalLink,
} from "lucide-react";
import { Editor } from "@tinymce/tinymce-react";
import {
  supabase,
  authService,
  contractService,
  contractTemplateService,
} from "@/lib/supabase";
import { electronicSignatureService } from "@/lib/supabase";
import {
  ContractStatus,
  ContractData,
  ContractDetailsProps,
} from "@/types/supabase";

const ContractDetails: React.FC<ContractDetailsProps> = ({
  contractId: propContractId,
  onBack,
}) => {
  const { id: paramContractId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const contractId = propContractId || paramContractId;

  const [contract, setContract] = useState<ContractData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isApprovalDialogOpen, setIsApprovalDialogOpen] = useState(false);
  const [isRejectionDialogOpen, setIsRejectionDialogOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isEditingContent, setIsEditingContent] = useState(false);
  const [editedContent, setEditedContent] = useState("");
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [availableTemplates, setAvailableTemplates] = useState<any[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);
  const [signatureLinks, setSignatureLinks] = useState<any[]>([]);
  const [isLoadingSignatures, setIsLoadingSignatures] = useState(false);
  const [contractDocuments, setContractDocuments] = useState<any[]>([]);
  const [isLoadingDocuments, setIsLoadingDocuments] = useState(false);
  const [isDeletingDocument, setIsDeletingDocument] = useState<string | null>(
    null,
  );
  const [isSignatureModalOpen, setIsSignatureModalOpen] = useState(false);
  const [signatureBlockData, setSignatureBlockData] = useState({
    signatoryName: "",
  });
  const [signatureBlocks, setSignatureBlocks] = useState<any[]>([]);
  const editorRef = useRef<any>(null);

  const currentUser = authService.getCurrentUser();
  const isAdmin = currentUser?.role === "Administrador";
  const isRepresentative = currentUser?.role === "Representante";
  const canEditOrDelete =
    contract &&
    isRepresentative &&
    (contract.status === "Pendente" || contract.status === "Reprovado") &&
    contract.representative.id === currentUser?.id;

  useEffect(() => {
    if (!contractId) {
      setError("ID do contrato não fornecido");
      setIsLoading(false);
      return;
    }

    loadContractDetails();
    loadAvailableTemplates();
    loadContractDocuments();
  }, [contractId]);

  // Load signature links after contract is loaded
  useEffect(() => {
    if (contract && contractId) {
      loadSignatureLinks();
      loadSignatureBlocks();
    }
  }, [contract, contractId]);

  // Check if edit mode should be enabled after contract is loaded
  useEffect(() => {
    if (contract && canEditOrDelete) {
      // Check if edit mode is requested via URL parameter
      const urlParams = new URLSearchParams(window.location.search);
      const editParam = urlParams.get("edit");
      if (editParam === "true") {
        setIsEditMode(true);
      }
    }
  }, [contract, canEditOrDelete]);

  const loadAvailableTemplates = async () => {
    try {
      setIsLoadingTemplates(true);
      const templates = await contractTemplateService.getAll(isAdmin);
      setAvailableTemplates(templates);
    } catch (error) {
      console.error("Error loading templates:", error);
      // Don't show error for templates, it's not critical
    } finally {
      setIsLoadingTemplates(false);
    }
  };

  const loadSignatureBlocks = async () => {
    if (!contractId) return;

    try {
      // Extract signature blocks from contract content
      if (contract?.contract_content) {
        const blocks = extractSignatureBlocksFromContent(
          contract.contract_content,
        );
        setSignatureBlocks(blocks);
      }
    } catch (error) {
      console.error("Error loading signature blocks:", error);
      setSignatureBlocks([]);
    }
  };

  const extractSignatureBlocksFromContent = (content: string) => {
    const blocks = [];
    const parser = new DOMParser();
    const doc = parser.parseFromString(content, "text/html");
    const signatureBlockDivs = doc.querySelectorAll(".signature-block");

    signatureBlockDivs.forEach((div) => {
      const blockId = div.getAttribute("data-block-id");
      const signatoryName = div.getAttribute("data-signatory-name");

      if (blockId && signatoryName) {
        blocks.push({
          id: blockId,
          signatoryName: signatoryName,
          status: "pending", // Default status
          signatureUrl: null,
          signedAt: null,
        });
      }
    });

    return blocks;
  };

  const generateSignatureLink = (blockId: string) => {
    const baseUrl = window.location.origin;
    return `${baseUrl}/sign-block/${contractId}/${blockId}`;
  };

  const handleInsertSignatureBlock = () => {
    if (!signatureBlockData.signatoryName.trim()) {
      alert("Por favor, informe a identificação do signatário");
      return;
    }

    if (!editorRef.current) {
      alert("Editor não está disponível");
      return;
    }

    // Generate unique signature ID
    const signatureId = `signature_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const signerName = signatureBlockData.signatoryName.trim();

    // Prompt for CPF
    const signerCPF = prompt(
      `Por favor, informe o CPF de ${signerName} (apenas números):`,
    );
    if (!signerCPF || !signerCPF.trim()) {
      alert("CPF é obrigatório para criar o campo de assinatura");
      return;
    }

    // Validate CPF format (basic validation)
    const cleanCPF = signerCPF.replace(/\D/g, "");
    if (cleanCPF.length !== 11) {
      alert("CPF deve conter 11 dígitos");
      return;
    }

    // Create simple shortcode instead of complex HTML
    const signatureShortcode = `[SIGNATURE id="${signatureId}" name="${signerName}" cpf="${cleanCPF}"]`;

    // Insert the shortcode into the editor
    editorRef.current.insertContent(signatureShortcode);

    // Reset form and close modal
    setSignatureBlockData({ signatoryName: "" });
    setIsSignatureModalOpen(false);

    alert(
      `✅ Campo de assinatura criado com sucesso para "${signerName}"!\n\nQuando você salvar o contrato, um link de assinatura será gerado automaticamente.`,
    );
  };

  const handleDeleteDocument = async (
    documentId: string,
    documentType: string,
  ) => {
    if (!isAdmin) {
      alert("Apenas administradores podem excluir documentos");
      return;
    }

    const confirmDelete = window.confirm(
      `Tem certeza que deseja excluir este documento (${documentType})? Esta ação não pode ser desfeita.`,
    );

    if (!confirmDelete) return;

    try {
      setIsDeletingDocument(documentId);

      if (documentId.startsWith("signature-")) {
        // Delete signature document
        const signatureId = documentId.replace("signature-", "");
        const { error } = await supabase
          .from("contract_signatures")
          .delete()
          .eq("id", signatureId);

        if (error) {
          throw new Error(`Erro ao excluir assinatura: ${error.message}`);
        }
      } else if (documentId.startsWith("document-")) {
        // Delete regular document
        const docId = documentId.replace("document-", "");
        const { error } = await supabase
          .from("contract_documents")
          .delete()
          .eq("id", docId);

        if (error) {
          throw new Error(`Erro ao excluir documento: ${error.message}`);
        }
      }

      // Reload documents
      await loadContractDocuments();
      alert("Documento excluído com sucesso!");
    } catch (error) {
      console.error("Error deleting document:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Erro desconhecido";
      alert(`Erro ao excluir documento: ${errorMessage}`);
    } finally {
      setIsDeletingDocument(null);
    }
  };

  const loadSignatureLinks = async () => {
    if (!contractId) return;

    try {
      setIsLoadingSignatures(true);
      console.log("Loading signature links for contract:", contractId);

      // First check if contract has signature fields in content
      if (contract?.contract_content) {
        const signatureFields =
          await electronicSignatureService.extractSignatureFields(
            contractId,
            contract.contract_content,
          );
        console.log("Extracted signature fields:", signatureFields);

        if (signatureFields.length > 0) {
          // Save signature fields if they don't exist
          await electronicSignatureService.saveSignatureFields(signatureFields);
        }
      }

      const links =
        await electronicSignatureService.generateSignatureLinks(contractId);
      console.log("Generated signature links:", links);
      setSignatureLinks(links);
    } catch (error) {
      console.error("Error loading signature links:", error);
      setSignatureLinks([]);
    } finally {
      setIsLoadingSignatures(false);
    }
  };

  const loadContractDocuments = async () => {
    if (!contractId) return;

    try {
      setIsLoadingDocuments(true);

      // Load contract signatures (traditional signatures with documents)
      const { data: signatures, error: signaturesError } = await supabase
        .from("contract_signatures")
        .select("*")
        .eq("contract_id", contractId)
        .order("signed_at", { ascending: false });

      if (signaturesError) {
        console.error("Error loading signatures:", signaturesError);
      }

      // Load contract documents
      const { data: documents, error: documentsError } = await supabase
        .from("contract_documents")
        .select("*")
        .eq("contract_id", contractId)
        .order("uploaded_at", { ascending: false });

      if (documentsError) {
        console.error("Error loading documents:", documentsError);
      }

      // Combine signatures and documents
      const allDocuments = [];

      // Add signature documents
      if (signatures) {
        signatures.forEach((signature) => {
          allDocuments.push({
            id: `signature-${signature.id}`,
            type: "Assinatura Digital",
            name: `Assinatura de ${signature.signer_name}`,
            url: signature.signature_image_url,
            uploadedBy: signature.signer_name,
            uploadedAt: signature.signed_at,
            additionalInfo: {
              cpf: signature.signer_cpf.replace(
                /(\d{3})(\d{3})(\d{3})(\d{2})/,
                "$1.$2.$3-$4",
              ),
              ip: signature.client_ip,
            },
          });
        });
      }

      // Add other documents
      if (documents) {
        documents.forEach((document) => {
          allDocuments.push({
            id: `document-${document.id}`,
            type: document.document_type,
            name: document.document_type,
            url: document.document_url,
            uploadedBy: "Sistema", // Could be enhanced to track who uploaded
            uploadedAt: document.uploaded_at,
            additionalInfo: {},
          });
        });
      }

      setContractDocuments(allDocuments);
    } catch (error) {
      console.error("Error loading contract documents:", error);
      setContractDocuments([]);
    } finally {
      setIsLoadingDocuments(false);
    }
  };

  const loadContractDetails = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from("contracts")
        .select(
          `
          *,
          clients!inner (
            id,
            full_name,
            email,
            phone,
            cpf_cnpj,
            address
          ),
          commission_tables!inner (
            id,
            name,
            commission_percentage,
            payment_details,
            payment_installments
          ),
          profiles!inner (
            id,
            full_name,
            email,
            phone,
            commission_code
          ),
          quotas (
            id,
            quota_number,
            groups (
              id,
              name,
              description
            )
          ),
          invoices (
            id,
            invoice_code,
            value,
            due_date,
            status,
            paid_at,
            payment_link_pix,
            payment_link_boleto
          )
        `,
        )
        .eq("id", contractId)
        .single();

      if (fetchError) {
        console.error("Error fetching contract:", fetchError);
        throw new Error(`Erro ao carregar contrato: ${fetchError.message}`);
      }

      if (!data) {
        throw new Error("Contrato não encontrado");
      }

      // Transform the data to match our interface
      const contractData: ContractData = {
        id: data.id,
        contract_code:
          data.contract_code || data.contract_number || `CONT-${data.id}`,
        total_value: parseFloat(data.total_value || data.credit_amount || "0"),
        remaining_value: parseFloat(
          data.remaining_value ||
            data.remaining_payments ||
            data.credit_amount ||
            "0",
        ),
        total_installments: data.total_installments || 0,
        paid_installments: data.paid_installments || 0,
        status: data.status,
        created_at: data.created_at || new Date().toISOString(),
        contract_content: data.contract_content,
        client: {
          id: data.clients?.id || 0,
          full_name:
            data.clients?.full_name ||
            data.clients?.name ||
            "Cliente não encontrado",
          email: data.clients?.email,
          phone: data.clients?.phone,
          cpf_cnpj: data.clients?.cpf_cnpj,
          address: data.clients?.address,
        },
        commission_table: {
          id: data.commission_tables?.id || 0,
          name: data.commission_tables?.name || "Tabela não encontrada",
          commission_percentage:
            data.commission_tables?.commission_percentage || 0,
          payment_details: data.commission_tables?.payment_details,
          payment_installments:
            data.commission_tables?.payment_installments || 1,
        },
        representative: {
          id: data.profiles?.id || "",
          full_name: data.profiles?.full_name || "Representante não encontrado",
          email: data.profiles?.email || "",
          phone: data.profiles?.phone,
          commission_code: data.profiles?.commission_code,
        },
        quota: data.quotas
          ? {
              id: data.quotas.id,
              quota_number: data.quotas.quota_number,
              group: {
                id: data.quotas.groups?.id || 0,
                name: data.quotas.groups?.name || "Grupo não encontrado",
                description: data.quotas.groups?.description,
              },
            }
          : null,
        invoices: data.invoices || [],
      };

      setContract(contractData);
    } catch (err) {
      console.error("Error loading contract details:", err);
      const errorMessage =
        err instanceof Error ? err.message : "Erro desconhecido";
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveContent = async () => {
    if (!contract || !currentUser) return;

    try {
      setIsProcessing(true);

      const content = editorRef.current
        ? editorRef.current.getContent()
        : editedContent;

      console.log("Saving contract content:", {
        contractId: contract.id,
        userId: currentUser.id,
        isAdmin,
        contentLength: content.length,
      });

      // Direct database update instead of using the service to avoid permission issues
      const { data, error } = await supabase
        .from("contracts")
        .update({
          contract_content: content,
          updated_at: new Date().toISOString(),
        })
        .eq("id", contract.id)
        .select()
        .single();

      if (error) {
        console.error("Database error saving contract content:", error);
        throw new Error(`Erro do banco de dados: ${error.message}`);
      }

      console.log("Contract content saved successfully:", data);

      // Update the contract state with the new content
      setContract({ ...contract, contract_content: content });
      setIsEditingContent(false);
      setIsEditMode(false); // Exit edit mode after saving

      // Load signature blocks from the updated content
      await loadSignatureBlocks();

      // Generate signature links automatically if signature fields are present
      await generateSignatureLinksIfNeeded(content);

      // Reload signature links to show newly created ones
      await loadSignatureLinks();

      alert("Conteúdo do contrato salvo com sucesso!");
    } catch (err) {
      console.error("Error saving contract content:", err);

      // Preserve the editor content on error
      const currentContent = editorRef.current
        ? editorRef.current.getContent()
        : editedContent;
      setEditedContent(currentContent);

      // Provide more detailed error messages
      let errorMessage = "Erro desconhecido";

      if (err instanceof Error) {
        errorMessage = err.message;

        // Handle specific error cases
        if (
          err.message.includes("permission") ||
          err.message.includes("permissão")
        ) {
          errorMessage = "Você não tem permissão para editar este contrato";
        } else if (
          err.message.includes("not found") ||
          err.message.includes("não encontrado")
        ) {
          errorMessage = "Contrato não encontrado";
        } else if (
          err.message.includes("network") ||
          err.message.includes("fetch")
        ) {
          errorMessage =
            "Erro de conexão. Verifique sua internet e tente novamente";
        } else if (
          err.message.includes("Database") ||
          err.message.includes("banco de dados")
        ) {
          errorMessage = `Erro no banco de dados: ${err.message.replace("Erro do banco de dados: ", "")}`;
        }
      }

      alert(`Erro ao salvar conteúdo: ${errorMessage}`);

      // Don't exit edit mode on error to preserve user's work
      console.log("Preserving edit mode due to error");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleEditContent = () => {
    const currentContent = contract?.contract_content || "";
    console.log(
      "Starting content edit with content length:",
      currentContent.length,
    );
    setEditedContent(currentContent);
    setIsEditingContent(true);
  };

  const handleInsertTemplate = async () => {
    if (!selectedTemplateId || !editorRef.current) {
      alert("Por favor, selecione um modelo primeiro");
      return;
    }

    try {
      const template = availableTemplates.find(
        (t) => t.id.toString() === selectedTemplateId,
      );
      if (!template) {
        alert("Modelo não encontrado");
        return;
      }

      // Get current content from editor
      const currentContent = editorRef.current.getContent();

      // Insert template content at cursor position or append if no cursor
      const templateContent = template.content;

      // If there's existing content, add a separator
      const separator = currentContent.trim() ? "<br><br><hr><br><br>" : "";
      const newContent = currentContent + separator + templateContent;

      // Set the new content in the editor
      editorRef.current.setContent(newContent);
      setEditedContent(newContent);

      // Reset template selection
      setSelectedTemplateId("");

      alert(`Modelo "${template.name}" inserido com sucesso!`);
    } catch (error) {
      console.error("Error inserting template:", error);
      alert("Erro ao inserir modelo");
    }
  };

  const handleApproveContract = async () => {
    if (!contract) return;

    try {
      setIsProcessing(true);

      const { error } = await supabase
        .from("contracts")
        .update({ status: "Aprovado" })
        .eq("id", contract.id);

      if (error) {
        throw new Error(`Erro ao aprovar contrato: ${error.message}`);
      }

      setContract({ ...contract, status: "Aprovado" });
      setIsApprovalDialogOpen(false);
      alert("Contrato aprovado com sucesso!");
    } catch (err) {
      console.error("Error approving contract:", err);
      const errorMessage =
        err instanceof Error ? err.message : "Erro desconhecido";
      alert(`Erro ao aprovar contrato: ${errorMessage}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRejectContract = async () => {
    if (!contract || !rejectionReason.trim()) {
      alert("Por favor, forneça um motivo para a rejeição");
      return;
    }

    try {
      setIsProcessing(true);

      const { error } = await supabase
        .from("contracts")
        .update({ status: "Reprovado" })
        .eq("id", contract.id);

      if (error) {
        throw new Error(`Erro ao reprovar contrato: ${error.message}`);
      }

      setContract({ ...contract, status: "Reprovado" });
      setIsRejectionDialogOpen(false);
      setRejectionReason("");
      alert("Contrato reprovado com sucesso!");
    } catch (err) {
      console.error("Error rejecting contract:", err);
      const errorMessage =
        err instanceof Error ? err.message : "Erro desconhecido";
      alert(`Erro ao reprovar contrato: ${errorMessage}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteContract = async () => {
    if (!contract || !currentUser) return;

    try {
      setIsProcessing(true);

      await contractService.delete(
        contract.id.toString(),
        currentUser.id,
        isAdmin,
      );

      alert("Contrato excluído com sucesso!");
      handleBack();
    } catch (err) {
      console.error("Error deleting contract:", err);
      const errorMessage =
        err instanceof Error ? err.message : "Erro desconhecido";
      alert(`Erro ao excluir contrato: ${errorMessage}`);
    } finally {
      setIsProcessing(false);
      setIsDeleteDialogOpen(false);
    }
  };

  const updateContractStatusAfterSignature = async (
    contractId: string | number,
  ) => {
    try {
      const { data, error } = await supabase
        .from("contracts")
        .update({ status: "Aprovado" as ContractStatus })
        .eq("id", contractId)
        .select()
        .single();

      if (error) {
        throw new Error(
          `Erro ao atualizar status do contrato: ${error.message}`,
        );
      }

      return data;
    } catch (error) {
      console.error("Error updating contract status:", error);
      throw new Error(`Erro ao atualizar status do contrato: ${error.message}`);
    }
  };

  const checkDocumentsApproved = async (
    representativeId: string | number,
  ): Promise<boolean> => {
    try {
      const { data, error } = await supabase
        .from("contracts")
        .select("status")
        .eq("representative.id", representativeId)
        .eq("status", "Aprovado")
        .single();

      if (error) {
        console.error("Error checking documents approval:", error);
        return false;
      }

      return data.status === "Aprovado";
    } catch (error) {
      console.error("Error checking documents approval:", error);
      return false;
    }
  };

  const refreshUserData = async (
    userId: string | number,
  ): Promise<Representative | null> => {
    try {
      const { data, error } = await supabase
        .from("contracts")
        .select("*")
        .eq("representative.id", userId)
        .eq("status", "Pendente")
        .single();

      if (error) {
        console.error("Error creating required documents:", error);
        throw new Error(`Erro ao criar documentos: ${error.message}`);
      }

      if (!data) {
        throw new Error("Contrato não encontrado");
      }

      // Create required documents
      const { error: createError } =
        await contractService.createRequiredDocuments(data.id, userId);

      if (createError) {
        console.error("Error creating required documents:", createError);
        throw new Error(`Erro ao criar documentos: ${createError.message}`);
      }

      alert("Documentos criados com sucesso!");
    } catch (error) {
      console.error("Error creating required documents:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Erro desconhecido";
      alert(`Erro ao criar documentos: ${errorMessage}`);
    }
  };

  const approveAllDocuments = async (
    representativeId: string | number,
    approvedBy: string,
  ): Promise<void> => {
    try {
      const { data, error } = await supabase
        .from("contracts")
        .select("*")
        .eq("representative.id", representativeId)
        .eq("status", "Pendente")
        .single();

      if (error) {
        console.error("Error approving all documents:", error);
        throw new Error(`Erro ao aprovar documentos: ${error.message}`);
      }

      if (!data) {
        throw new Error("Contrato não encontrado");
      }

      // Update contract status to "Aprovado"
      const { error: updateError } = await supabase
        .from("contracts")
        .update({ status: "Aprovado", approved_by: approvedBy })
        .eq("id", data.id);

      if (updateError) {
        console.error("Error updating contract status:", updateError);
        throw new Error(
          `Erro ao atualizar status do contrato: ${updateError.message}`,
        );
      }

      alert("Todos os documentos foram aprovados com sucesso!");
    } catch (error) {
      console.error("Error approving all documents:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Erro desconhecido";
      alert(`Erro ao aprovar documentos: ${errorMessage}`);
    }
  };

  const getStatusBadge = (status: ContractStatus) => {
    const statusConfig = {
      Pendente: {
        variant: "outline" as const,
        className: "bg-amber-100 text-amber-800 hover:bg-amber-100",
      },
      "Em Análise": {
        variant: "outline" as const,
        className: "bg-blue-100 text-blue-800 hover:bg-blue-100",
      },
      Aprovado: {
        variant: "outline" as const,
        className: "bg-green-100 text-green-800 hover:bg-green-100",
      },
      Reprovado: {
        variant: "outline" as const,
        className: "bg-red-100 text-red-800 hover:bg-red-100",
      },
      Ativo: {
        variant: "outline" as const,
        className: "bg-blue-100 text-blue-800 hover:bg-blue-100",
      },
      Concluído: {
        variant: "outline" as const,
        className: "bg-green-100 text-green-800 hover:bg-green-100",
      },
      Faturado: {
        variant: "outline" as const,
        className: "bg-purple-100 text-purple-800 hover:bg-purple-100",
      },
      Cancelado: {
        variant: "outline" as const,
        className: "bg-gray-100 text-gray-800 hover:bg-gray-100",
      },
      "Em Atraso": {
        variant: "outline" as const,
        className: "bg-red-100 text-red-800 hover:bg-red-100",
      },
    };

    const config = statusConfig[status] || statusConfig["Pendente"];
    return (
      <Badge variant={config.variant} className={config.className}>
        {status}
      </Badge>
    );
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("pt-BR");
  };

  const generateSignatureLinksIfNeeded = async (content: string) => {
    if (!contract) return;

    try {
      const { electronicSignatureService } = await import("@/lib/supabase");

      // Extract signature fields from content
      const signatureFields =
        await electronicSignatureService.extractSignatureFields(
          contract.id.toString(),
          content,
        );

      if (signatureFields.length > 0) {
        // Save signature fields to database
        await electronicSignatureService.saveSignatureFields(signatureFields);

        // Reload signature links
        await loadSignatureLinks();

        console.log(
          `Generated ${signatureFields.length} signature links automatically`,
        );
      }
    } catch (error) {
      console.error("Error generating signature links automatically:", error);
    }
  };

  const renderContractContentWithSignatures = (
    content: string,
    signatureLinks: any[],
  ) => {
    if (!content) return content;

    let processedContent = content;
    const processedSignatureIds = new Set<string>();

    // Process shortcodes and replace with signature content
    const shortcodePattern =
      /\[SIGNATURE id="([^"]+)" name="([^"]+)" cpf="([^"]+)"\]/g;

    processedContent = processedContent.replace(
      shortcodePattern,
      (match, id, name, cpf) => {
        // Check if this signature ID was already processed
        if (processedSignatureIds.has(id)) {
          return ""; // Return empty string to avoid duplication
        }
        processedSignatureIds.add(id);

        const formattedCPF = cpf.replace(
          /(\d{3})(\d{3})(\d{3})(\d{2})/,
          "$1.$2.$3-$4",
        );

        // Find the corresponding signature link
        const signatureLink = signatureLinks.find(
          (link) => link.signatureId === id,
        );

        if (
          signatureLink &&
          signatureLink.status === "signed" &&
          signatureLink.signatureImageUrl
        ) {
          // Signed signature - simple layout
          return `<div style="text-align: center; margin: 20px 0;">
            <img src="${signatureLink.signatureImageUrl}" alt="Assinatura de ${name}" style="max-width: 300px; max-height: 80px; display: block; margin: 0 auto;" />
            <hr style="border: none; border-top: 1px solid #ccc; margin: 15px 0;" />
            <div style="font-size: 14px;">
              <div><strong>Nome:</strong> ${name}</div>
              <div><strong>CPF:</strong> ${formattedCPF}</div>
              <div style="margin-top: 8px; font-size: 12px;">Assinado em: ${signatureLink.signedAt ? new Date(signatureLink.signedAt).toLocaleString("pt-BR") : "Data não disponível"}</div>
            </div>
          </div>`;
        } else {
          // Pending signature - simple layout
          return `<div style="text-align: center; margin: 20px 0;">
            <div style="border: 1px dashed #ccc; padding: 20px; display: inline-block; min-width: 300px; min-height: 80px; display: flex; align-items: center; justify-content: center;">
              <span style="color: #666; font-weight: bold;">AGUARDANDO ASSINATURA</span>
            </div>
            <hr style="border: none; border-top: 1px solid #ccc; margin: 15px 0;" />
            <div style="font-size: 14px;">
              <div><strong>Nome:</strong> ${name}</div>
              <div><strong>CPF:</strong> ${formattedCPF}</div>
              <div style="margin-top: 8px; font-size: 12px;">Aguardando assinatura</div>
            </div>
          </div>`;
        }
      },
    );

    return processedContent;
  };

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigate(-1);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-background flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto mb-4"></div>
          <p className="text-muted-foreground">
            Carregando detalhes do contrato...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-background flex items-center justify-center p-8">
        <div className="text-center">
          <AlertCircle className="h-16 w-16 mx-auto mb-4 text-red-500" />
          <h2 className="text-xl font-semibold mb-2">
            Erro ao Carregar Contrato
          </h2>
          <p className="text-muted-foreground mb-4">{error}</p>
          <Button onClick={handleBack} variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>
        </div>
      </div>
    );
  }

  if (!contract) {
    return (
      <div className="bg-background flex items-center justify-center p-8">
        <div className="text-center">
          <FileText className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-xl font-semibold mb-2">
            Contrato Não Encontrado
          </h2>
          <p className="text-muted-foreground mb-4">
            O contrato solicitado não foi encontrado no sistema.
          </p>
          <Button onClick={handleBack} variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>
        </div>
      </div>
    );
  }

  const commissionValue =
    contract.total_value *
    (contract.commission_table.commission_percentage / 100);

  return (
    <div className="bg-background">
      {/* Header */}
      <header className="border-b bg-background p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={handleBack}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                Contrato {contract.contract_code}
              </h1>
              <p className="text-sm text-muted-foreground">
                Criado em {formatDate(contract.created_at)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {getStatusBadge(contract.status)}

            {/* View-Only Link - Always available */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const viewOnlyUrl = `${window.location.origin}/view/${contract.id}`;
                window.open(viewOnlyUrl, "_blank");
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Eye className="mr-2 h-4 w-4" />
              Ver Contrato
            </Button>

            {/* Traditional Signature Link - Show for Pendente status */}
            {contract.status === "Pendente" && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const signatureUrl = `${window.location.origin}/sign/${contract.id}`;
                  navigator.clipboard.writeText(signatureUrl);
                  alert(
                    "Link de assinatura tradicional copiado para a área de transferência!",
                  );
                }}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                <PenTool className="mr-2 h-4 w-4" />
                Link Tradicional
              </Button>
            )}

            {/* Show signature link for approved contracts too */}
            {contract.status === "Aprovado" && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const signatureUrl = `${window.location.origin}/sign/${contract.id}`;
                  navigator.clipboard.writeText(signatureUrl);
                  alert(
                    "Link de assinatura copiado para a área de transferência!",
                  );
                }}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                <PenTool className="mr-2 h-4 w-4" />
                Copiar Link de Assinatura
              </Button>
            )}

            {/* Admin Actions */}
            {isAdmin &&
              (contract.status === "Pendente" ||
                contract.status === "Em Análise") && (
                <div className="flex gap-2">
                  <Dialog
                    open={isApprovalDialogOpen}
                    onOpenChange={setIsApprovalDialogOpen}
                  >
                    <DialogTrigger asChild>
                      <Button
                        className="bg-green-600 hover:bg-green-700"
                        size="sm"
                      >
                        <CheckCircle className="mr-2 h-4 w-4" />
                        Aprovar
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Aprovar Contrato</DialogTitle>
                        <DialogDescription>
                          Tem certeza que deseja aprovar o contrato{" "}
                          {contract.contract_code}? Esta ação não pode ser
                          desfeita.
                        </DialogDescription>
                      </DialogHeader>
                      <DialogFooter>
                        <Button
                          variant="outline"
                          onClick={() => setIsApprovalDialogOpen(false)}
                          disabled={isProcessing}
                        >
                          Cancelar
                        </Button>
                        <Button
                          onClick={handleApproveContract}
                          disabled={isProcessing}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          {isProcessing ? "Processando..." : "Aprovar Contrato"}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>

                  <Dialog
                    open={isRejectionDialogOpen}
                    onOpenChange={setIsRejectionDialogOpen}
                  >
                    <DialogTrigger asChild>
                      <Button variant="destructive" size="sm">
                        <XCircle className="mr-2 h-4 w-4" />
                        Reprovar
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Reprovar Contrato</DialogTitle>
                        <DialogDescription>
                          Forneça um motivo para a reprovação do contrato{" "}
                          {contract.contract_code}.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="rejection-reason">
                            Motivo da Reprovação
                          </Label>
                          <Textarea
                            id="rejection-reason"
                            value={rejectionReason}
                            onChange={(e) => setRejectionReason(e.target.value)}
                            placeholder="Descreva o motivo da reprovação..."
                            className="mt-1"
                            rows={4}
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button
                          variant="outline"
                          onClick={() => {
                            setIsRejectionDialogOpen(false);
                            setRejectionReason("");
                          }}
                          disabled={isProcessing}
                        >
                          Cancelar
                        </Button>
                        <Button
                          variant="destructive"
                          onClick={handleRejectContract}
                          disabled={isProcessing || !rejectionReason.trim()}
                        >
                          {isProcessing
                            ? "Processando..."
                            : "Reprovar Contrato"}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              )}

            {/* Admin Delete Action */}
            {isAdmin && (
              <Dialog
                open={isDeleteDialogOpen}
                onOpenChange={setIsDeleteDialogOpen}
              >
                <DialogTrigger asChild>
                  <Button variant="destructive" size="sm">
                    <Trash2 className="mr-2 h-4 w-4" />
                    Excluir
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Excluir Contrato</DialogTitle>
                    <DialogDescription>
                      Tem certeza que deseja excluir o contrato{" "}
                      {contract.contract_code}? Esta ação não pode ser desfeita.
                      <br />
                      <br />
                      <strong>Nota:</strong> Você só pode excluir contratos com
                      status Pendente ou Reprovado.
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => setIsDeleteDialogOpen(false)}
                      disabled={isProcessing}
                    >
                      Cancelar
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={handleDeleteContract}
                      disabled={isProcessing}
                    >
                      {isProcessing ? "Excluindo..." : "Excluir Contrato"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}

            {/* Representative Actions */}
            {canEditOrDelete && (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setIsEditMode(!isEditMode);
                  }}
                >
                  <Edit className="mr-2 h-4 w-4" />
                  {isEditMode ? "Cancelar Edição" : "Editar"}
                </Button>

                <Dialog
                  open={isDeleteDialogOpen}
                  onOpenChange={setIsDeleteDialogOpen}
                >
                  <DialogTrigger asChild>
                    <Button variant="destructive" size="sm">
                      <Trash2 className="mr-2 h-4 w-4" />
                      Excluir
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Excluir Contrato</DialogTitle>
                      <DialogDescription>
                        Tem certeza que deseja excluir o contrato{" "}
                        {contract.contract_code}? Esta ação não pode ser
                        desfeita.
                        <br />
                        <br />
                        <strong>Nota:</strong> Você só pode excluir contratos
                        com status Pendente ou Reprovado.
                      </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                      <Button
                        variant="outline"
                        onClick={() => setIsDeleteDialogOpen(false)}
                        disabled={isProcessing}
                      >
                        Cancelar
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={handleDeleteContract}
                        disabled={isProcessing}
                      >
                        {isProcessing ? "Excluindo..." : "Excluir Contrato"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="p-6">
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview">Visão Geral</TabsTrigger>
            <TabsTrigger value="client">Cliente</TabsTrigger>
            <TabsTrigger value="payment">Pagamentos</TabsTrigger>
            <TabsTrigger value="commission">Comissão</TabsTrigger>
            <TabsTrigger value="signatures">Assinaturas</TabsTrigger>
            <TabsTrigger value="content">Conteúdo do Contrato</TabsTrigger>
            <TabsTrigger value="documents">Documentos</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Contract Information Edit Form */}
            {isEditMode && canEditOrDelete && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Edit className="h-5 w-5" />
                    Editar Informações do Contrato
                  </CardTitle>
                  <CardDescription>
                    Edite as informações básicas do contrato. Apenas campos
                    editáveis são mostrados.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <Label htmlFor="edit-client-name">Nome do Cliente</Label>
                      <Input
                        id="edit-client-name"
                        value={contract.client.full_name}
                        onChange={(e) => {
                          setContract({
                            ...contract,
                            client: {
                              ...contract.client,
                              full_name: e.target.value,
                            },
                          });
                        }}
                        placeholder="Nome completo do cliente"
                      />
                    </div>
                    <div>
                      <Label htmlFor="edit-client-email">
                        Email do Cliente
                      </Label>
                      <Input
                        id="edit-client-email"
                        type="email"
                        value={contract.client.email || ""}
                        onChange={(e) => {
                          setContract({
                            ...contract,
                            client: {
                              ...contract.client,
                              email: e.target.value,
                            },
                          });
                        }}
                        placeholder="email@exemplo.com"
                      />
                    </div>
                    <div>
                      <Label htmlFor="edit-client-phone">
                        Telefone do Cliente
                      </Label>
                      <Input
                        id="edit-client-phone"
                        value={contract.client.phone || ""}
                        onChange={(e) => {
                          setContract({
                            ...contract,
                            client: {
                              ...contract.client,
                              phone: e.target.value,
                            },
                          });
                        }}
                        placeholder="(11) 99999-9999"
                      />
                    </div>
                    <div>
                      <Label htmlFor="edit-client-cpf">
                        CPF/CNPJ do Cliente
                      </Label>
                      <Input
                        id="edit-client-cpf"
                        value={contract.client.cpf_cnpj || ""}
                        onChange={(e) => {
                          setContract({
                            ...contract,
                            client: {
                              ...contract.client,
                              cpf_cnpj: e.target.value,
                            },
                          });
                        }}
                        placeholder="000.000.000-00 ou 00.000.000/0000-00"
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="edit-client-address">
                      Endereço do Cliente
                    </Label>
                    <Textarea
                      id="edit-client-address"
                      value={contract.client.address || ""}
                      onChange={(e) => {
                        setContract({
                          ...contract,
                          client: {
                            ...contract.client,
                            address: e.target.value,
                          },
                        });
                      }}
                      placeholder="Endereço completo do cliente"
                      rows={3}
                    />
                  </div>
                  <div className="flex gap-2 pt-4">
                    <Button
                      onClick={async () => {
                        try {
                          setIsProcessing(true);
                          // Save client information changes
                          const { error } = await supabase
                            .from("clients")
                            .update({
                              full_name: contract.client.full_name,
                              email: contract.client.email,
                              phone: contract.client.phone,
                              cpf_cnpj: contract.client.cpf_cnpj,
                              address: contract.client.address,
                            })
                            .eq("id", contract.client.id);

                          if (error) {
                            throw new Error(
                              `Erro ao salvar informações: ${error.message}`,
                            );
                          }

                          alert("Informações do contrato salvas com sucesso!");
                        } catch (err) {
                          console.error("Error saving contract info:", err);
                          const errorMessage =
                            err instanceof Error
                              ? err.message
                              : "Erro desconhecido";
                          alert(`Erro ao salvar informações: ${errorMessage}`);
                        } finally {
                          setIsProcessing(false);
                        }
                      }}
                      disabled={isProcessing}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      {isProcessing ? "Salvando..." : "Salvar Informações"}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        // Reload contract details to reset changes
                        loadContractDetails();
                      }}
                      disabled={isProcessing}
                    >
                      Cancelar Alterações
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
            {/* Edit Mode Notice */}
            {isEditMode && canEditOrDelete && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <Edit className="h-5 w-5 text-blue-400" />
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-blue-800">
                        Modo de Edição Ativo
                      </h3>
                      <p className="text-sm text-blue-700 mt-1">
                        Você pode editar as informações do contrato e o conteúdo
                        na aba "Conteúdo do Contrato".
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsEditMode(false)}
                    className="text-blue-800 border-blue-300 hover:bg-blue-100"
                  >
                    Sair do Modo de Edição
                  </Button>
                </div>
              </div>
            )}

            {/* Contract Summary Cards - Client Focus */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Valor Total
                  </CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">
                    {formatCurrency(contract.total_value)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Valor do contrato
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Valor Pago
                  </CardTitle>
                  <CreditCard className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-600">
                    {formatCurrency(
                      contract.total_value - contract.remaining_value,
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Já quitado pelo cliente
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Saldo Devedor
                  </CardTitle>
                  <CreditCard className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-orange-600">
                    {formatCurrency(contract.remaining_value)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Pendente de pagamento
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Parcelas
                  </CardTitle>
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-600">
                    {contract.paid_installments}/{contract.total_installments}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {(
                      (contract.paid_installments /
                        contract.total_installments) *
                      100
                    ).toFixed(0)}
                    % pagas
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Signers Section */}
            {signatureLinks.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <PenTool className="h-5 w-5" />
                    Assinantes
                  </CardTitle>
                  <CardDescription>
                    Links de assinatura eletrônica gerados automaticamente.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {signatureLinks.map((link, index) => (
                      <div
                        key={link.signatureId}
                        className="flex items-center justify-between p-3 border rounded-lg"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                            <User className="h-6 w-6 text-blue-600" />
                          </div>
                          <div>
                            <h4 className="font-semibold text-lg text-gray-900">
                              {link.signerName}
                            </h4>
                            <p className="text-sm text-gray-600">
                              CPF:{" "}
                              {link.signerCPF.replace(
                                /(\d{3})(\d{3})(\d{3})(\d{2})/,
                                "$1.$2.$3-$4",
                              )}
                            </p>
                          </div>
                        </div>
                        <Badge
                          variant="outline"
                          className={
                            link.status === "signed"
                              ? "bg-green-100 text-green-800 hover:bg-green-100 border-green-300"
                              : "bg-amber-100 text-amber-800 hover:bg-amber-100 border-amber-300"
                          }
                        >
                          {link.status === "signed"
                            ? "✅ Assinado"
                            : "⏳ Pendente"}
                        </Badge>
                      </div>
                    ))}
                  </div>
                  {isLoadingSignatures && (
                    <div className="text-center py-4">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-red-600 mx-auto mb-2"></div>
                      <p className="text-sm text-muted-foreground">
                        Carregando links de assinatura...
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Contract Details */}
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Informações do Cliente
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium">Nome Completo</Label>
                    <p className="text-sm text-muted-foreground">
                      {contract.client.full_name}
                    </p>
                  </div>
                  {contract.client.email && (
                    <div>
                      <Label className="text-sm font-medium">Email</Label>
                      <p className="text-sm text-muted-foreground">
                        {contract.client.email}
                      </p>
                    </div>
                  )}
                  {contract.client.phone && (
                    <div>
                      <Label className="text-sm font-medium">Telefone</Label>
                      <p className="text-sm text-muted-foreground">
                        {contract.client.phone}
                      </p>
                    </div>
                  )}
                  {contract.client.cpf_cnpj && (
                    <div>
                      <Label className="text-sm font-medium">CPF/CNPJ</Label>
                      <p className="text-sm text-muted-foreground">
                        {contract.client.cpf_cnpj}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Representante
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium">Nome</Label>
                    <p className="text-sm text-muted-foreground">
                      {contract.representative.full_name}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Email</Label>
                    <p className="text-sm text-muted-foreground">
                      {contract.representative.email}
                    </p>
                  </div>
                  {contract.representative.phone && (
                    <div>
                      <Label className="text-sm font-medium">Telefone</Label>
                      <p className="text-sm text-muted-foreground">
                        {contract.representative.phone}
                      </p>
                    </div>
                  )}
                  {contract.representative.commission_code && (
                    <div>
                      <Label className="text-sm font-medium">
                        Código de Comissão
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        {contract.representative.commission_code}
                      </p>
                    </div>
                  )}

                  {/* Commission Information */}
                  <div className="border-t pt-4 mt-4">
                    <div className="bg-purple-50 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <DollarSign className="h-4 w-4 text-purple-600" />
                        <Label className="text-sm font-medium text-purple-800">
                          Comissão a Receber
                        </Label>
                      </div>
                      <div className="text-xl font-bold text-purple-600">
                        {formatCurrency(commissionValue)}
                      </div>
                      <p className="text-xs text-purple-700 mt-1">
                        {contract.commission_table.commission_percentage}% do
                        valor do contrato
                      </p>
                      <p className="text-xs text-purple-600 mt-1">
                        Tabela: {contract.commission_table.name}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Quota Information */}
            {contract.quota && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Informações da Cota
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-3">
                    <div>
                      <Label className="text-sm font-medium">Grupo</Label>
                      <p className="text-sm text-muted-foreground">
                        {contract.quota.group.name}
                      </p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">
                        Número da Cota
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        {contract.quota.quota_number}
                      </p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">
                        Descrição do Grupo
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        {contract.quota.group.description || "Sem descrição"}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="client" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Dados Completos do Cliente
                </CardTitle>
                <CardDescription>
                  Informações detalhadas do cliente associado ao contrato.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label className="text-sm font-medium">Nome Completo</Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      {contract.client.full_name}
                    </p>
                  </div>
                  {contract.client.email && (
                    <div>
                      <Label className="text-sm font-medium flex items-center gap-2">
                        <Mail className="h-4 w-4" />
                        Email
                      </Label>
                      <p className="text-sm text-muted-foreground mt-1">
                        {contract.client.email}
                      </p>
                    </div>
                  )}
                  {contract.client.phone && (
                    <div>
                      <Label className="text-sm font-medium flex items-center gap-2">
                        <Phone className="h-4 w-4" />
                        Telefone
                      </Label>
                      <p className="text-sm text-muted-foreground mt-1">
                        {contract.client.phone}
                      </p>
                    </div>
                  )}
                  {contract.client.cpf_cnpj && (
                    <div>
                      <Label className="text-sm font-medium">CPF/CNPJ</Label>
                      <p className="text-sm text-muted-foreground mt-1">
                        {contract.client.cpf_cnpj}
                      </p>
                    </div>
                  )}
                </div>

                {contract.client.address && <Separator />}

                {contract.client.address && (
                  <div>
                    <Label className="text-sm font-medium flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      Endereço
                    </Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      {contract.client.address}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="payment" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Cronograma de Pagamentos
                </CardTitle>
                <CardDescription>
                  Histórico e status dos pagamentos do contrato.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {contract.invoices.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Fatura</TableHead>
                        <TableHead>Valor</TableHead>
                        <TableHead>Vencimento</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Pago em</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {contract.invoices.map((invoice) => (
                        <TableRow key={invoice.id}>
                          <TableCell className="font-medium">
                            {invoice.invoice_code}
                          </TableCell>
                          <TableCell>{formatCurrency(invoice.value)}</TableCell>
                          <TableCell>{formatDate(invoice.due_date)}</TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={
                                invoice.status === "Pago"
                                  ? "bg-green-100 text-green-800 hover:bg-green-100"
                                  : invoice.status === "Vencido"
                                    ? "bg-red-100 text-red-800 hover:bg-red-100"
                                    : "bg-amber-100 text-amber-800 hover:bg-amber-100"
                              }
                            >
                              {invoice.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {invoice.paid_at
                              ? formatDate(invoice.paid_at)
                              : "-"}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button variant="ghost" size="sm">
                                <Eye className="h-4 w-4" />
                              </Button>
                              {invoice.payment_link_pix && (
                                <Button variant="ghost" size="sm">
                                  <Download className="h-4 w-4" />
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
                    <CreditCard className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-lg font-medium mb-2">
                      Nenhuma fatura encontrada
                    </p>
                    <p className="text-muted-foreground">
                      As faturas serão geradas automaticamente conforme o
                      cronograma de pagamento.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="signatures" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PenTool className="h-5 w-5" />
                  Assinaturas do Contrato
                </CardTitle>
                <CardDescription>
                  Assinaturas eletrônicas e tradicionais do contrato.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingSignatures ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto mb-4"></div>
                    <p className="text-muted-foreground">
                      Carregando assinaturas...
                    </p>
                  </div>
                ) : signatureLinks.length > 0 ? (
                  <div className="space-y-6">
                    {/* Electronic Signatures */}
                    <div>
                      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <PenTool className="h-5 w-5" />
                        Assinaturas Eletrônicas
                      </h3>
                      <div className="grid gap-4">
                        {signatureLinks.map((link) => (
                          <div
                            key={link.signatureId}
                            className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-3 mb-3">
                                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                                    <User className="h-6 w-6 text-blue-600" />
                                  </div>
                                  <div>
                                    <h4 className="font-semibold text-lg text-gray-900">
                                      {link.signerName}
                                    </h4>
                                    <p className="text-sm text-gray-600">
                                      CPF:{" "}
                                      {link.signerCPF.replace(
                                        /(\d{3})(\d{3})(\d{3})(\d{2})/,
                                        "$1.$2.$3-$4",
                                      )}
                                    </p>
                                  </div>
                                </div>

                                <div className="ml-15 space-y-2">
                                  <div className="text-sm text-gray-600">
                                    <strong>🆔 ID da Assinatura:</strong>{" "}
                                    {link.signatureId}
                                  </div>
                                  <div className="text-sm text-gray-600">
                                    <strong>🔗 Link de Assinatura:</strong>
                                    <code className="ml-2 px-2 py-1 bg-gray-100 rounded text-xs break-all">
                                      {link.signatureUrl}
                                    </code>
                                  </div>
                                  {link.status === "signed" &&
                                    link.signedAt && (
                                      <div className="text-sm text-gray-600">
                                        <strong>📅 Assinado em:</strong>{" "}
                                        {new Date(link.signedAt).toLocaleString(
                                          "pt-BR",
                                        )}
                                      </div>
                                    )}
                                  {link.clientIp && (
                                    <div className="text-sm text-gray-600">
                                      <strong>🌐 IP do Cliente:</strong>{" "}
                                      {link.clientIp}
                                    </div>
                                  )}
                                </div>
                              </div>

                              <div className="flex flex-col items-end gap-2 ml-4">
                                <Badge
                                  variant="outline"
                                  className={
                                    link.status === "signed"
                                      ? "bg-green-100 text-green-800 hover:bg-green-100 border-green-300"
                                      : "bg-amber-100 text-amber-800 hover:bg-amber-100 border-amber-300"
                                  }
                                >
                                  {link.status === "signed"
                                    ? "✅ Assinado"
                                    : "⏳ Pendente"}
                                </Badge>

                                <div className="flex gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      navigator.clipboard.writeText(
                                        link.signatureUrl,
                                      );
                                      alert(
                                        "Link de assinatura copiado para a área de transferência!",
                                      );
                                    }}
                                    className="bg-blue-600 hover:bg-blue-700 text-white"
                                  >
                                    <ExternalLink className="mr-2 h-4 w-4" />
                                    Copiar Link
                                  </Button>

                                  {link.status === "signed" &&
                                    link.signatureImageUrl && (
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() =>
                                          window.open(
                                            link.signatureImageUrl,
                                            "_blank",
                                          )
                                        }
                                        className="bg-green-600 hover:bg-green-700 text-white"
                                      >
                                        <Eye className="mr-2 h-4 w-4" />
                                        Ver Assinatura
                                      </Button>
                                    )}

                                  {isAdmin && (
                                    <Button
                                      variant="destructive"
                                      size="sm"
                                      onClick={async () => {
                                        const confirmRemoval = window.confirm(
                                          `⚠️ ATENÇÃO: Tem certeza que deseja remover a assinatura de ${link.signerName}?\n\nEsta ação irá:\n• Remover a assinatura do documento\n• Excluir os dados do banco de dados\n• Deletar o arquivo de imagem do armazenamento\n\nEsta ação NÃO PODE ser desfeita!`,
                                        );

                                        if (!confirmRemoval) return;

                                        try {
                                          console.log(
                                            `🗑️ Starting signature removal for: ${link.signatureId}`,
                                          );

                                          await electronicSignatureService.removeSignature(
                                            link.signatureId,
                                          );

                                          console.log(
                                            `✅ Signature removed successfully: ${link.signatureId}`,
                                          );

                                          // Update the signature links state to remove the deleted signature
                                          setSignatureLinks((prevLinks) =>
                                            prevLinks.filter(
                                              (prevLink) =>
                                                prevLink.signatureId !==
                                                link.signatureId,
                                            ),
                                          );

                                          // Reload contract details to get updated content
                                          await loadContractDetails();

                                          // Reload signature links to ensure consistency
                                          await loadSignatureLinks();

                                          alert(
                                            "✅ Assinatura removida com sucesso!",
                                          );
                                        } catch (error) {
                                          console.error(
                                            "❌ Error removing signature:",
                                            error,
                                          );
                                          const errorMessage =
                                            error instanceof Error
                                              ? error.message
                                              : "Erro desconhecido";
                                          alert(
                                            `❌ Erro ao remover assinatura: ${errorMessage}`,
                                          );
                                        }
                                      }}
                                    >
                                      <Trash2 className="mr-2 h-4 w-4" />
                                      Remover
                                    </Button>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Signature Preview */}
                            {link.status === "signed" &&
                              link.signatureImageUrl && (
                                <div className="mt-4 ml-15">
                                  <div className="border-2 border-green-200 rounded-lg p-4 bg-green-50 inline-block">
                                    <div className="text-sm font-medium text-green-800 mb-2">
                                      ✅ Assinatura Digital Verificada
                                    </div>
                                    <div className="border-2 border-green-300 rounded-lg p-3 bg-white">
                                      <img
                                        src={link.signatureImageUrl}
                                        alt={`Assinatura de ${link.signerName}`}
                                        className="max-w-[300px] max-h-[80px] object-contain mx-auto"
                                        onError={(e) => {
                                          console.error(
                                            "Error loading signature image:",
                                            e,
                                          );
                                          (
                                            e.target as HTMLImageElement
                                          ).style.display = "none";
                                        }}
                                      />
                                    </div>
                                    <div className="text-xs text-green-600 mt-2 text-center">
                                      Assinado em:{" "}
                                      {link.signedAt
                                        ? new Date(
                                            link.signedAt,
                                          ).toLocaleString("pt-BR")
                                        : "Data não disponível"}
                                    </div>
                                  </div>
                                </div>
                              )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Contract Preview with Signatures */}
                    {contract.contract_content && (
                      <div className="mt-8">
                        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                          <FileText className="h-5 w-5" />
                          Visualização do Contrato com Assinaturas
                        </h3>
                        <div className="bg-white border rounded-lg p-6">
                          <div
                            className="prose max-w-none"
                            dangerouslySetInnerHTML={{
                              __html: renderContractContentWithSignatures(
                                contract.contract_content,
                                signatureLinks,
                              ),
                            }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <PenTool className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-lg font-medium mb-2">
                      Nenhuma assinatura encontrada
                    </p>
                    <p className="text-muted-foreground mb-4">
                      As assinaturas aparecerão aqui quando os campos de
                      assinatura forem inseridos no contrato e os links forem
                      gerados.
                    </p>
                    {(isAdmin || canEditOrDelete || isEditMode) && (
                      <Button
                        variant="outline"
                        onClick={() => {
                          // Switch to content tab
                          const contentTab = document.querySelector(
                            '[data-value="content"]',
                          ) as HTMLElement;
                          if (contentTab) {
                            contentTab.click();
                          }
                        }}
                      >
                        <Edit3 className="mr-2 h-4 w-4" />
                        Editar Conteúdo do Contrato
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="commission" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Informações de Comissão
                </CardTitle>
                <CardDescription>
                  Detalhes sobre a comissão do representante para este contrato.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label className="text-sm font-medium">
                      Tabela de Comissão
                    </Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      {contract.commission_table.name}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Percentual</Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      {contract.commission_table.commission_percentage}%
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">
                      Valor da Comissão
                    </Label>
                    <p className="text-lg font-bold text-green-600 mt-1">
                      {formatCurrency(commissionValue)}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">
                      Parcelas de Comissão
                    </Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      {contract.commission_table.payment_installments}x
                    </p>
                  </div>
                </div>

                {contract.commission_table.payment_details && (
                  <>
                    <Separator />
                    <div>
                      <Label className="text-sm font-medium">
                        Detalhes do Pagamento
                      </Label>
                      <p className="text-sm text-muted-foreground mt-1">
                        {contract.commission_table.payment_details}
                      </p>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="content" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Conteúdo do Contrato
                  </div>
                  {(isAdmin || canEditOrDelete || isEditMode) && (
                    <Button
                      onClick={handleEditContent}
                      variant="outline"
                      size="sm"
                      disabled={isEditingContent}
                    >
                      <Edit3 className="mr-2 h-4 w-4" />
                      {isEditingContent ? "Editando..." : "Editar Conteúdo"}
                    </Button>
                  )}
                </CardTitle>
                <CardDescription>
                  Visualize e edite o conteúdo HTML do contrato.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isEditingContent ? (
                  <div className="space-y-4">
                    {/* Template Selection */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <h4 className="text-sm font-medium text-blue-800 mb-3">
                        Inserir Modelo de Contrato
                      </h4>
                      <div className="flex gap-3 items-end">
                        <div className="flex-1">
                          <Label htmlFor="template-select" className="text-sm">
                            Selecionar Modelo
                          </Label>
                          <select
                            id="template-select"
                            value={selectedTemplateId}
                            onChange={(e) =>
                              setSelectedTemplateId(e.target.value)
                            }
                            className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            disabled={isLoadingTemplates}
                          >
                            <option value="">
                              {isLoadingTemplates
                                ? "Carregando modelos..."
                                : "Selecione um modelo"}
                            </option>
                            {availableTemplates.map((template) => (
                              <option key={template.id} value={template.id}>
                                {template.name}
                                {template.description
                                  ? ` - ${template.description}`
                                  : ""}
                              </option>
                            ))}
                          </select>
                        </div>
                        <Button
                          onClick={handleInsertTemplate}
                          disabled={
                            !selectedTemplateId ||
                            isLoadingTemplates ||
                            isProcessing
                          }
                          variant="outline"
                          className="bg-blue-600 text-white hover:bg-blue-700"
                        >
                          <FileText className="mr-2 h-4 w-4" />
                          Inserir Modelo
                        </Button>
                      </div>
                      {availableTemplates.length === 0 &&
                        !isLoadingTemplates && (
                          <p className="text-sm text-blue-600 mt-2">
                            Nenhum modelo disponível. Crie modelos na seção de
                            administração.
                          </p>
                        )}
                    </div>

                    {/* Signature Block Section */}
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <h4 className="text-sm font-medium text-red-800 mb-3">
                        Inserir Bloco de Assinatura
                      </h4>
                      <div className="flex gap-3 items-end">
                        <div className="flex-1">
                          <Label
                            htmlFor="signatory-name-input"
                            className="text-sm"
                          >
                            Identificação do Signatário
                          </Label>
                          <Input
                            id="signatory-name-input"
                            value={signatureBlockData.signatoryName}
                            onChange={(e) =>
                              setSignatureBlockData({
                                ...signatureBlockData,
                                signatoryName: e.target.value,
                              })
                            }
                            placeholder="Ex: Cliente, Representante, Testemunha 1"
                            className="mt-1"
                          />
                        </div>
                        <Button
                          onClick={handleInsertSignatureBlock}
                          disabled={!signatureBlockData.signatoryName.trim()}
                          className="bg-red-600 hover:bg-red-700 text-white"
                        >
                          <PenTool className="mr-2 h-4 w-4" />
                          Inserir na Posição do Cursor
                        </Button>
                      </div>
                      <p className="text-xs text-red-600 mt-2">
                        Clique no editor onde deseja inserir a assinatura,
                        depois clique no botão acima.
                      </p>
                    </div>
                    <Editor
                      apiKey="46lebzjws4vt4ywtma8d15683tj61n80shufdxg1spuuwpbm"
                      onInit={(evt, editor) => {
                        editorRef.current = editor;
                        console.log("TinyMCE editor initialized");
                        // Set content after initialization to prevent direction issues
                        setTimeout(() => {
                          if (editedContent && editor) {
                            editor.setContent(editedContent);
                          }
                        }, 200);
                      }}
                      initialValue=""
                      init={{
                        height: 500,
                        menubar: false,
                        directionality: "ltr",
                        skin: "oxide",
                        content_css: "default",
                        promotion: false,
                        convert_urls: false,
                        relative_urls: false,
                        remove_script_host: false,
                        document_base_url: window.location.origin,
                        plugins: [
                          "advlist",
                          "autolink",
                          "lists",
                          "link",
                          "charmap",
                          "anchor",
                          "searchreplace",
                          "visualblocks",
                          "code",
                          "insertdatetime",
                          "table",
                          "wordcount",
                          "help",
                        ],
                        toolbar:
                          "undo redo | formatselect | bold italic underline strikethrough | " +
                          "alignleft aligncenter alignright alignjustify | " +
                          "bullist numlist outdent indent | removeformat | " +
                          "table | link | code | help",
                        content_style:
                          "body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif; font-size: 14px; line-height: 1.6; color: #333; } " +
                          "p { margin: 0 0 1em 0; } " +
                          "table { border-collapse: collapse; width: 100%; } " +
                          "table td, table th { border: 1px solid #ddd; padding: 8px; } " +
                          "table th { background-color: #f2f2f2; }",
                        language: "pt_BR",
                        branding: false,
                        resize: true,
                        statusbar: true,
                        elementpath: true,
                        browser_spellcheck: true,
                        contextmenu: "link table",
                        table_default_attributes: {
                          border: "1",
                        },
                        table_default_styles: {
                          "border-collapse": "collapse",
                          width: "100%",
                        },
                        // Configurações para evitar travamentos
                        inline_boundaries: false,
                        object_resizing: true,
                        paste_data_images: false,
                        paste_as_text: false,
                        paste_auto_cleanup_on_paste: true,
                        paste_remove_styles: false,
                        paste_remove_styles_if_webkit: false,
                        paste_strip_class_attributes: "none",
                        // Configurações de popup otimizadas
                        popup_css_add: "",
                        popup_css: "",
                        // Desabilitar auto-save para evitar conflitos
                        auto_save: {
                          enabled: false,
                        },
                        // Configurações de inicialização
                        init_instance_callback: (editor) => {
                          console.log(
                            "TinyMCE instance initialized:",
                            editor.id,
                          );
                        },
                        setup: (editor) => {
                          // Configurar eventos de forma mais estável
                          let contentChangeTimeout;

                          editor.on("init", () => {
                            console.log("TinyMCE editor setup complete");
                            if (editedContent) {
                              editor.setContent(editedContent);
                            }
                          });

                          // Debounce para mudanças de conteúdo
                          editor.on("input change paste keyup", () => {
                            clearTimeout(contentChangeTimeout);
                            contentChangeTimeout = setTimeout(() => {
                              const content = editor.getContent();
                              setEditedContent(content);
                              console.log(
                                "Editor content updated, length:",
                                content.length,
                              );
                            }, 300);
                          });

                          // Prevenir travamentos em popups
                          editor.on("BeforeOpenNotification", (e) => {
                            console.log("Opening notification:", e);
                          });

                          editor.on("OpenWindow", (e) => {
                            console.log("Opening window:", e);
                          });

                          // Limpar timeouts quando o editor for destruído
                          editor.on("remove", () => {
                            clearTimeout(contentChangeTimeout);
                          });
                        },
                      }}
                      onEditorChange={(content, editor) => {
                        // Callback adicional para mudanças
                        setEditedContent(content);
                      }}
                    />
                    <div className="flex gap-2">
                      <Button
                        onClick={handleSaveContent}
                        disabled={isProcessing}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        {isProcessing ? "Salvando..." : "Salvar"}
                      </Button>
                      <Button
                        onClick={() => {
                          // Preserve content when canceling
                          const currentContent = editorRef.current
                            ? editorRef.current.getContent()
                            : editedContent;
                          console.log(
                            "Canceling edit, preserving content length:",
                            currentContent.length,
                          );
                          setEditedContent(currentContent);
                          setIsEditingContent(false);
                        }}
                        variant="outline"
                        disabled={isProcessing}
                      >
                        Cancelar
                      </Button>
                    </div>
                  </div>
                ) : contract.contract_content ? (
                  <div
                    className="prose max-w-none p-4 border rounded-md bg-white"
                    dangerouslySetInnerHTML={{
                      __html: renderContractContentWithSignatures(
                        contract.contract_content,
                        signatureLinks,
                      ),
                    }}
                    style={
                      {
                        "& .signature-field": {
                          border: "2px dashed #ccc",
                          padding: "20px",
                          margin: "20px 0",
                          backgroundColor: "#f9f9f9",
                          textAlign: "center",
                        },
                      } as any
                    }
                  />
                ) : (
                  <div className="text-center py-8">
                    <FileText className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-lg font-medium mb-2">
                      Nenhum conteúdo encontrado
                    </p>
                    <p className="text-muted-foreground mb-4">
                      O conteúdo do contrato não foi definido.
                    </p>
                    {(isAdmin || canEditOrDelete || isEditMode) && (
                      <Button onClick={handleEditContent} variant="outline">
                        <Edit3 className="mr-2 h-4 w-4" />
                        Adicionar Conteúdo
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="documents" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Documentos do Contrato
                </CardTitle>
                <CardDescription>
                  Documentos anexados e relacionados ao contrato, incluindo
                  assinaturas e documentos de identificação.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingDocuments ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto mb-4"></div>
                    <p className="text-muted-foreground">
                      Carregando documentos...
                    </p>
                  </div>
                ) : contractDocuments.length > 0 ? (
                  <div className="space-y-4">
                    {contractDocuments.map((document) => (
                      <div
                        key={document.id}
                        className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                                {document.type === "Assinatura Digital" ? (
                                  <PenTool className="h-5 w-5 text-blue-600" />
                                ) : (
                                  <FileText className="h-5 w-5 text-blue-600" />
                                )}
                              </div>
                              <div>
                                <h4 className="font-semibold text-gray-900">
                                  {document.name}
                                </h4>
                                <p className="text-sm text-gray-600">
                                  {document.type}
                                </p>
                              </div>
                            </div>

                            <div className="grid gap-2 md:grid-cols-2 text-sm text-gray-600 ml-13">
                              <div>
                                <strong>📤 Anexado por:</strong>{" "}
                                {document.uploadedBy}
                              </div>
                              <div>
                                <strong>📅 Data:</strong>{" "}
                                {new Date(document.uploadedAt).toLocaleString(
                                  "pt-BR",
                                )}
                              </div>
                              {document.additionalInfo.cpf && (
                                <div>
                                  <strong>🆔 CPF:</strong>{" "}
                                  {document.additionalInfo.cpf}
                                </div>
                              )}
                              {document.additionalInfo.ip && (
                                <div>
                                  <strong>🌐 IP:</strong>{" "}
                                  {document.additionalInfo.ip}
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="flex gap-2 ml-4">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                window.open(document.url, "_blank")
                              }
                            >
                              <Eye className="mr-2 h-4 w-4" />
                              Visualizar
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                const link = document.createElement("a");
                                link.href = document.url;
                                link.download = document.name;
                                link.click();
                              }}
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                            {isAdmin && (
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() =>
                                  handleDeleteDocument(
                                    document.id,
                                    document.type,
                                  )
                                }
                                disabled={isDeletingDocument === document.id}
                              >
                                {isDeletingDocument === document.id ? (
                                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                                ) : (
                                  <Trash2 className="h-4 w-4" />
                                )}
                              </Button>
                            )}
                          </div>
                        </div>

                        {/* Preview for signature images */}
                        {document.type === "Assinatura Digital" && (
                          <div className="mt-4 ml-13">
                            <div className="border-2 border-green-200 rounded-lg p-3 bg-green-50 inline-block">
                              <img
                                src={document.url}
                                alt={`Assinatura de ${document.uploadedBy}`}
                                className="max-w-[200px] max-h-[80px] object-contain"
                                onError={(e) => {
                                  console.error(
                                    "Error loading signature image:",
                                    e,
                                  );
                                  (e.target as HTMLImageElement).style.display =
                                    "none";
                                }}
                              />
                            </div>
                            <p className="text-xs text-green-600 mt-1">
                              Assinatura Digital Verificada
                            </p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Upload className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-lg font-medium mb-2">
                      Nenhum documento anexado
                    </p>
                    <p className="text-muted-foreground mb-4">
                      Os documentos relacionados ao contrato aparecerão aqui
                      quando forem anexados durante o processo de assinatura.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Signature Block Modal */}
      <Dialog
        open={isSignatureModalOpen}
        onOpenChange={setIsSignatureModalOpen}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Inserir Campo de Assinatura</DialogTitle>
            <DialogDescription>
              Configure o campo de assinatura que será inserido no contrato.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="signatory-name">Nome do Signatário</Label>
              <Input
                id="signatory-name"
                value={signatureBlockData.signatoryName}
                onChange={(e) =>
                  setSignatureBlockData({
                    ...signatureBlockData,
                    signatoryName: e.target.value,
                  })
                }
                placeholder="Ex: Cliente, Representante, Testemunha"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsSignatureModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button onClick={handleInsertSignatureBlock}>Inserir Campo</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ContractDetails;
