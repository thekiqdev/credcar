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
  createdAt: string;
}

export interface RepresentativeCommissionReport {
  representativeId: string;
  representativeName: string;
  totalCommission: number;
  paidCommission: number;
  pendingCommission: number;
  contractsCount: number;
  contracts: ContractCommission[];
}

export interface GlobalCommissionReport {
  representatives: RepresentativeCommissionReport[];
  totalCommission: number;
  totalPaid: number;
  totalPending: number;
}

class CommissionService {
  /**
   * Calcular comissão de um contrato específico
   */
  async calculateContractCommission(contractId: number): Promise<ContractCommission | null> {
    try {
      const { data: contract, error } = await supabase
        .from("contracts")
        .select(`
          id,
          contract_code,
          contract_number,
          total_value,
          status,
          created_at,
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
        `)
        .eq("id", contractId)
        .single();

      if (error) {
        console.error("Erro ao buscar contrato:", error);
        return null;
      }

      if (!contract) {
        return null;
      }

      const contractValue = parseFloat(contract.total_value || "0");
      const commissionPercentage = contract.planos?.["commission-percentage"] || 4;
      const commissionValue = contractValue * (commissionPercentage / 100);

      return {
        contractId: contract.id,
        contractCode: contract.contract_code || contract.contract_number || `CONT-${contract.id}`,
        clientName: contract.clients?.full_name || "Cliente não encontrado",
        representativeId: contract.profiles?.id || "",
        representativeName: contract.profiles?.full_name || "Representante não encontrado",
        contractValue,
        commissionPercentage,
        commissionValue,
        status: contract.status || "Pendente",
        createdAt: contract.created_at || new Date().toISOString(),
      };
    } catch (error) {
      console.error("Erro ao calcular comissão do contrato:", error);
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
      // Buscar contratos ativos ou concluídos do representante
      const { data: contracts, error: contractsError } = await supabase
        .from("contracts")
        .select(`
          id,
          contract_code,
          contract_number,
          total_value,
          status,
          created_at,
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
        `)
        .eq("representative_id", representativeId)
        .in("status", ["Ativo", "Concluído"]);

      if (contractsError) {
        console.error("Erro ao buscar contratos:", contractsError);
        return null;
      }

      // Buscar representante
      const { data: representative, error: repError } = await supabase
        .from("profiles")
        .select("id, full_name")
        .eq("id", representativeId)
        .single();

      if (repError) {
        console.error("Erro ao buscar representante:", repError);
        return null;
      }

      // Calcular comissões dos contratos
      const contractCommissions: ContractCommission[] = (contracts || []).map((contract) => {
        const contractValue = parseFloat(contract.total_value || "0");
        const commissionPercentage = contract.planos?.["commission-percentage"] || 4;
        const commissionValue = contractValue * (commissionPercentage / 100);

        return {
          contractId: contract.id,
          contractCode: contract.contract_code || contract.contract_number || `CONT-${contract.id}`,
          clientName: contract.clients?.full_name || "Cliente não encontrado",
          representativeId: contract.profiles?.id || "",
          representativeName: contract.profiles?.full_name || "Representante não encontrado",
          contractValue,
          commissionPercentage,
          commissionValue,
          status: contract.status || "Pendente",
          createdAt: contract.created_at || new Date().toISOString(),
        };
      });

      const totalCommission = contractCommissions.reduce(
        (sum, comm) => sum + comm.commissionValue,
        0
      );

      // Buscar comissões pagas (withdrawal_requests aprovados)
      const { data: withdrawals, error: withdrawalsError } = await supabase
        .from("withdrawal_requests")
        .select("amount, status")
        .eq("representative_id", representativeId)
        .eq("status", "approved");

      if (withdrawalsError) {
        console.error("Erro ao buscar withdrawals:", withdrawalsError);
      }

      const paidCommission = (withdrawals || []).reduce(
        (sum, withdrawal) => sum + parseFloat(withdrawal.amount || "0"),
        0
      );

      const pendingCommission = totalCommission - paidCommission;

      return {
        representativeId: representative.id,
        representativeName: representative.full_name,
        totalCommission,
        paidCommission,
        pendingCommission,
        contractsCount: contractCommissions.length,
        contracts: contractCommissions,
      };
    } catch (error) {
      console.error("Erro ao gerar relatório de comissões:", error);
      return null;
    }
  }

