import { supabase } from "./supabase";

export interface ContractCommission {
  contractId: number;
  contractCode: string;
  clientName: string;
  representativeId: string;
  representativeName: string;
  contractValue: number;
  commissionPercentage: number;
  commissionValue: number;
  status: string;
}

export interface RepresentativeCommissionReport {
  representativeId: string;
  representativeName: string;
  totalCommission: number;
  paidCommission: number;
  pendingCommission: number;
  contractsCount: number;
  period: string;
}

export interface CommissionHistory {
  id: string;
  contract: string;
  contractId: number;
  date: string;
  value: number;
  status: "available" | "requested" | "paid";
  dueDate?: string;
}

class CommissionService {
  /**
   * Calcula a comissão de um contrato específico
   */
  async calculateContractCommission(
    contractId: number
  ): Promise<ContractCommission | null> {
    try {
      const { data: contract, error } = await supabase
        .from("contracts")
        .select(
          `
          id,
          contract_code,
          contract_number,
          total_value,
          status,
          clients!inner (
            id,
            full_name
          ),
          profiles!inner (
            id,
            full_name
          ),
          planos!inner (
            id,
            nome,
            "commission-percentage"
          )
        `
        )
        .eq("id", contractId)
        .single();

      if (error || !contract) {
        console.error("Error fetching contract:", error);
        return null;
      }

      const contractValue = parseFloat(contract.total_value || "0");
      const commissionPercentage =
        contract.planos?.["commission-percentage"] || 4;
      const commissionValue = contractValue * (commissionPercentage / 100);

      return {
        contractId: contract.id,
        contractCode: contract.contract_code || contract.contract_number || "",
        clientName: contract.clients?.full_name || "Cliente não encontrado",
        representativeId: contract.profiles?.id || "",
        representativeName:
          contract.profiles?.full_name || "Representante não encontrado",
        contractValue,
        commissionPercentage,
        commissionValue,
        status: contract.status,
      };
    } catch (error) {
      console.error("Error calculating contract commission:", error);
      return null;
    }
  }

  /**
   * Obter relatório de comissões por representante
   */
  async getCommissionReportByRepresentative(
    representativeId: string
  ): Promise<RepresentativeCommissionReport | null> {
    try {
      // Buscar contratos ativos e concluídos do representante
      const { data: contracts, error: contractsError } = await supabase
        .from("contracts")
        .select(
          `
          id,
          total_value,
          status,
          created_at,
          planos!inner (
            "commission-percentage"
          )
        `
        )
        .eq("representative_id", representativeId)
        .in("status", ["Ativo", "Concluído"]);

      if (contractsError) {
        console.error("Error fetching contracts:", contractsError);
        return null;
      }

      // Calcular comissão total
      const totalCommission = (contracts || []).reduce((sum, contract) => {
        const contractValue = parseFloat(contract.total_value || "0");
        const commissionPercentage =
          contract.planos?.["commission-percentage"] || 4;
        return sum + contractValue * (commissionPercentage / 100);
      }, 0);

      // Buscar retiradas aprovadas (comissões pagas)
      const { data: withdrawals, error: withdrawalsError } = await supabase
        .from("withdrawal_requests")
        .select("amount")
        .eq("representative_id", representativeId)
        .eq("status", "approved");

      if (withdrawalsError) {
        console.error("Error fetching withdrawals:", withdrawalsError);
      }

      const paidCommission = (withdrawals || []).reduce(
        (sum, w) => sum + parseFloat(w.amount || "0"),
        0
      );

      // Buscar nome do representante
      const { data: representative, error: repError } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", representativeId)
        .single();

      if (repError) {
        console.error("Error fetching representative:", repError);
      }

      return {
        representativeId,
        representativeName:
          representative?.full_name || "Representante não encontrado",
        totalCommission,
        paidCommission,
        pendingCommission: totalCommission - paidCommission,
        contractsCount: contracts?.length || 0,
        period: new Date().toLocaleDateString("pt-BR", {
          month: "long",
          year: "numeric",
        }),
      };
    } catch (error) {
      console.error("Error getting commission report:", error);
      return null;
    }
  }

