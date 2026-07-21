import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  FileText,
  Upload,
  CheckCircle,
  AlertCircle,
  Loader2,
  User,
  FileUp,
  PenTool,
  Trash2,
} from "lucide-react";
import SignatureCanvas from "@/components/ui/signature-canvas";
import { supabase, electronicSignatureService, generalSettingsService } from "@/lib/supabase";
import { storageService } from "@/lib/storage";
import { getUploadServerBaseUrl } from "@/lib/invoice-asaas.client";
import { Building, MapPin, Phone, Mail } from "lucide-react";

interface ContractData {
  id: number;
  contract_code: string;
  contract_content: string;
  status: string;
  client: {
    full_name: string;
    email: string;
  };
}

interface SignatureData {
  full_name: string;
  cpf: string;
  document_file: File | null;
  signature_data_url: string;
}

interface GeneralSettings {
  system_name: string;
  company_name: string;
  company_address: string;
  company_phone: string;
  company_email: string;
  company_cnpj: string;
  logo_url: string;
  logo_file_path: string;
}

const SignaturePage: React.FC = () => {
  const { id: contractId, signatureId } = useParams<{
    id: string;
    signatureId?: string;
  }>();
  const navigate = useNavigate();

  const [contract, setContract] = useState<ContractData | null>(null);
  const [signatureField, setSignatureField] = useState<any>(null);
  const [generalSettings, setGeneralSettings] = useState<GeneralSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSignatureModalOpen, setIsSignatureModalOpen] = useState(false);
  const [signatureStatus, setSignatureStatus] = useState<"pending" | "success">(
    "pending",
  );
  const [canSign, setCanSign] = useState<boolean>(false);
  const [isRemoving, setIsRemoving] = useState(false);

  const [signatureData, setSignatureData] = useState<SignatureData>({
    full_name: "",
    cpf: "",
    document_file: null,
    signature_data_url: "",
  });

  const [validationErrors, setValidationErrors] = useState<{
    full_name?: string;
    cpf?: string;
    document_file?: string;
    signature?: string;
  }>({});

  useEffect(() => {
    loadGeneralSettings();
    if (contractId) {
      if (signatureId) {
        // Load electronic signature data
        loadElectronicSignatureData();
      } else {
        // Load traditional signature data
        loadContractData();
      }
    } else {
      setError("ID do contrato não fornecido");
      setIsLoading(false);
    }
  }, [contractId, signatureId]);

  const loadGeneralSettings = async () => {
    try {
      const settings = await generalSettingsService.getSettings();
      setGeneralSettings(settings);
    } catch (error) {
      console.error("Error loading general settings:", error);
      // Use default settings if loading fails
      setGeneralSettings({
        system_name: "CredCar",
        company_name: "CredCar Soluções Financeiras",
        company_address: "Rua das Empresas, 123 - Centro - São Paulo/SP",
        company_phone: "(11) 3000-0000",
        company_email: "contato@credcar.com.br",
        company_cnpj: "12.345.678/0001-90",
        logo_url: "",
        logo_file_path: "",
      });
    }
  };

  const getLogoUrl = () => {
    if (!generalSettings) return null;

    const rawLogoUrl = generalSettings.logo_url?.trim();
    if (rawLogoUrl) {
      if (/^https?:\/\//i.test(rawLogoUrl) || rawLogoUrl.startsWith("data:")) {
        return rawLogoUrl;
      }
      if (rawLogoUrl.startsWith("/")) {
        return rawLogoUrl;
      }
      if (rawLogoUrl.startsWith("documentos/")) {
        const relativePath = rawLogoUrl.replace(/^documentos\//, "");
        return `${getUploadServerBaseUrl()}/api/download-file?path=${encodeURIComponent(relativePath)}`;
      }
      return `/${rawLogoUrl}`;
    }

    const rawLogoPath = generalSettings.logo_file_path?.trim();
    if (rawLogoPath) {
      const relativePath = rawLogoPath.replace(/^documentos\//, "");
      return `${getUploadServerBaseUrl()}/api/download-file?path=${encodeURIComponent(relativePath)}`;
    }

    return null;
  };

  const loadElectronicSignatureData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Load signature field data
      const fieldData = await electronicSignatureService.getSignatureField(
        signatureId!,
      );

      if (!fieldData) {
        throw new Error("Campo de assinatura não encontrado");
      }

      setSignatureField(fieldData);

      // Pre-populate the form with signer data
      setSignatureData({
        full_name: fieldData.signer_name || "",
        cpf: fieldData.signer_cpf ? formatCPF(fieldData.signer_cpf) : "",
        document_file: null,
        signature_data_url: "",
      });

      // Check if already signed - but still allow access for removal
      if (fieldData.status === "signed") {
        // Set signature data for display
        setSignatureData({
          full_name: fieldData.signer_name || "",
          cpf: fieldData.signer_cpf ? formatCPF(fieldData.signer_cpf) : "",
          document_file: null,
          signature_data_url: fieldData.signature_url || "",
        });
        setSignatureStatus("success");
        setCanSign(false); // Can't sign again, but can remove
        setIsLoading(false);
        return;
      }

      // FIXED: Allow signing for all contract statuses except "Cancelado"
      // This ensures all signature links have permission to sign and attach to the contract
      const contractStatus = fieldData.contracts.status;
      const fieldStatus = fieldData.status;
      const canSignContract =
        fieldStatus === "pending" && contractStatus !== "Cancelado";

      setCanSign(canSignContract);

      if (!canSignContract && contractStatus === "Cancelado") {
        setError(
          `Esta assinatura não está disponível pois o contrato foi cancelado.`,
        );
        setIsLoading(false);
        return;
      } else if (!canSignContract) {
        // For other cases, still allow access but show warning
        console.warn(
          `Contract status: ${contractStatus}, Field status: ${fieldStatus}`,
        );
        setCanSign(true); // Force allow signing for all non-cancelled contracts
      }

      // Set contract data from the signature field
      setContract({
        id: fieldData.contracts.id,
        contract_code:
          fieldData.contracts.contract_number ||
          fieldData.contracts.contract_code ||
          `CONT-${fieldData.contracts.id}`,
        contract_content: fieldData.contracts.contract_content || "",
        status: fieldData.contracts.status,
        client: {
          full_name: fieldData.contracts.clients?.full_name || "Cliente",
          email: fieldData.contracts.clients?.email || "",
        },
      });
    } catch (err) {
      console.error("Error loading electronic signature data:", err);
      const errorMessage =
        err instanceof Error ? err.message : "Erro desconhecido";
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const loadContractData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from("contracts")
        .select(
          `
          id,
          contract_code,
          contract_number,
          contract_content,
          status,
          clients!inner (
            full_name,
            email
          )
        `,
        )
        .eq("id", parseInt(contractId))
        .single();

      if (fetchError) {
        console.error("Error fetching contract:", fetchError);
        throw new Error(`Erro ao carregar contrato: ${fetchError.message}`);
      }

      if (!data) {
        throw new Error("Contrato não encontrado");
      }

      // FIXED: Allow signing for all contract statuses except "Cancelado"
      // This ensures all signature links have permission to sign and attach to the contract
      if (data.status === "Cancelado") {
        throw new Error(
          "Este contrato não está disponível para assinatura pois foi cancelado.",
        );
      }

      // For traditional signatures, always allow signing for non-cancelled contracts
      setCanSign(true);

      setContract({
        id: data.id,
        contract_code:
          data.contract_number || data.contract_code || `CONT-${data.id}`,
        contract_content: data.contract_content || "",
        status: data.status,
        client: {
          full_name: data.clients?.full_name || "Cliente",
          email: data.clients?.email || "",
        },
      });
    } catch (err) {
      console.error("Error loading contract:", err);
      const errorMessage =
        err instanceof Error ? err.message : "Erro desconhecido";
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const formatCPF = (value: string) => {
    // Remove all non-numeric characters
    const numbers = value.replace(/\D/g, "");

    // Apply CPF mask: 000.000.000-00
    if (numbers.length <= 11) {
      return numbers
        .replace(/(\d{3})(\d)/, "$1.$2")
        .replace(/(\d{3})(\d)/, "$1.$2")
        .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
    }

    return value;
  };

  const validateCPF = (cpf: string): boolean => {
    // Remove formatting
    const numbers = cpf.replace(/\D/g, "");

    // Check if has 11 digits
    if (numbers.length !== 11) return false;

    // Check if all digits are the same
    if (/^(\d)\1{10}$/.test(numbers)) return false;

    // Validate CPF algorithm
    let sum = 0;
    for (let i = 0; i < 9; i++) {
      sum += parseInt(numbers.charAt(i)) * (10 - i);
    }
    let remainder = (sum * 10) % 11;
    if (remainder === 10 || remainder === 11) remainder = 0;
    if (remainder !== parseInt(numbers.charAt(9))) return false;

    sum = 0;
    for (let i = 0; i < 10; i++) {
      sum += parseInt(numbers.charAt(i)) * (11 - i);
    }
    remainder = (sum * 10) % 11;
    if (remainder === 10 || remainder === 11) remainder = 0;
    if (remainder !== parseInt(numbers.charAt(10))) return false;

    return true;
  };

  const handleInputChange = (field: keyof SignatureData, value: string) => {
    if (field === "cpf") {
      value = formatCPF(value);
    }

    setSignatureData((prev) => ({ ...prev, [field]: value }));

    // Clear validation error when user starts typing
    if (validationErrors[field]) {
      setValidationErrors((prev) => ({ ...prev, [field]: undefined }));
    }

    // Force re-render of contract content to show updated data
    setContract((prev) => (prev ? { ...prev } : null));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setSignatureData((prev) => ({ ...prev, document_file: file }));

    // Clear validation error when user selects a file
    if (validationErrors.document_file) {
      setValidationErrors((prev) => ({ ...prev, document_file: undefined }));
    }

    // Force re-render of contract content to show document status
    setContract((prev) => (prev ? { ...prev } : null));
  };

  const handleSignatureConfirm = (signatureDataUrl: string) => {
    setSignatureData((prev) => ({
      ...prev,
      signature_data_url: signatureDataUrl,
    }));

    // Clear validation error when user provides signature
    if (validationErrors.signature) {
      setValidationErrors((prev) => ({ ...prev, signature: undefined }));
    }

    // Force re-render of contract content to show signature preview
    setContract((prev) => (prev ? { ...prev } : null));
  };

  const validateForm = (): boolean => {
    const errors: typeof validationErrors = {};

    if (!signatureData.full_name.trim()) {
      errors.full_name = "Nome completo é obrigatório";
    }

    if (!signatureData.cpf.trim()) {
      errors.cpf = "CPF é obrigatório";
    } else if (!validateCPF(signatureData.cpf)) {
      errors.cpf = "CPF inválido";
    }

    // Document upload is no longer required - signatures are handled electronically

    if (!signatureData.signature_data_url) {
      errors.signature = "Assinatura é obrigatória";
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const uploadSignature = async (
    signatureDataUrl: string,
    contractId: string,
  ): Promise<string> => {
    // Convert data URL to blob
    const blob = await storageService.dataUrlToBlob(signatureDataUrl);
    return await storageService.uploadSignature(contractId, blob);
  };

  const handleSubmit = async () => {
    if (!validateForm() || !contract) return;

    try {
      setIsSubmitting(true);
      setError(null);

      // Get client IP
      let clientIP = "127.0.0.1";
      try {
        // Try to get real IP from various sources
        const response = await fetch("https://api.ipify.org?format=json");
        const data = await response.json();
        clientIP = data.ip || "127.0.0.1";
      } catch (error) {
        console.warn("Could not get client IP, using localhost:", error);
        // Fallback to getting IP from headers if available
        clientIP =
          window.location.hostname === "localhost" ? "127.0.0.1" : "unknown";
      }

      // Upload signature
      const signatureUrl = await uploadSignature(
        signatureData.signature_data_url,
        contract.id.toString(),
      );

      if (signatureId && signatureField) {
        // Electronic signature flow
        await electronicSignatureService.updateSignatureField(
          signatureId,
          signatureUrl,
          clientIP,
        );

        // Update the contract content with the actual signature
        await updateContractContentWithSignature(
          contract.id.toString(),
          signatureId,
          signatureUrl,
          signatureData.full_name,
          signatureData.cpf,
        );

        setSignatureStatus("success");
        alert("Assinatura eletrônica realizada com sucesso!");
      } else {
        // Traditional signature flow - now simplified without document upload
        // Save signature data to database
        const { error: signatureError } = await supabase
          .from("contract_signatures")
          .insert({
            contract_id: contract.id,
            signer_name: signatureData.full_name,
            signer_cpf: signatureData.cpf.replace(/\D/g, ""), // Store only numbers
            signature_image_url: signatureUrl,
            client_ip: clientIP,
            signed_at: new Date().toISOString(),
          });

        if (signatureError) {
          console.error("Error saving signature:", signatureError);
          throw new Error(
            `Erro ao salvar assinatura: ${signatureError.message}`,
          );
        }

        // Update contract status to "Em Análise"
        const { error: statusError } = await supabase
          .from("contracts")
          .update({
            status: "Em Análise",
            updated_at: new Date().toISOString(),
          })
          .eq("id", contract.id);

        if (statusError) {
          console.error("Error updating contract status:", statusError);
          throw new Error(
            `Erro ao atualizar status do contrato: ${statusError.message}`,
          );
        }

        setSignatureStatus("success");
        alert(
          "Contrato assinado com sucesso! O documento foi enviado para análise.",
        );
      }

      // Only navigate after a delay to show the success state
      setTimeout(() => {
        navigate("/");
      }, 2000);
    } catch (err) {
      console.error("Error submitting signature:", err);
      const errorMessage =
        err instanceof Error ? err.message : "Erro desconhecido";
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveSignature = async () => {
    if (!signatureId || !signatureField) {
      setError("ID da assinatura não encontrado");
      return;
    }

    const confirmRemoval = window.confirm(
      "⚠️ ATENÇÃO: Tem certeza que deseja remover esta assinatura?\n\nEsta ação irá:\n• Remover a assinatura do documento\n• Excluir os dados do banco de dados\n• Deletar o arquivo de imagem do armazenamento\n\nEsta ação NÃO PODE ser desfeita!",
    );

    if (!confirmRemoval) return;

    try {
      setIsRemoving(true);
      setError(null);

      console.log(`Iniciando remoção da assinatura: ${signatureId}`);

      // Remove the signature using the enhanced service
      await electronicSignatureService.removeSignature(signatureId);

      console.log(`Assinatura ${signatureId} removida com sucesso`);

      // Reset the component state
      setSignatureData({
        full_name: signatureField.signer_name || "",
        cpf: signatureField.signer_cpf
          ? formatCPF(signatureField.signer_cpf)
          : "",
        document_file: null,
        signature_data_url: "",
      });
      setSignatureStatus("pending");
      setCanSign(true);

      // Show success message
      alert(
        "✅ Assinatura removida com sucesso!\n\n• Assinatura excluída do documento\n• Dados removidos do banco de dados\n• Arquivo deletado do armazenamento\n\nAgora você pode assinar novamente.",
      );

      // Optionally reload the page to ensure clean state
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (err) {
      console.error("Error removing signature:", err);
      const errorMessage =
        err instanceof Error ? err.message : "Erro desconhecido";
      setError(`Erro ao remover assinatura: ${errorMessage}`);

      // Show detailed error message
      alert(
        `❌ Erro ao remover assinatura:\n\n${errorMessage}\n\nTente novamente ou contate o suporte.`,
      );
    } finally {
      setIsRemoving(false);
    }
  };

  const updateContractContentWithSignature = async (
    contractId: string,
    signatureId: string,
    signatureUrl: string,
    signerName: string,
    signerCPF: string,
  ) => {
    try {
      // Get current contract content
      const { data: contractData, error: fetchError } = await supabase
        .from("contracts")
        .select("contract_content")
        .eq("id", parseInt(contractId))
        .single();

      if (fetchError) {
        console.error("Error fetching contract content:", fetchError);
        return;
      }

      let updatedContent = contractData.contract_content || "";

      // Replace the signature field placeholder with the actual signature
      // Use a single comprehensive pattern to avoid duplication
      const signatureFieldPattern = new RegExp(
        `<div class="signature-field[^"]*"[^>]*data-signature-id="${signatureId}"[^>]*>[\\s\\S]*?</div>`,
        "g",
      );

      const signatureHtml = `
        <div class="signature-field-completed" data-signature-id="${signatureId}" style="border: 2px solid #10b981; padding: 20px; margin: 20px 0; background-color: #ecfdf5; text-align: center; border-radius: 8px;">
          <div style="margin-bottom: 15px;">
            <div style="margin-bottom: 10px;">
              <strong style="color: #059669; font-size: 16px;">✅ Assinatura Realizada</strong>
            </div>
            <div style="border: 2px solid #10b981; padding: 15px; background-color: white; display: inline-block; border-radius: 8px;">
              <img src="${signatureUrl}" alt="Assinatura de ${signerName}" style="max-width: 300px; max-height: 80px; display: block; margin: 0 auto;" />
            </div>
          </div>
          <div style="font-size: 14px; margin-top: 15px; background-color: rgba(16, 185, 129, 0.1); padding: 10px; border-radius: 6px;">
            <div style="margin-bottom: 5px;"><strong>👤 Nome:</strong> ${signerName}</div>
            <div style="margin-bottom: 5px;"><strong>🆔 CPF:</strong> ${signerCPF}</div>
            <div style="margin-top: 8px; font-size: 12px; color: #059669; font-weight: 500;">📅 Assinado em: ${new Date().toLocaleString("pt-BR")}</div>
          </div>
        </div>
      `;

      // Replace ALL occurrences of this signature field
      const originalContent = updatedContent;
      updatedContent = updatedContent.replace(
        signatureFieldPattern,
        signatureHtml,
      );

      const replaced = originalContent !== updatedContent;

      if (!replaced) {
        console.warn(`No signature field found with ID: ${signatureId}`);
        console.log(
          "Contract content:",
          updatedContent.substring(0, 500) + "...",
        );
      } else {
        console.log(
          `Signature field replaced successfully for ID: ${signatureId}`,
        );
      }

      // Update the contract content in the database
      const { error: updateError } = await supabase
        .from("contracts")
        .update({
          contract_content: updatedContent,
          updated_at: new Date().toISOString(),
        })
        .eq("id", parseInt(contractId));

      if (updateError) {
        console.error("Error updating contract content:", updateError);
        throw new Error(
          `Erro ao atualizar conteúdo do contrato: ${updateError.message}`,
        );
      }

      console.log("Contract content updated successfully with signature");
    } catch (error) {
      console.error("Error in updateContractContentWithSignature:", error);
      throw error;
    }
  };

  const renderContractWithPlaceholders = (content: string) => {
    if (!content) return "<p>Conteúdo do contrato não disponível.</p>";

    // Replace placeholders with interactive components
    let processedContent = content;

    // Replace {{nome_completo_cliente}} with actual name or input field
    if (signatureData.full_name.trim()) {
      processedContent = processedContent.replace(
        /{{nome_completo_cliente}}/g,
        `<span class="font-semibold text-blue-800">${signatureData.full_name}</span>`,
      );
    } else {
      processedContent = processedContent.replace(
        /{{nome_completo_cliente}}/g,
        `<div class="inline-block bg-blue-50 border-2 border-blue-300 rounded p-2 m-1">
          <span class="text-blue-800 font-medium">📝 NOME COMPLETO (preencha abaixo)</span>
        </div>`,
      );
    }

    // Replace {{cpf_cliente}} with actual CPF or input field
    if (signatureData.cpf.trim()) {
      processedContent = processedContent.replace(
        /{{cpf_cliente}}/g,
        `<span class="font-semibold text-green-800">${signatureData.cpf}</span>`,
      );
    } else {
      processedContent = processedContent.replace(
        /{{cpf_cliente}}/g,
        `<div class="inline-block bg-green-50 border-2 border-green-300 rounded p-2 m-1">
          <span class="text-green-800 font-medium">🆔 CPF (preencha abaixo)</span>
        </div>`,
      );
    }

    // Handle signature fields - show blank field if not signed, or actual signature if signed
    processedContent = processedContent.replace(
      /<div class="signature-field[^"]*"[^>]*data-signature-id="([^"]*)">([\s\S]*?)<\/div>/g,
      (match, signatureId, content) => {
        // Check if this is the current signature being processed
        const isCurrentSignature =
          signatureId &&
          signatureField &&
          signatureField.signature_id === signatureId;

        if (isCurrentSignature && signatureData.signature_data_url) {
          // Show actual signature for the current signer
          return `<div class="signature-field-completed" data-signature-id="${signatureId}" style="border: 2px solid #10b981; padding: 20px; margin: 20px 0; background-color: #ecfdf5; text-align: center; border-radius: 8px;">
            <div style="margin-bottom: 15px;">
              <div style="margin-bottom: 10px;">
                <strong style="color: #059669; font-size: 16px;">✅ Assinatura Realizada</strong>
              </div>
              <div style="border: 2px solid #10b981; padding: 15px; background-color: white; display: inline-block; border-radius: 8px;">
                <img src="${signatureData.signature_data_url}" alt="Assinatura de ${signatureData.full_name}" style="max-width: 300px; max-height: 80px; display: block; margin: 0 auto;" />
              </div>
            </div>
            <div style="font-size: 14px; margin-top: 15px; background-color: rgba(16, 185, 129, 0.1); padding: 10px; border-radius: 6px;">
              <div style="margin-bottom: 5px;"><strong>👤 Nome:</strong> ${signatureData.full_name}</div>
              <div style="margin-bottom: 5px;"><strong>🆔 CPF:</strong> ${signatureData.cpf}</div>
              <div style="margin-top: 8px; font-size: 12px; color: #059669; font-weight: 500;">📅 Assinado em: ${new Date().toLocaleString("pt-BR")}</div>
            </div>
          </div>`;
        } else {
          // Show blank signature field for pending signatures
          const signerName = signatureField?.signer_name || "Signatário";
          const signerCPF = signatureField?.signer_cpf
            ? signatureField.signer_cpf.replace(
                /(\d{3})(\d{3})(\d{3})(\d{2})/,
                "$1.$2.$3-$4",
              )
            : "CPF não informado";

          return `<div class="signature-field-pending" data-signature-id="${signatureId}" style="border: 2px dashed #ef4444; padding: 20px; margin: 20px 0; background-color: #fef2f2; text-align: center; border-radius: 8px;">
            <div style="margin-bottom: 15px;">
              <div style="margin-bottom: 10px;">
                <strong style="color: #dc2626; font-size: 16px;">✍️ Campo de Assinatura</strong>
              </div>
              <div style="border: 2px dashed #ef4444; padding: 20px; background-color: white; display: inline-block; border-radius: 8px; min-width: 300px; min-height: 80px; display: flex; align-items: center; justify-content: center;">
                <span style="color: #ef4444; font-weight: bold;">AGUARDANDO ASSINATURA</span>
              </div>
            </div>
            <div style="font-size: 14px; margin-top: 15px; background-color: rgba(239, 68, 68, 0.1); padding: 10px; border-radius: 6px;">
              <div style="margin-bottom: 5px;"><strong>👤 Nome:</strong> ${signerName}</div>
              <div style="margin-bottom: 5px;"><strong>🆔 CPF:</strong> ${signerCPF}</div>
              <div style="margin-top: 8px; font-size: 12px; color: #dc2626; font-weight: 500;">⚠️ Aguardando assinatura</div>
            </div>
          </div>`;
        }
      },
    );

    // Also handle signature-field-placeholder patterns (from editor)
    processedContent = processedContent.replace(
      /<div class="signature-field-placeholder"[^>]*data-signature-id="([^"]*)">([\s\S]*?)<\/div>/g,
      (match, signatureId, content) => {
        // Check if this is the current signature being processed
        const isCurrentSignature =
          signatureId &&
          signatureField &&
          signatureField.signature_id === signatureId;

        if (isCurrentSignature && signatureData.signature_data_url) {
          // Show actual signature for the current signer
          return `<div class="signature-field-completed" data-signature-id="${signatureId}" style="border: 2px solid #10b981; padding: 20px; margin: 20px 0; background-color: #ecfdf5; text-align: center; border-radius: 8px;">
            <div style="margin-bottom: 15px;">
              <div style="margin-bottom: 10px;">
                <strong style="color: #059669; font-size: 16px;">✅ Assinatura Realizada</strong>
              </div>
              <div style="border: 2px solid #10b981; padding: 15px; background-color: white; display: inline-block; border-radius: 8px;">
                <img src="${signatureData.signature_data_url}" alt="Assinatura de ${signatureData.full_name}" style="max-width: 300px; max-height: 80px; display: block; margin: 0 auto;" />
              </div>
            </div>
            <div style="font-size: 14px; margin-top: 15px; background-color: rgba(16, 185, 129, 0.1); padding: 10px; border-radius: 6px;">
              <div style="margin-bottom: 5px;"><strong>👤 Nome:</strong> ${signatureData.full_name}</div>
              <div style="margin-bottom: 5px;"><strong>🆔 CPF:</strong> ${signatureData.cpf}</div>
              <div style="margin-top: 8px; font-size: 12px; color: #059669; font-weight: 500;">📅 Assinado em: ${new Date().toLocaleString("pt-BR")}</div>
            </div>
          </div>`;
        } else {
          // Show blank signature field for pending signatures
          const signerName = signatureField?.signer_name || "Signatário";
          const signerCPF = signatureField?.signer_cpf
            ? signatureField.signer_cpf.replace(
                /(\d{3})(\d{3})(\d{3})(\d{2})/,
                "$1.$2.$3-$4",
              )
            : "CPF não informado";

          return `<div class="signature-field-pending" data-signature-id="${signatureId}" style="border: 2px dashed #ef4444; padding: 20px; margin: 20px 0; background-color: #fef2f2; text-align: center; border-radius: 8px;">
            <div style="margin-bottom: 15px;">
              <div style="margin-bottom: 10px;">
                <strong style="color: #dc2626; font-size: 16px;">✍️ Campo de Assinatura</strong>
              </div>
              <div style="border: 2px dashed #ef4444; padding: 20px; background-color: white; display: inline-block; border-radius: 8px; min-width: 300px; min-height: 80px; display: flex; align-items: center; justify-content: center;">
                <span style="color: #ef4444; font-weight: bold;">AGUARDANDO ASSINATURA</span>
              </div>
            </div>
            <div style="font-size: 14px; margin-top: 15px; background-color: rgba(239, 68, 68, 0.1); padding: 10px; border-radius: 6px;">
              <div style="margin-bottom: 5px;"><strong>👤 Nome:</strong> ${signerName}</div>
              <div style="margin-bottom: 5px;"><strong>🆔 CPF:</strong> ${signerCPF}</div>
              <div style="margin-top: 8px; font-size: 12px; color: #dc2626; font-weight: 500;">⚠️ Aguardando assinatura</div>
            </div>
          </div>`;
        }
      },
    );

    return processedContent;
  };

  const renderContractContentWithHTML = (content: string) => {
    const htmlContent = renderContractWithPlaceholders(content);
    return { __html: htmlContent };
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-red-600" />
          <p className="text-gray-600">Carregando contrato...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <AlertCircle className="h-5 w-5" />
              {error.includes("já foi assinado")
                ? "Contrato Já Assinado"
                : "Erro"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-700 mb-4">{error}</p>
            {error.includes("já foi assinado") && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
                <div className="flex items-center gap-2 text-green-800">
                  <CheckCircle className="h-4 w-4" />
                  <span className="text-sm font-medium">
                    ✅ Assinatura já realizada
                  </span>
                </div>
                <p className="text-xs text-green-700 mt-1">
                  Este link não permite nova assinatura pela mesma pessoa.
                </p>
              </div>
            )}
            <Button
              onClick={() => navigate("/")}
              variant="outline"
              className="w-full"
            >
              Voltar ao Início
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!contract) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Contrato Não Encontrado
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-700 mb-4">
              O contrato solicitado não foi encontrado ou não está disponível
              para assinatura.
            </p>
            <Button
              onClick={() => navigate("/")}
              variant="outline"
              className="w-full"
            >
              Voltar ao Início
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isFormValid =
    canSign &&
    signatureData.full_name.trim() &&
    signatureData.cpf.trim() &&
    validateCPF(signatureData.cpf) &&
    signatureData.signature_data_url;

  return (
    <div className="min-h-screen bg-background">
      {/* CSS para garantir consistência com TinyMCE e responsividade */}
      <style>{`
        .contract-content table {
          border-collapse: collapse !important;
          width: 100% !important;
          min-width: 100% !important;
          max-width: 100% !important;
          table-layout: fixed !important;
          font-size: clamp(10px, 2vw, 14px);
          margin: 1em 0 !important;
        }
        .contract-content table td, 
        .contract-content table th {
          border: 1px solid #ddd !important;
          padding: clamp(6px, 1.5vw, 12px) !important;
          word-wrap: break-word !important;
          min-width: 100px !important;
          width: auto !important;
          box-sizing: border-box !important;
        }
        .contract-content table th {
          background-color: #f2f2f2 !important;
          font-weight: bold !important;
        }
        .contract-content table tr:nth-child(even) {
          background-color: #f9f9f9 !important;
        }
        .contract-content table tr:hover {
          background-color: #f5f5f5 !important;
        }
        .contract-content p {
          margin: 0 0 1em 0;
          word-wrap: break-word;
          hyphens: auto;
        }
        .contract-content h1, 
        .contract-content h2, 
        .contract-content h3, 
        .contract-content h4, 
        .contract-content h5, 
        .contract-content h6 {
          word-wrap: break-word;
          margin-top: 1.5em;
          margin-bottom: 0.5em;
        }
        .contract-content ul, 
        .contract-content ol {
          padding-left: clamp(16px, 4vw, 24px);
        }
        .contract-content li {
          margin-bottom: 0.5em;
          word-wrap: break-word;
        }
        @media (max-width: 640px) {
          .contract-content {
            font-size: 14px !important;
            line-height: 1.5 !important;
          }
          .contract-content table {
            font-size: 12px !important;
            width: 100% !important;
            table-layout: fixed !important;
          }
          .contract-content table td, 
          .contract-content table th {
            padding: 6px 4px !important;
            border: 1px solid #ddd !important;
          }
        }
        @media print {
          .contract-content {
            font-size: 12px !important;
            line-height: 1.4 !important;
          }
          .contract-content table {
            font-size: 10px !important;
            width: 100% !important;
            table-layout: fixed !important;
          }
          .contract-content table td, 
          .contract-content table th {
            padding: 4px 2px !important;
            border: 1px solid #ddd !important;
          }
          .contract-content h1, 
          .contract-content h2, 
          .contract-content h3, 
          .contract-content h4, 
          .contract-content h5, 
          .contract-content h6 {
            margin-top: 1em;
            margin-bottom: 0.5em;
            page-break-after: avoid;
          }
          .contract-content p {
            margin-bottom: 0.8em;
            orphans: 3;
            widows: 3;
          }
        }
      `}</style>

      {/* Company Header */}
      {generalSettings && (
        <div className="bg-white border-b print:border-b-2 print:border-gray-300">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 print:py-4 print:px-0">
            <div className="flex items-center justify-center gap-8 sm:gap-12 lg:gap-16 print:gap-4 print:justify-between">
              {/* Logo - Esquerda */}
              <div className="flex-shrink-0 print:w-1/2 print:flex print:justify-center print:items-center">
                {getLogoUrl() ? (
                  <img
                    src={getLogoUrl()!}
                    alt="Logo da empresa"
                    className="h-16 sm:h-20 lg:h-24 print:h-32 print:w-auto print:max-w-full object-contain"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                ) : (
                  <div className="h-16 sm:h-20 lg:h-24 print:h-32 print:w-32 rounded-md bg-red-600 flex items-center justify-center">
                    <Building className="h-8 sm:h-10 lg:h-12 print:h-16 print:w-16 text-white" />
                  </div>
                )}
              </div>
              
              {/* Informações da empresa - Direita */}
              <div className="text-left print:w-1/2 print:flex print:flex-col print:justify-center">
                <div className="text-xs sm:text-sm print:text-sm text-gray-600 space-y-1 sm:space-y-2 print:space-y-2">
                  <p className="font-semibold text-sm sm:text-base lg:text-lg print:text-base print:font-bold">
                    {generalSettings.company_name}
                  </p>
                  <p className="text-xs sm:text-sm print:text-sm">CNPJ: {generalSettings.company_cnpj}</p>
                  <div className="flex flex-col gap-1 text-xs sm:text-sm print:text-sm print:gap-2">
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3 sm:h-4 sm:w-4 print:h-4 print:w-4" />
                      <span>{generalSettings.company_address}</span>
                    </span>
                  </div>
                  <div className="flex flex-col gap-1 text-xs sm:text-sm print:text-sm print:gap-2">
                    <span className="flex items-center gap-1">
                      <Phone className="h-3 w-3 sm:h-4 sm:w-4 print:h-4 print:w-4" />
                      {generalSettings.company_phone}
                    </span>
                    <span className="flex items-center gap-1">
                      <Mail className="h-3 w-3 sm:h-4 sm:w-4 print:h-4 print:w-4" />
                      {generalSettings.company_email}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="bg-white border-b shadow-sm print:hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
          <div className="flex items-center gap-3">
            <FileText className="h-6 w-6 sm:h-8 sm:w-8 text-red-600" />
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
                {signatureId
                  ? "Assinatura Eletrônica"
                  : "Assinatura do Contrato"}{" "}
                {contract.contract_code}
              </h1>
              <p className="text-xs sm:text-sm text-gray-600">
                {signatureId && signatureField ? (
                  <>Assinante: {signatureField.signer_name}</>
                ) : (
                  <>Cliente: {contract.client.full_name}</>
                )}
              </p>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6 sm:space-y-8">
        {/* Instructions */}
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {signatureId
              ? "Para completar sua assinatura eletrônica, verifique seus dados pré-preenchidos e assine digitalmente."
              : "Para finalizar este contrato, você precisa preencher seus dados e assinar digitalmente. Os campos destacados no contrato abaixo devem ser preenchidos nos formulários desta página."}
          </AlertDescription>
        </Alert>

        {/* Contract Content */}
        <Card className="print:border-0 print:shadow-none">
          <CardHeader className="print:hidden">
            <CardTitle className="flex items-center gap-2 text-sm sm:text-base lg:text-lg">
              <FileText className="h-5 w-5" />
              Conteúdo do Contrato
            </CardTitle>
          </CardHeader>
          <CardContent className="print:p-0">
            <div
              className="contract-content prose prose-sm sm:prose-base lg:prose-lg max-w-none p-4 sm:p-6 rounded-md bg-white print:p-0 print:bg-transparent"
              style={{
                fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif",
                fontSize: "clamp(12px, 2.5vw, 16px)",
                lineHeight: "1.6",
                color: "#333"
              }}
              dangerouslySetInnerHTML={renderContractContentWithHTML(contract.contract_content)}
            />
          </CardContent>
        </Card>

        {/* Form Fields - Only show when signature is pending */}
        {signatureStatus === "pending" && (
          <div className="grid gap-6 md:grid-cols-2">
            {/* Personal Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Dados Pessoais
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="full_name">Nome Completo *</Label>
                  <Input
                    id="full_name"
                    type="text"
                    value={signatureData.full_name}
                    onChange={(e) =>
                      handleInputChange("full_name", e.target.value)
                    }
                    placeholder="Digite seu nome completo"
                    className={
                      validationErrors.full_name ? "border-red-500" : ""
                    }
                  />
                  {validationErrors.full_name && (
                    <p className="text-sm text-red-600 mt-1">
                      {validationErrors.full_name}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="cpf">CPF *</Label>
                  <Input
                    id="cpf"
                    type="text"
                    value={signatureData.cpf}
                    onChange={(e) => handleInputChange("cpf", e.target.value)}
                    placeholder="000.000.000-00"
                    maxLength={14}
                    className={validationErrors.cpf ? "border-red-500" : ""}
                  />
                  {validationErrors.cpf && (
                    <p className="text-sm text-red-600 mt-1">
                      {validationErrors.cpf}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Document Upload and Signature */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PenTool className="h-5 w-5" />
                  Assinatura Digital
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Assinatura Digital *</Label>
                  {signatureStatus === "pending" ? (
                    <>
                      <Button
                        type="button"
                        variant={
                          signatureData.signature_data_url
                            ? "default"
                            : "outline"
                        }
                        onClick={() => setIsSignatureModalOpen(true)}
                        disabled={!canSign}
                        className={`w-full mt-1 ${signatureData.signature_data_url ? "bg-green-600 hover:bg-green-700" : ""} ${validationErrors.signature ? "border-red-500" : ""} ${!canSign ? "opacity-50 cursor-not-allowed" : ""}`}
                      >
                        <PenTool className="mr-2 h-4 w-4" />
                        {!canSign
                          ? "Assinatura Não Disponível"
                          : signatureData.signature_data_url
                            ? "Assinatura Capturada"
                            : "Clique para Assinar"}
                      </Button>
                      {validationErrors.signature && (
                        <p className="text-sm text-red-600 mt-1">
                          {validationErrors.signature}
                        </p>
                      )}

                      {signatureData.signature_data_url && (
                        <div className="mt-2 p-2 border rounded">
                          <img
                            src={signatureData.signature_data_url}
                            alt="Assinatura"
                            className="max-w-full h-20 object-contain"
                          />
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="mt-2 p-4 bg-green-50 border-2 border-green-300 rounded-lg">
                      <div className="flex items-center gap-3">
                        <CheckCircle className="h-6 w-6 text-green-600" />
                        <div>
                          <div className="font-semibold text-green-800">
                            ✅ Assinatura Realizada
                          </div>
                          <div className="text-sm text-green-700">
                            Sua assinatura foi processada com sucesso
                          </div>
                        </div>
                      </div>
                      <div className="mt-3 p-3 bg-white border border-green-200 rounded">
                        <img
                          src={signatureData.signature_data_url}
                          alt="Assinatura"
                          className="max-w-full h-20 object-contain mx-auto"
                        />
                      </div>
                      <div className="mt-2 text-xs text-green-600">
                        <div>
                          <strong>Nome:</strong> {signatureData.full_name}
                        </div>
                        <div>
                          <strong>CPF:</strong> {signatureData.cpf}
                        </div>
                        <div>
                          <strong>Data:</strong>{" "}
                          {signatureField?.signed_at
                            ? new Date(signatureField.signed_at).toLocaleString(
                                "pt-BR",
                              )
                            : new Date().toLocaleString("pt-BR")}
                        </div>
                      </div>
                      {/* Remove Signature Button - Enhanced */}
                      <div className="mt-3 space-y-2">
                        <Button
                          onClick={handleRemoveSignature}
                          disabled={isRemoving}
                          variant="destructive"
                          size="sm"
                          className="w-full bg-red-600 hover:bg-red-700 text-white"
                        >
                          {isRemoving ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Removendo Assinatura...
                            </>
                          ) : (
                            <>
                              <Trash2 className="mr-2 h-4 w-4" />
                              Remover Assinatura Completamente
                            </>
                          )}
                        </Button>
                        <p className="text-xs text-red-600 text-center font-medium">
                          ⚠️ ATENÇÃO: Esta ação removerá permanentemente:
                          <br />• A assinatura do documento
                          <br />• Os dados do banco de dados
                          <br />• O arquivo de imagem do armazenamento
                          <br />
                          Esta ação NÃO PODE ser desfeita!
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Submit Button - Only show when signature is pending */}
        {signatureStatus === "pending" && (
          <Card>
            <CardContent className="pt-6">
              <Button
                onClick={handleSubmit}
                disabled={!isFormValid || isSubmitting}
                className="w-full bg-red-600 hover:bg-red-700 text-white py-3 text-lg"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Processando Assinatura...
                  </>
                ) : (
                  <>
                    <CheckCircle className="mr-2 h-5 w-5" />
                    Finalizar e Assinar Contrato
                  </>
                )}
              </Button>

              {!isFormValid && (
                <p className="text-sm text-gray-500 text-center mt-2">
                  {!canSign
                    ? "Esta assinatura não está disponível no momento"
                    : "Preencha todos os campos obrigatórios para continuar"}
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Success Message */}
        {signatureStatus === "success" && (
          <Card className="border-green-300 bg-green-50">
            <CardContent className="pt-6">
              <div className="text-center">
                <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-green-800 mb-2">
                  Assinatura Realizada com Sucesso!
                </h3>
                <p className="text-green-700 mb-4">
                  Seu contrato foi assinado e está sendo processado. Você será
                  redirecionado em instantes.
                </p>
                <div className="bg-white border border-green-200 rounded-lg p-4 inline-block">
                  <div className="text-sm text-gray-600 mb-2">
                    Dados da Assinatura:
                  </div>
                  <div className="text-sm">
                    <div>
                      <strong>Nome:</strong> {signatureData.full_name}
                    </div>
                    <div>
                      <strong>CPF:</strong> {signatureData.cpf}
                    </div>
                    <div>
                      <strong>Data:</strong>{" "}
                      {signatureField?.signed_at
                        ? new Date(signatureField.signed_at).toLocaleString(
                            "pt-BR",
                          )
                        : new Date().toLocaleString("pt-BR")}
                    </div>
                  </div>
                  {/* Remove Signature Button - Enhanced */}
                  {signatureId && signatureField && (
                    <div className="mt-4 space-y-2">
                      <Button
                        onClick={handleRemoveSignature}
                        disabled={isRemoving}
                        variant="destructive"
                        size="sm"
                        className="w-full bg-red-600 hover:bg-red-700 text-white"
                      >
                        {isRemoving ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Removendo Assinatura...
                          </>
                        ) : (
                          "🗑️ Remover Assinatura Permanentemente"
                        )}
                      </Button>
                      <p className="text-xs text-red-600 text-center">
                        Esta ação removerá a assinatura do documento, banco de
                        dados e armazenamento.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Signature Modal - Only show when signature is pending */}
      {signatureStatus === "pending" && (
        <SignatureCanvas
          isOpen={isSignatureModalOpen}
          onClose={() => setIsSignatureModalOpen(false)}
          onConfirm={handleSignatureConfirm}
          title="Desenhe sua assinatura"
        />
      )}
    </div>
  );
};

export default SignaturePage;
