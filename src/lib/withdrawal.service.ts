import { supabase } from "./supabase";
import { commissionService } from "./commission.service";
import { Database } from "../types/supabase";

export interface WithdrawalRequest {
  id: number;
  representative_id: string;
  request_code: string;
  requested_value: number;
  requested_at: string;
  status: Database["public"]["Enums"]["withdrawal_status"];
  processed_at: string | null;
  rejection_reason: string | null;
  invoice_url: string;
  payment_status?: "Não Pago" | "Pago"; // Opcional até migration ser aplicada
  payment_date?: string | null; // Opcional até migration ser aplicada
}

class WithdrawalService {
  /**
   * Criar nova solicitação de retirada
   */
  async createWithdrawalRequest(
    representativeId: string,
    amount: number
  ): Promise<WithdrawalRequest> {
    try {
      // 1. Validar que amount > 0
      if (!amount || amount <= 0) {
        throw new Error("Valor deve ser maior que zero");
      }

      // 2. Calcular saldo disponível
      const availableBalance = await this.calculateAvailableBalance(representativeId);

      // 3. Validar que amount <= saldo disponível
      if (amount > availableBalance) {
        throw new Error(
          `Saldo insuficiente. Disponível: R$ ${availableBalance.toLocaleString("pt-BR")}`
        );
      }

      // 4. Gerar request_code único
      const timestamp = Date.now();
      const random = Math.random().toString(36).substring(2, 8).toUpperCase();
      const request_code = `WD-${timestamp}-${random}`;

      // 5. Inserir em withdrawal_requests
      const { data, error } = await supabase
        .from("withdrawal_requests")
        .insert({
          representative_id: representativeId,
          request_code: request_code,
          requested_value: amount,
          requested_at: new Date().toISOString(),
          status: "Pendente" as Database["public"]["Enums"]["withdrawal_status"],
          invoice_url: "", // Será preenchido pelo admin ao aprovar
        })
        .select()
        .single();

      if (error) {
        console.error("Erro ao criar solicitação de retirada:", error);
        throw new Error(`Erro ao criar solicitação: ${error.message}`);
      }

      if (!data) {
        throw new Error("Nenhum dado retornado após criar solicitação");
      }

      console.log("✅ Solicitação de retirada criada:", data);
      return data as WithdrawalRequest;
    } catch (error) {
      console.error("Erro em createWithdrawalRequest:", error);
      throw error;
    }
  }

  /**
   * Obter solicitações do representante
   */
  async getWithdrawalsByRepresentative(
    representativeId: string
  ): Promise<WithdrawalRequest[]> {
    try {
      const { data, error } = await supabase
        .from("withdrawal_requests")
        .select("*")
        .eq("representative_id", representativeId)
        .order("requested_at", { ascending: false });

      if (error) {
        console.error("Erro ao buscar solicitações:", error);
        throw new Error(`Erro ao buscar solicitações: ${error.message}`);
      }

      return (data || []) as WithdrawalRequest[];
    } catch (error) {
      console.error("Erro em getWithdrawalsByRepresentative:", error);
      return [];
    }
  }

  /**
   * Calcular saldo disponível (total de comissões - retiradas aprovadas)
   */
  async calculateAvailableBalance(representativeId: string): Promise<number> {
    try {
      // Buscar relatório de comissões do representante
      const commissionReport = await commissionService.getCommissionReportByRepresentative(
        representativeId
      );

      if (!commissionReport) {
        console.warn("Nenhum relatório de comissões encontrado");
        return 0;
      }

      // O pendingCommission já considera as retiradas aprovadas
      return commissionReport.pendingCommission;
    } catch (error) {
      console.error("Erro ao calcular saldo disponível:", error);
      return 0;
    }
  }

