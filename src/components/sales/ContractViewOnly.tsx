import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  FileText,
  Download,
  AlertCircle,
  Building,
  Phone,
  Mail,
  MapPin,
} from "lucide-react";
import {
  supabase,
  contractService,
  generalSettingsService,
  electronicSignatureService,
} from "@/lib/supabase";
import { mergePlaceholders, MergeData } from "@/lib/merge-fields";
import { getUploadServerBaseUrl } from "@/lib/invoice-asaas.client";
import { Database } from "@/types/supabase";

type ContractStatus = Database["public"]["Enums"]["contract_status"];

interface ContractData {
  id: number;
  contract_code: string;
  contract_number?: string | null;
  total_value: number;
  status: ContractStatus;
  created_at: string;
  contract_content: string | null;
  total_installments: number;
  credit_amount?: number;
  id_faixa_de_credito?: number | null;
  client: {
    id: number;
    full_name: string;
    email: string | null;
    phone: string | null;
    cpf_cnpj: string | null;
    address: string | null;
    city?: string;
    state?: string;
    zip_code?: string;
    rg?: string | null;
    birth_date?: string | null;
    nationality?: string | null;
    marital_status?: string | null;
    spouse_name?: string | null;
    spouse_phone?: string | null;
    company?: string | null;
    salary?: string | null;
    position?: string | null;
    reference_name?: string | null;
    reference_address?: string | null;
    reference_phone?: string | null;
    address_street?: string | null;
    address_number?: string | null;
    address_complement?: string | null;
    address_neighborhood?: string | null;
    address_city?: string | null;
    address_state?: string | null;
    address_zip?: string | null;
  };
  commission_table: {
    id: number;
    name: string;
    commission_percentage: number;
  };
  representative: {
    id: string;
    full_name: string;
    email: string;
    phone: string | null;
  };
  quota?: {
    id: number;
    quota_number: number;
    group?: {
      id: number;
      name: string;
      description?: string | null;
    };
  } | null;
  mergeExtras?: {
    firstInstallmentValue?: number;
    remainingInstallmentsValue?: number;
    customInstallmentsText?: string;
    groupName?: string;
    totalInstallmentsCount?: number;
    remainingInstallmentsCount?: number;
    customInstallmentsCount?: number;
    quotaNumber?: string;
  };
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

const ContractViewOnly: React.FC = () => {
  const { id: contractId } = useParams<{ id: string }>();
  const [contract, setContract] = useState<ContractData | null>(null);
  const [generalSettings, setGeneralSettings] =
    useState<GeneralSettings | null>(null);
  const [signatureLinks, setSignatureLinks] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!contractId) {
      setError("ID do contrato não fornecido");
      setIsLoading(false);
      return;
    }

