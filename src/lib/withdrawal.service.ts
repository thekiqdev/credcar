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
  payment_status: "Não Pago" | "Pago";
  payment_date: string | null;
}

class WithdrawalService {
  /**
   * Criar nova solicitação de retirada (sem upload - legacy)
   */
  async createWithdrawalRequest(
    representativeId: string,
    amount: number
  ): Promise<WithdrawalRequest> {
    return this.createWithdrawalRequestWithInvoice(representativeId, amount, null);
  }

  /**
   * Criar nova solicitação de retirada com upload de nota fiscal
   */
  async createWithdrawalRequestWithInvoice(
    representativeId: string,
    amount: number,
    invoiceFile: File | null
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

      // 4. Upload da nota fiscal (se fornecida)
      let invoiceUrl = "";
      if (invoiceFile) {
        console.log("📄 Iniciando upload da nota fiscal...");
        invoiceUrl = await this.uploadInvoiceFile(invoiceFile, representativeId);
        console.log("✅ Nota fiscal enviada:", invoiceUrl);
      }

      // 5. Gerar request_code único
      const timestamp = Date.now();
      const random = Math.random().toString(36).substring(2, 8).toUpperCase();
      const request_code = `WD-${timestamp}-${random}`;

      // 6. Inserir em withdrawal_requests
      const { data, error } = await supabase
        .from("withdrawal_requests")
        .insert({
          representative_id: representativeId,
          request_code: request_code,
          requested_value: amount,
          requested_at: new Date().toISOString(),
          status: "Pendente" as Database["public"]["Enums"]["withdrawal_status"],
          invoice_url: invoiceUrl, // URL da nota fiscal enviada pelo representante
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
      console.error("Erro em createWithdrawalRequestWithInvoice:", error);
      throw error;
    }
  }

  /**
   * Upload de nota fiscal para solicitação de retirada
   */
  private async uploadInvoiceFile(
    file: File,
    representativeId: string
  ): Promise<string> {
    try {
      // Importar serviços de upload
      const { uploadService } = await import('./upload.service');
      const { chunkUploadService } = await import('./chunk-upload.service');

      // Buscar CPF/CNPJ do representante
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('cnpj, cpf')
        .eq('id', representativeId)
        .single();

      if (profileError) {
        throw new Error(`Erro ao buscar dados do representante: ${profileError.message}`);
      }

      const cpfCnpj = profile?.cnpj || profile?.cpf || '';
      if (!cpfCnpj) {
        throw new Error('CPF/CNPJ do representante não encontrado');
      }

      // Preparar dados do arquivo
      const docInfo = {
        representativeId: representativeId,
        cpfCnpj: cpfCnpj,
        documentType: 'nota_fiscal_comissao',
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type
      };

      let result;

      // Verificar se deve usar upload em chunks
      const shouldUseChunks = chunkUploadService.shouldUseChunkUpload(file.size);

      if (shouldUseChunks) {
        console.log(`🔧 Usando upload em chunks para nota fiscal: ${file.size} bytes`);
        result = await chunkUploadService.uploadFile({
          file: file,
          documentType: 'nota_fiscal_comissao',
          cpfCnpj: cpfCnpj,
          representativeId: representativeId,
        });
      } else {
        console.log(`📤 Usando upload normal para nota fiscal: ${file.size} bytes`);
        result = await uploadService.uploadComplete(file, docInfo);
      }

      if (!result.success) {
        throw new Error(result.error || 'Erro ao fazer upload da nota fiscal');
      }

      const filePath = result.data?.filePath || result.data?.directory || '';
      if (!filePath) {
        throw new Error('Caminho do arquivo não retornado pelo servidor');
      }

      return filePath;
    } catch (error) {
      console.error('❌ Erro no upload da nota fiscal:', error);
      throw new Error(
        error instanceof Error ? error.message : 'Erro ao fazer upload da nota fiscal'
      );
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
          payment_status: "Não Pago" as const,
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

      return data as WithdrawalRequest;
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
   */
  async markAsPaid(
    withdrawalId: number,
    paymentDate: string
  ): Promise<WithdrawalRequest> {
    try {
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

