import React, { useState } from "react";
import { supabase, authService, representativeService } from "@/lib/supabase";
import CommissionTableSelection from "./CommissionTableSelection";
import CreditValueSelection from "./CreditValueSelection";
import QuotaSelection from "./QuotaSelection";
import ClientRegistration from "./ClientRegistration";
import ContractContentEditor from "./ContractContentEditor";
import RepresentativeSelection from "./RepresentativeSelection";

interface CommissionPlan {
  id: number;
  nome: string;
  descricao: string;
  ativo: boolean;
}

interface CreditRange {
  id: number;
  plano_id: number;
  valor_credito: number;
  valor_primeira_parcela: number;
  valor_parcelas_restantes: number;
  numero_total_parcelas: number;
}

interface Group {
  id: number;
  name: string;
  description: string;
}

interface Quota {
  id: number;
  group_id: number;
  quota_number: number;
  status: string;
}

interface ClientData {
  full_name: string;
  email: string;
  phone: string;
  cpf_cnpj: string;
  address: string;
}

type FlowStep =
  | "representative-selection"
  | "table-selection"
  | "credit-selection"
  | "quota-selection"
  | "client-registration"
  | "contract-content"
  | "completed";

interface ContractCreationFlowProps {
  onComplete?: () => void;
  isAdminMode?: boolean;
}