  /**
   * Obter relatório global de comissões (todos representantes)
   */
  async getGlobalCommissionReport(): Promise<GlobalCommissionReport> {
    try {
      // Buscar todos os representantes
      const { data: representatives, error: repsError } = await supabase
        .from("profiles")
        .select("id, full_name")
        .eq("role", "Representante")
        .eq("status", "Ativo");

      if (repsError) {
        console.error("Erro ao buscar representantes:", repsError);
        return {
          representatives: [],
          totalCommission: 0,
          totalPaid: 0,
          totalPending: 0,
        };
      }

      // Gerar relatório para cada representante
      const reportsPromises = (representatives || []).map((rep) =>
        this.getCommissionReportByRepresentative(rep.id)
      );

      const reports = await Promise.all(reportsPromises);
      const validReports = reports.filter((r) => r !== null) as RepresentativeCommissionReport[];

      const totalCommission = validReports.reduce((sum, rep) => sum + rep.totalCommission, 0);
      const totalPaid = validReports.reduce((sum, rep) => sum + rep.paidCommission, 0);
      const totalPending = validReports.reduce((sum, rep) => sum + rep.pendingCommission, 0);

      return {
        representatives: validReports,
        totalCommission,
        totalPaid,
        totalPending,
      };
    } catch (error) {
      console.error("Erro ao gerar relatório global de comissões:", error);
      return {
        representatives: [],
        totalCommission: 0,
        totalPaid: 0,
        totalPending: 0,
      };
    }
  }

  /**
   * Obter relatório de comissões - cada solicitação como linha individual
   */
  async getCommissionPaymentsReport(): Promise<any[]> {
    try {
      // Buscar todas as solicitações aprovadas individualmente
      const { data: withdrawals, error } = await supabase
        .from("withdrawal_requests")
        .select(`
          id,
          request_code,
          requested_value,
          requested_at,
          processed_at,
          payment_status,
          payment_date,
          profiles!inner (
            id,
            full_name,
            email
          )
        `)
        .eq("status", "Aprovado")
        .order("processed_at", { ascending: false });

      if (error) {
        console.error("Erro ao buscar pagamentos de comissões:", error);
        throw new Error(`Erro ao buscar pagamentos: ${error.message}`);
      }

      // Retornar cada solicitação como uma linha individual
      const result = [];
      
      for (const withdrawal of (withdrawals || [])) {
        const repId = withdrawal.profiles?.id;
        if (!repId) continue;

        // Buscar contagem de contratos para este representante
        const { data: contracts } = await supabase
          .from("contracts")
          .select("id")
          .eq("representative_id", repId)
          .in("status", ["Ativo", "Concluído"]);
        
        result.push({
          id: withdrawal.id, // ID da solicitação individual
          withdrawalId: withdrawal.id, // Para referência
          representativeId: repId,
          representative: withdrawal.profiles?.full_name || "N/A",
          representativeEmail: withdrawal.profiles?.email || "N/A",
          period: new Date().toLocaleDateString("pt-BR", { month: "long", year: "numeric" }),
          totalCommission: withdrawal.requested_value || 0, // Valor desta solicitação específica
          paidCommission: withdrawal.payment_status === "Pago" ? (withdrawal.requested_value || 0) : 0,
          pendingCommission: withdrawal.payment_status === "Não Pago" ? (withdrawal.requested_value || 0) : 0,
          contracts: contracts?.length || 0,
          paymentStatus: withdrawal.payment_status || "Não Pago",
          paymentDate: withdrawal.payment_date,
          requestedAt: withdrawal.requested_at,
          processedAt: withdrawal.processed_at,
          requestCode: withdrawal.request_code
        });
      }

      return result;
    } catch (error) {
      console.error("Erro em getCommissionPaymentsReport:", error);
      return [];
    }
  }
}

export const commissionService = new CommissionService();