  /**
   * Obter relatório global de comissões (todos representantes)
   */
  async getGlobalCommissionReport(): Promise<
    RepresentativeCommissionReport[]
  > {
    try {
      // Buscar todos os representantes
      const { data: representatives, error: repsError } = await supabase
        .from("profiles")
        .select("id, full_name")
        .eq("role", "Representante")
        .eq("status", "Ativo");

      if (repsError || !representatives) {
        console.error("Error fetching representatives:", repsError);
        return [];
      }

      // Para cada representante, obter relatório de comissões
      const reports = await Promise.all(
        representatives.map(async (rep) => {
          const report = await this.getCommissionReportByRepresentative(
            rep.id
          );
          return (
            report || {
              representativeId: rep.id,
              representativeName: rep.full_name,
              totalCommission: 0,
              paidCommission: 0,
              pendingCommission: 0,
              contractsCount: 0,
              period: new Date().toLocaleDateString("pt-BR", {
                month: "long",
                year: "numeric",
              }),
            }
          );
        })
      );

      // Filtrar representantes sem contratos (opcional)
      return reports.filter((r) => r.contractsCount > 0);
    } catch (error) {
      console.error("Error getting global commission report:", error);
      return [];
    }
  }

  /**
   * Obter histórico de comissões de um representante
   * Inclui comissões por contrato e status baseado em withdrawals
   */
  async getCommissionHistory(
    representativeId: string
  ): Promise<CommissionHistory[]> {
    try {
      // Buscar contratos do representante
      const { data: contracts, error: contractsError } = await supabase
        .from("contracts")
        .select(
          `
          id,
          contract_code,
          contract_number,
          total_value,
          created_at,
          status,
          planos!inner (
            "commission-percentage"
          )
        `
        )
        .eq("representative_id", representativeId)
        .in("status", ["Ativo", "Concluído"])
        .order("created_at", { ascending: false });

      if (contractsError || !contracts) {
        console.error("Error fetching contracts:", contractsError);
        return [];
      }

      // Buscar withdrawal requests do representante
      const { data: withdrawals, error: withdrawalsError } = await supabase
        .from("withdrawal_requests")
        .select("*")
        .eq("representative_id", representativeId);

      if (withdrawalsError) {
        console.error("Error fetching withdrawals:", withdrawalsError);
      }

      const withdrawalsByContract = new Map(
        (withdrawals || []).map((w) => [w.contract_id, w])
      );

      // Mapear contratos para histórico de comissões
      const history: CommissionHistory[] = contracts.map((contract) => {
        const contractValue = parseFloat(contract.total_value || "0");
        const commissionPercentage =
          contract.planos?.["commission-percentage"] || 4;
        const commissionValue = contractValue * (commissionPercentage / 100);

        const withdrawal = withdrawalsByContract.get(contract.id);
        let status: "available" | "requested" | "paid" = "available";

        if (withdrawal) {
          if (withdrawal.status === "approved") {
            status = "paid";
          } else if (withdrawal.status === "pending") {
            status = "requested";
          }
        }

        return {
          id: `contract-${contract.id}`,
          contract:
            contract.contract_code || contract.contract_number || `#${contract.id}`,
          contractId: contract.id,
          date: new Date(contract.created_at).toLocaleDateString("pt-BR"),
          value: commissionValue,
          status,
          dueDate: withdrawal?.requested_at
            ? new Date(withdrawal.requested_at).toLocaleDateString("pt-BR")
            : undefined,
        };
      });

      return history;
    } catch (error) {
      console.error("Error getting commission history:", error);
      return [];
    }
  }
}

export const commissionService = new CommissionService();