  /**
   * Obter todas as solicitações (para admin)
   */
  async getAllWithdrawals(): Promise<WithdrawalRequest[]> {
    try {
      const { data, error } = await supabase
        .from("withdrawal_requests")
        .select(`
          *,
          profiles!inner (
            id,
            full_name,
            email
          )
        `)
        .order("requested_at", { ascending: false });

      if (error) {
        console.error("Erro ao buscar todas as solicitações:", error);
        throw new Error(`Erro ao buscar solicitações: ${error.message}`);
      }

      return (data || []) as any;
    } catch (error) {
      console.error("Erro em getAllWithdrawals:", error);
      return [];
    }
  }

  /**
   * Aprovar solicitação de retirada (admin)
   */
  async approveWithdrawal(
    withdrawalId: number,
    invoiceUrl: string = ""
  ): Promise<WithdrawalRequest> {
    try {
      const { data, error } = await supabase
        .from("withdrawal_requests")
        .update({
          status: "Aprovado" as Database["public"]["Enums"]["withdrawal_status"],
          processed_at: new Date().toISOString(),
          invoice_url: invoiceUrl,
        })
        .eq("id", withdrawalId)
        .select()
        .single();

      if (error) {
        console.error("Erro ao aprovar solicitação:", error);
        throw new Error(`Erro ao aprovar solicitação: ${error.message}`);
      }

      if (!data) {
        throw new Error("Nenhum dado retornado após aprovar solicitação");
      }

      // Adicionar campos padrão se não existirem (até migration ser aplicada)
      const result = {
        ...data,
        payment_status: "Não Pago" as const,
        payment_date: null,
      } as WithdrawalRequest;

      return result;
    } catch (error) {
      console.error("Erro em approveWithdrawal:", error);
      throw error;
    }
  }

  /**
   * Rejeitar solicitação de retirada (admin)
   */
  async rejectWithdrawal(
    withdrawalId: number,
    rejectionReason: string
  ): Promise<WithdrawalRequest> {
    try {
      if (!rejectionReason || rejectionReason.trim() === "") {
        throw new Error("Motivo da rejeição é obrigatório");
      }

      const { data, error } = await supabase
        .from("withdrawal_requests")
        .update({
          status: "Rejeitado" as Database["public"]["Enums"]["withdrawal_status"],
          processed_at: new Date().toISOString(),
          rejection_reason: rejectionReason,
        })
        .eq("id", withdrawalId)
        .select()
        .single();

      if (error) {
        console.error("Erro ao rejeitar solicitação:", error);
        throw new Error(`Erro ao rejeitar solicitação: ${error.message}`);
      }

      if (!data) {
        throw new Error("Nenhum dado retornado após rejeitar solicitação");
      }

      return data as WithdrawalRequest;
    } catch (error) {
      console.error("Erro em rejectWithdrawal:", error);
      throw error;
    }
  }

  /**
   * Marcar solicitação como paga (admin)
   * NOTA: Este método requer que a migration seja aplicada primeiro
   */
  async markAsPaid(
    withdrawalId: number,
    paymentDate: string
  ): Promise<WithdrawalRequest> {
    try {
      // Tentar atualizar com os novos campos
      const { data, error } = await supabase
        .from("withdrawal_requests")
        .update({
          payment_status: "Pago" as const,
          payment_date: paymentDate,
        })
        .eq("id", withdrawalId)
        .select()
        .single();

      if (error) {
        // Se der erro porque as colunas não existem, retornar erro informativo
        if (error.message.includes("payment_status") || error.message.includes("Could not find")) {
          throw new Error("Migration não aplicada: Execute o SQL em apply-payment-tracking-migration.sql no Supabase SQL Editor");
        }
        console.error("Erro ao marcar como pago:", error);
        throw new Error(`Erro ao marcar como pago: ${error.message}`);
      }

      if (!data) {
        throw new Error("Nenhum dado retornado após marcar como pago");
      }

      return data as WithdrawalRequest;
    } catch (error) {
      console.error("Erro em markAsPaid:", error);
      throw error;
    }
  }
}

export const withdrawalService = new WithdrawalService();