    loadContractDetails();
    loadGeneralSettings();
  }, [contractId]);

  useEffect(() => {
    if (contract && contractId) {
      loadSignatureLinks();
    }
  }, [contract, contractId]);

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

  const loadSignatureLinks = async () => {
    if (!contractId) return;

    try {
      const links =
        await electronicSignatureService.generateSignatureLinks(contractId);
      setSignatureLinks(links);
    } catch (error) {
      console.error("Error loading signature links:", error);
      setSignatureLinks([]);
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
            address,
            address_street,
            address_number,
            address_complement,
            address_neighborhood,
            address_city,
            address_state,
            address_zip,
            rg,
            birth_date,
            nationality,
            marital_status,
            spouse_name,
            spouse_phone,
            company,
            salary,
            position,
            reference_name,
            reference_address,
            reference_phone
          ),
          planos!inner (
            id,
            nome,
            descricao,
            comissao
          ),
          profiles!inner (
            id,
            full_name,
            email,
            phone
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

      // Buscar dados da quota (para obter nome do grupo)
      let quotaData = null;
      if (data.quota_id) {
        const { data: quota, error: quotaError } = await supabase
          .from("quotas")
          .select(`
            id,
            quota_number,
            groups!inner (
              id,
              name,
              description
            )
          `)
          .eq("id", data.quota_id)
          .single();

        if (!quotaError) {
          quotaData = quota;
        }
      }

      // Buscar informações da faixa de crédito para campos de parcelas
      let firstInstallmentValue: number | undefined;
      let remainingInstallmentsValue: number | undefined;
      let customInstallmentsText = "";
      let customInstallmentsCount = 0;
      let groupName = quotaData?.groups?.name || "";

      if (data.id_faixa_de_credito) {
        const { data: creditRange } = await supabase
          .from("faixas_de_credito")
          .select("valor_primeira_parcela, valor_parcelas_restantes")
          .eq("id", data.id_faixa_de_credito)
          .single();

        if (creditRange) {
          firstInstallmentValue = creditRange.valor_primeira_parcela;
          remainingInstallmentsValue = creditRange.valor_parcelas_restantes;
        }

        const { data: customInstallments } = await supabase
          .from("condicoes_parcelas")
          .select("numero_parcela, valor_parcela")
          .eq("faixa_credito_id", data.id_faixa_de_credito)
          .order("numero_parcela");

        if (customInstallments && customInstallments.length > 0) {
          const sortedCustom = customInstallments
            .filter((c) => c.numero_parcela !== 1)
            .sort((a, b) => a.numero_parcela - b.numero_parcela);

          customInstallmentsCount = sortedCustom.length;

          if (sortedCustom.length > 0) {
            customInstallmentsText = sortedCustom
              .map((c) => {
                const formattedValue = new Intl.NumberFormat("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                }).format(c.valor_parcela);
                return `${c.numero_parcela}ª: ${formattedValue}`;
              })
              .join(" | ");
          }
        }
      }

      // Calcular quantidades de parcelas
      const totalInstallmentsCount = data.total_installments || 0;
      const remainingInstallmentsCount = totalInstallmentsCount - 1 - customInstallmentsCount; // Total - primeira - personalizadas
      
      // Obter número da cota
      const quotaNumber = quotaData?.quota_number?.toString() || '';

      const contractData: ContractData = {
        id: data.id,
        contract_code:
          data.contract_number || data.contract_code || `CONT-${data.id}`,
        contract_number: data.contract_number,
        total_value: parseFloat(data.total_value || data.credit_amount || "0"),
        total_installments: data.total_installments || 0,
        credit_amount: data.credit_amount
          ? parseFloat(data.credit_amount)
          : undefined,
        id_faixa_de_credito: data.id_faixa_de_credito || null,
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
          city: data.clients?.address_city || "",
          state: data.clients?.address_state || "",
          zip_code: data.clients?.address_zip || "",
          rg: data.clients?.rg,
          birth_date: data.clients?.birth_date,
          nationality: data.clients?.nationality,
          marital_status: data.clients?.marital_status,
          spouse_name: data.clients?.spouse_name,
          spouse_phone: data.clients?.spouse_phone,
          company: data.clients?.company,
          salary: data.clients?.salary,
          position: data.clients?.position,
          reference_name: data.clients?.reference_name,
          reference_address: data.clients?.reference_address,
          reference_phone: data.clients?.reference_phone,
          address_street: data.clients?.address_street,
          address_number: data.clients?.address_number,
          address_complement: data.clients?.address_complement,
          address_neighborhood: data.clients?.address_neighborhood,
        },
        commission_table: {
          id: data.planos?.id || 0,
          name: data.planos?.nome || "Plano não encontrado",
          commission_percentage:
            data.planos?.comissao || 0,
        },
        representative: {
          id: data.profiles?.id || "",
          full_name: data.profiles?.full_name || "Representante não encontrado",
          email: data.profiles?.email || "",
          phone: data.profiles?.phone,
        },
        quota: quotaData
          ? {
              id: quotaData.id,
              quota_number: quotaData.quota_number,
              group: quotaData.groups
                ? {
                    id: quotaData.groups.id,
                    name: quotaData.groups.name,
                    description: quotaData.groups.description,
                  }
                : undefined,
            }
          : null,
        mergeExtras: {
          firstInstallmentValue,
          remainingInstallmentsValue,
          customInstallmentsText,
          groupName,
          totalInstallmentsCount,
          remainingInstallmentsCount,
          customInstallmentsCount,
          quotaNumber,
        },
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

  const renderContractContentWithSignatures = (
    content: string,
    signatureLinks: any[],
  ) => {
    if (!content) return content;

    // Aplicar mesclagem de campos primeiro
    const mergeData: MergeData = {
      client: contract?.client
        ? {
            full_name: contract.client.full_name,
            email: contract.client.email || undefined,
            phone: contract.client.phone || undefined,
            cpf_cnpj: contract.client.cpf_cnpj || undefined,
            address: contract.client.address || undefined,
            city: contract.client.city,
            state: contract.client.state,
            zip_code: contract.client.zip_code,
            rg: contract.client.rg || undefined,
            birth_date: contract.client.birth_date
              ? new Date(contract.client.birth_date).toLocaleDateString("pt-BR")
              : undefined,
            nationality: contract.client.nationality || undefined,
            marital_status: contract.client.marital_status || undefined,
            spouse_name: contract.client.spouse_name || undefined,
            spouse_phone: contract.client.spouse_phone || undefined,
            company: contract.client.company || undefined,
            salary: contract.client.salary || undefined,
            position: contract.client.position || undefined,
            reference_name: contract.client.reference_name || undefined,
            reference_address: contract.client.reference_address || undefined,
            reference_phone: contract.client.reference_phone || undefined,
            address_street: contract.client.address_street || undefined,
            address_number: contract.client.address_number || undefined,
            address_complement: contract.client.address_complement || undefined,
            address_neighborhood:
              contract.client.address_neighborhood || undefined,
            address_city: contract.client.city,
            address_state: contract.client.state,
            address_zip: contract.client.zip_code,
          }
        : undefined,
      contract: contract
        ? {
            value: contract.total_value,
            installments: contract.total_installments,
            number: contract.contract_code,
            date: new Date(contract.created_at).toLocaleDateString("pt-BR"),
            status: contract.status,
            first_installment_value:
              contract.mergeExtras?.firstInstallmentValue,
            remaining_installments_value:
              contract.mergeExtras?.remainingInstallmentsValue,
            custom_installments: contract.mergeExtras?.customInstallmentsText,
            group_name:
              contract.mergeExtras?.groupName ||
              contract.quota?.group?.name ||
              "",
            // Campos de quantidade de parcelas
            total_installments_count: contract.mergeExtras?.totalInstallmentsCount,
            remaining_installments_count: contract.mergeExtras?.remainingInstallmentsCount,
            custom_installments_count: contract.mergeExtras?.customInstallmentsCount,
            // Número da cota
            quota_number: contract.mergeExtras?.quotaNumber || contract.quota?.quota_number?.toString() || '',
          }
        : undefined,
      representative: contract?.representative
        ? {
            name: contract.representative.full_name,
            email: contract.representative.email,
            phone: contract.representative.phone || undefined,
          }
        : undefined,
    };

    let processedContent = mergePlaceholders(content, mergeData);
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

  const handleDownloadPDF = () => {
    const contractContent = contract?.contract_content
      ? renderContractContentWithSignatures(
          contract.contract_content,
          signatureLinks,
        )
      : "<p>Conteúdo do contrato não disponível</p>";

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Contrato ${contract?.contract_code}</title>
          <meta charset="utf-8">
          <style>
            body {
              font-family: Arial, sans-serif;
              font-size: 12px;
              line-height: 1.4;
              margin: 0;
              padding: 15px;
              color: #333;
              max-width: 100%;
            }
            .header {
              text-align: center;
              border-bottom: 2px solid #dc2626;
              padding-bottom: 15px;
              margin-bottom: 20px;
            }
            .header h1 {
              font-size: 18px;
              margin: 10px 0;
            }
            .company-info {
              font-size: 11px;
              margin-bottom: 15px;
            }
            .contract-info {
              background-color: #f8f9fa;
              padding: 12px;
              border-radius: 6px;
              margin-bottom: 20px;
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 20px;
            }
            .contract-info h2 {
              font-size: 14px;
              margin: 0 0 10px 0;
              grid-column: 1 / -1;
            }
            .client-info, .contract-details {
              font-size: 11px;
            }
            .client-info h3, .contract-details h3 {
              font-size: 12px;
              margin: 0 0 8px 0;
              font-weight: bold;
            }
            .client-info p, .contract-details p {
              margin: 4px 0;
            }
            .content {
              margin-top: 20px;
              font-size: 11px;
              line-height: 1.3;
            }
            .content h1, .content h2, .content h3 {
              font-size: 13px;
            }
            .content h4, .content h5, .content h6 {
              font-size: 12px;
            }
            @media print {
              body {
                font-size: 10px;
                padding: 10px;
              }
              .header h1 {
                font-size: 16px;
              }
              .contract-info h2 {
                font-size: 12px;
              }
              .client-info h3, .contract-details h3 {
                font-size: 11px;
              }
              .content {
                font-size: 10px;
              }
            }
          </style>
        </head>
        <body>
          <div class="header">
            ${getLogoUrl() ? `<img src="${getLogoUrl()}" alt="Logo" style="height: 50px; margin-bottom: 8px;">` : ""}
            <h1>${generalSettings?.system_name || "CredCar"}</h1>
            <div class="company-info">
              <strong>${generalSettings?.company_name || "CredCar Soluções Financeiras"}</strong><br>
              CNPJ: ${generalSettings?.company_cnpj || "12.345.678/0001-90"}<br>
              ${generalSettings?.company_address || "Rua das Empresas, 123 - Centro - São Paulo/SP"}<br>
              Tel: ${generalSettings?.company_phone || "(11) 3000-0000"} | Email: ${generalSettings?.company_email || "contato@credcar.com.br"}
            </div>
            <div style="font-size: 14px; font-weight: bold; margin-top: 8px;">
              CONTRATO Nº ${contract?.contract_code || ""}
            </div>
          </div>
          
          <div class="contract-info">
            <h2>Informações do Contrato</h2>
            <div class="client-info">
              <h3>Informações do Cliente</h3>
              <p><strong>Nome:</strong> ${contract?.client.full_name}</p>
              ${contract?.client.email ? `<p><strong>Email:</strong> ${contract.client.email}</p>` : ""}
              ${contract?.client.phone ? `<p><strong>Telefone:</strong> ${contract.client.phone}</p>` : ""}
              ${contract?.client.cpf_cnpj ? `<p><strong>CPF/CNPJ:</strong> ${contract.client.cpf_cnpj}</p>` : ""}
              ${contract?.client.address ? `<p><strong>Endereço:</strong> ${contract.client.address}</p>` : ""}
            </div>
            <div class="contract-details">
              <h3>Detalhes do Contrato</h3>
              <p><strong>Código:</strong> ${contract?.contract_code}</p>
              <p><strong>Valor de Contrato:</strong> <span style="font-size: 16px; font-weight: bold; color: #dc2626;">${formatCurrency(contract?.total_value || 0)}</span></p>
              <p><strong>Status:</strong> ${contract?.status}</p>
              <p><strong>Data de Criação:</strong> ${formatDate(contract?.created_at || "")}</p>
            </div>
          </div>
          
          <div class="content">
            ${contractContent}
          </div>
        </body>
      </html>
    `;

    // Create a blob with the HTML content
    const blob = new Blob([htmlContent], { type: "text/html" });
    const url = URL.createObjectURL(blob);

    // Create a temporary link element and trigger download
    const link = document.createElement("a");
    link.href = url;
    link.download = `Contrato_${contract?.contract_code || "documento"}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Clean up the URL object
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando contrato...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-16 w-16 mx-auto mb-4 text-red-500" />
          <h2 className="text-xl font-semibold mb-2">
            Erro ao Carregar Contrato
          </h2>
          <p className="text-muted-foreground mb-4">{error}</p>
        </div>
      </div>
    );
  }

  if (!contract) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <FileText className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-xl font-semibold mb-2">
            Contrato Não Encontrado
          </h2>
          <p className="text-muted-foreground mb-4">
            O contrato solicitado não foi encontrado no sistema.
          </p>
        </div>
      </div>
    );
  }

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
                  {contract && (
                    <p className="font-bold text-sm sm:text-base print:text-base text-gray-900 pt-1 print:pt-2">
                      CONTRATO Nº {contract.contract_code}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Contract Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Contract Header */}
        <Card className="mb-6 sm:mb-8 print:hidden">
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-lg sm:text-xl lg:text-2xl">
                  Contrato {contract.contract_code}
                </CardTitle>
                <CardDescription className="text-sm sm:text-base">
                  Criado em {formatDate(contract.created_at)}
                </CardDescription>
              </div>
              <div className="flex items-center gap-3">
                {getStatusBadge(contract.status)}
                <Button
                  onClick={() => window.print()}
                  className="bg-red-600 hover:bg-red-700 print:hidden text-sm sm:text-base"
                >
                  <Download className="mr-2 h-4 w-4" />
                  Imprimir
                </Button>
              </div>
            </div>
          </CardHeader>
           <CardContent className="print:hidden">
             <div className="space-y-4 sm:space-y-6">
               <div>
                 <h3 className="font-semibold mb-3 print:text-sm text-sm sm:text-base">
                   Informações do Contrato
                 </h3>
                 <div className="space-y-2 text-xs sm:text-sm print:text-xs">
                   <p>
                     <strong>Valor de Contrato:</strong>{" "}
                     <span className="text-base sm:text-lg font-bold text-red-600">
                       {formatCurrency(contract.total_value)}
                     </span>
                   </p>
                 </div>
               </div>
               <div>
                 <h3 className="font-semibold mb-3 print:text-sm text-sm sm:text-base">
                   Informações do Cliente
                 </h3>
                 <div className="space-y-2 text-xs sm:text-sm print:text-xs">
                   <p>
                     <strong>Nome:</strong> {contract.client.full_name}
                   </p>
                   {contract.client.email && (
                     <p>
                       <strong>Email:</strong> {contract.client.email}
                     </p>
                   )}
                   {contract.client.phone && (
                     <p>
                       <strong>Telefone:</strong> {contract.client.phone}
                     </p>
                   )}
                   {contract.client.cpf_cnpj && (
                     <p>
                       <strong>CPF/CNPJ:</strong> {contract.client.cpf_cnpj}
                     </p>
                   )}
                   {contract.client.address && (
                     <p>
                       <strong>Endereço:</strong> {contract.client.address}
                     </p>
                   )}
                 </div>
               </div>
             </div>
           </CardContent>
        </Card>

        {/* Contract Content */}
        <Card className="print:border-0 print:shadow-none">
          <CardHeader className="print:hidden">
            <CardTitle className="text-sm sm:text-base lg:text-lg">Conteúdo do Contrato</CardTitle>
          </CardHeader>
          <CardContent className="print:p-0">
            {contract.contract_content ? (
              <div
                className="contract-content prose prose-sm sm:prose-base lg:prose-lg max-w-none p-4 sm:p-6 rounded-md bg-white print:p-0 print:bg-transparent"
                style={{
                  fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif",
                  fontSize: "clamp(12px, 2.5vw, 16px)",
                  lineHeight: "1.6",
                  color: "#333"
                }}
                dangerouslySetInnerHTML={{
                  __html: renderContractContentWithSignatures(
                    contract.contract_content,
                    signatureLinks,
                  ),
                }}
              />
            ) : (
              <div className="text-center py-8 print:hidden">
                <FileText className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                <p className="text-lg font-medium mb-2">
                  Conteúdo não disponível
                </p>
                <p className="text-muted-foreground">
                  O conteúdo deste contrato ainda não foi definido.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ContractViewOnly;