const ContractCreationFlow: React.FC<ContractCreationFlowProps> = ({
  onComplete,
  isAdminMode = false,
}) => {
  const [currentStep, setCurrentStep] = useState<FlowStep>(
    isAdminMode ? "representative-selection" : "table-selection",
  );
  const [selectedRepresentative, setSelectedRepresentative] =
    useState<any>(null);
  const [selectedPlan, setSelectedPlan] = useState<CommissionPlan | null>(null);
  const [selectedCreditRange, setSelectedCreditRange] =
    useState<CreditRange | null>(null);
  const [selectedQuota, setSelectedQuota] = useState<Quota | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [clientData, setClientData] = useState<ClientData | null>(null);
  const [contractContent, setContractContent] = useState<string>("");

  const handleRepresentativeSelect = (representative: any) => {
    setSelectedRepresentative(representative);
    setCurrentStep("table-selection");
  };

  const handlePlanSelect = (plan: CommissionPlan) => {
    setSelectedPlan(plan);
    setCurrentStep("credit-selection");
  };

  const handleCreditSelect = (creditRange: CreditRange) => {
    setSelectedCreditRange(creditRange);
    setCurrentStep("quota-selection");
  };

  const handleQuotaSelect = (quota: Quota, group: Group) => {
    setSelectedQuota(quota);
    setSelectedGroup(group);
    setCurrentStep("client-registration");
  };

  const handleClientSubmit = (clientData: ClientData) => {
    setClientData(clientData);
    setCurrentStep("contract-content");
  };

  const handleContractContentSubmit = (content: string) => {
    setContractContent(content);
    createContract(content);
  };

  const createContract = async (contentToSave?: string) => {
    try {
      if (!clientData) {
        throw new Error("Dados do cliente não encontrados");
      }

      // Get current user - different logic for admin vs representative
      let currentUser;
      
      if (isAdminMode) {
        // For admin mode, get admin user info
        currentUser = await authService.getCurrentUser();
        if (!currentUser) {
          // Try old auth service for admins
          const { authService: oldAuthService } = await import("../../lib/supabase");
          currentUser = oldAuthService.getCurrentUser();
        }
        
        // If still no user, try to get from session
        if (!currentUser) {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            currentUser = { id: user.id, email: user.email };
          }
        }
      } else {
        // For representative mode, use existing logic
        currentUser = await authService.getCurrentUser();
        if (!currentUser) {
          const { authService: oldAuthService } = await import("../../lib/supabase");
          currentUser = oldAuthService.getCurrentUser();
        }
      }
      
      if (!currentUser) throw new Error("User not authenticated");

      // Determine the representative for the contract
      let contractRepresentativeId = currentUser.id;

      if (isAdminMode) {
        // If admin mode and a representative is selected, use that representative
        if (selectedRepresentative) {
          contractRepresentativeId = selectedRepresentative.id;
        }
        // If no representative selected, admin creates contract under their own name
      } else {
        // For regular representatives, get fresh data from database
        console.log("Contract creation - fetching fresh representative data for:", currentUser.id);
        
        const { data: freshRepresentative, error: repError } = await supabase
          .from('profiles')
          .select('id, status, documents_approved')
          .eq('id', currentUser.id)
          .single();

        if (repError) {
          console.error("Error fetching representative data:", repError);
          throw new Error("Erro ao verificar status do representante");
        }

        if (!freshRepresentative) {
          throw new Error("Representante não encontrado");
        }

        console.log("Contract creation - fresh representative data:", {
          userId: freshRepresentative.id,
          userStatus: freshRepresentative.status,
          documentsApproved: freshRepresentative.documents_approved,
        });

        // Check if representative is active
        if (freshRepresentative.status !== "Ativo") {
          throw new Error(
            "Perfil não está ativo. Entre em contato com o administrador.",
          );
        }

        // Check if documents are approved
        if (!freshRepresentative.documents_approved) {
          throw new Error(
            "Documentos não aprovados. Entre em contato com o administrador.",
          );
        }
      }

      // Parse address components from the full address string
      const addressParts = clientData.address.split(", ");
      const [street, number, complement, neighborhood, cityState, zip] =
        addressParts;
      const [city, state] = cityState ? cityState.split(" - ") : ["", ""];

      // Check if client already exists
      let clientId: number;
      const { data: existingClient } = await supabase
        .from("clients")
        .select("id")
        .eq("email", clientData.email)
        .single();

      if (existingClient) {
        // Update existing client - using correct column names from database schema
        const { error: updateError } = await supabase
          .from("clients")
          .update({
            full_name: clientData.full_name, // Using correct column name from schema
            phone: clientData.phone,
            cpf_cnpj: clientData.cpf_cnpj,
            address: clientData.address, // Using single address field as per schema
          })
          .eq("id", existingClient.id);

        if (updateError) throw updateError;
        clientId = existingClient.id;
      } else {
        // Create new client - using correct column names from database schema
        const { data: newClient, error: clientError } = await supabase
          .from("clients")
          .insert([
            {
              full_name: clientData.full_name, // Using correct column name from schema
              email: clientData.email,
              phone: clientData.phone,
              cpf_cnpj: clientData.cpf_cnpj,
              address: clientData.address, // Using single address field as per schema
            },
          ])
          .select("id")
          .single();

        if (clientError) throw clientError;
        clientId = newClient.id;
      }

      // Generate contract number
      const contractNumber = `CONT-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

      // Usar o ID do plano selecionado diretamente
      const planId = selectedPlan!.id;

      // Create contract using the correct schema from the migration
      const { data: contract, error: contractError } = await supabase
        .from("contracts")
        .insert([
          {
            contract_code: contractNumber, // Using 'contract_code' as per schema
            representative_id: contractRepresentativeId,
            client_id: clientId, // Already a number
            commission_table_id: planId, // Usar o ID do plano selecionado
            id_faixa_de_credito: selectedCreditRange!.id, // Salvar ID da faixa de crédito
            quota_id: selectedQuota!.id, // Salvar como integer, não string
            credit_amount: selectedCreditRange!.valor_credito.toString(),
            total_value: selectedCreditRange!.valor_credito.toString(),
            remaining_value: (
              selectedCreditRange!.valor_credito * 0.98
            ).toString(), // Sample remaining amount (98% of total)
            total_installments: selectedCreditRange!.numero_total_parcelas,
            first_payment:
              selectedCreditRange!.valor_primeira_parcela.toString(),
            remaining_payments:
              selectedCreditRange!.valor_parcelas_restantes.toString(),
            paid_installments: 0,
            status: "Pendente",
            contract_content: contentToSave || contractContent, // Save the HTML content
          },
        ])
        .select("id")
        .single();

      if (contractError) {
        console.error("Contract creation error:", contractError);
        throw contractError;
      }

      // Update quota status to 'Ocupada' and link to contract
      const { error: quotaError } = await supabase
        .from("quotas")
        .update({
          status: "Ocupada",
          contract_id: contract.id,
          representative_id: contractRepresentativeId,
          assigned_at: new Date().toISOString(),
          reserved_at: null,
          reserved_by: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", selectedQuota!.id);

      if (quotaError) {
        console.error("Quota update error:", quotaError);
        throw quotaError;
      }

      setCurrentStep("completed");

      // Show success message
      alert(`Contrato ${contractNumber} criado com sucesso!`);

      if (onComplete) {
        onComplete();
      }
    } catch (error) {
      console.error("Error creating contract:", error);
      alert(`Erro ao criar contrato: ${error.message || "Tente novamente."}`);
    }
  };

  const handleBackToRepresentativeSelection = () => {
    setCurrentStep("representative-selection");
    setSelectedRepresentative(null);
  };

  const handleBackToTableSelection = () => {
    if (isAdminMode) {
      setCurrentStep("representative-selection");
    } else {
      setCurrentStep("table-selection");
    }
    setSelectedPlan(null);
  };

  const handleBackToCreditSelection = () => {
    setCurrentStep("credit-selection");
    setSelectedCreditRange(null);
  };

  const handleBackToQuotaSelection = () => {
    setCurrentStep("quota-selection");
  };

  const handleBackToClientRegistration = () => {
    setCurrentStep("client-registration");
  };

  if (currentStep === "completed") {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-green-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Contrato Criado com Sucesso!
          </h2>
          <p className="text-gray-600 mb-6">
            O contrato foi registrado no sistema e está aguardando aprovação.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg"
          >
            Voltar ao Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      {currentStep === "representative-selection" && isAdminMode && (
        <div className="p-6">
          <RepresentativeSelection
            onRepresentativeSelect={handleRepresentativeSelect}
            onSkip={() => setCurrentStep("table-selection")}
          />
        </div>
      )}

      {currentStep === "table-selection" && (
        <div className="p-6">
          <CommissionTableSelection
            onTableSelect={handlePlanSelect}
            onBack={
              isAdminMode ? handleBackToRepresentativeSelection : undefined
            }
          />
        </div>
      )}

      {currentStep === "credit-selection" && selectedPlan && (
        <div className="p-6">
          <CreditValueSelection
            selectedPlan={selectedPlan}
            onCreditSelect={handleCreditSelect}
            onBack={handleBackToTableSelection}
          />
        </div>
      )}

      {currentStep === "quota-selection" &&
        selectedPlan &&
        selectedCreditRange && (
          <div className="p-6">
            <QuotaSelection
              selectedPlan={selectedPlan}
              selectedCreditRange={selectedCreditRange}
              onQuotaSelect={handleQuotaSelect}
              onBack={handleBackToCreditSelection}
            />
          </div>
        )}

      {currentStep === "client-registration" &&
        selectedPlan &&
        selectedCreditRange &&
        selectedQuota &&
        selectedGroup && (
          <div className="p-6">
            <ClientRegistration
              selectedPlan={selectedPlan}
              selectedCreditRange={selectedCreditRange}
              selectedQuota={selectedQuota}
              selectedGroup={selectedGroup}
              onClientSubmit={handleClientSubmit}
              onBack={handleBackToQuotaSelection}
            />
          </div>
        )}

      {currentStep === "contract-content" &&
        selectedPlan &&
        selectedCreditRange &&
        selectedQuota &&
        selectedGroup &&
        clientData && (
          <div className="p-6">
            <ContractContentEditor
              selectedPlan={selectedPlan}
              selectedCreditRange={selectedCreditRange}
              selectedQuota={selectedQuota}
              selectedGroup={selectedGroup}
              clientData={clientData}
              onContentSubmit={handleContractContentSubmit}
              onBack={handleBackToClientRegistration}
            />
          </div>
        )}
    </div>
  );
};

export default ContractCreationFlow;
