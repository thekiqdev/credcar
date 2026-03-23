/**
 * Cliente para garantir fatura no ASAAS (criar cobrança sob demanda ao visualizar).
 * Usa a mesma base URL do upload-server que o UploadService.
 * Em produção, defina VITE_UPLOAD_SERVER_URL (sem /api) na build do frontend se o backend estiver em outro host.
 */

export function getUploadApiBaseUrl(): string {
  const envUrl = typeof import.meta !== "undefined" && (import.meta as any).env?.VITE_UPLOAD_SERVER_URL;
  const base = typeof envUrl === "string" && envUrl.trim() ? envUrl.trim().replace(/\/api\/?$/, "") : null;
  if (base) {
    return `${base}/api`;
  }
  const hostname = typeof window !== "undefined" ? window.location.hostname : "";
  if (hostname === "localhost" || hostname === "127.0.0.1") {
    return "http://localhost:3001/api";
  }
  if (hostname === "sistema.credcarmultimarcas.com.br") {
    return "https://sistema.credcarmultimarcas.com.br/api";
  }
  return `${typeof window !== "undefined" ? window.location.protocol : "https:"}//${hostname}/api`;
}

/** Base URL do upload-server (sem /api), para rotas como view-document e download-document. */
export function getUploadServerBaseUrl(): string {
  const api = getUploadApiBaseUrl();
  return api.replace(/\/api\/?$/, "") || api;
}

export interface EnsureAsaasSuccess {
  success: true;
  invoice: Record<string, unknown>;
  message?: string;
}

export interface EnsureAsaasError {
  success: false;
  error: string;
  code?: string;
}

export type EnsureAsaasResult = EnsureAsaasSuccess | EnsureAsaasError;

/** Códigos de erro retornados pelo backend ensure-asaas */
export const ENSURE_ASAAS_CODES = {
  INVOICE_NOT_FOUND: "INVOICE_NOT_FOUND",
  CLIENT_NO_ASAAS: "CLIENT_NO_ASAAS",
  ASAAS_ERROR: "ASAAS_ERROR",
  INTERNAL_ERROR: "INTERNAL_ERROR",
  NETWORK_ERROR: "NETWORK_ERROR",
} as const;

/**
 * Retorna mensagem amigável para o usuário a partir do código ou texto de erro do ensure-asaas.
 */
export function getEnsureAsaasErrorMessage(
  code: string | undefined,
  fallback: string
): string {
  switch (code) {
    case ENSURE_ASAAS_CODES.CLIENT_NO_ASAAS:
      return "Cadastro de pagamento não disponível para este cliente. Entre em contato com o suporte.";
    case ENSURE_ASAAS_CODES.ASAAS_ERROR:
    case ENSURE_ASAAS_CODES.INTERNAL_ERROR:
      return "Pagamento temporariamente indisponível. Tente novamente em alguns minutos.";
    case ENSURE_ASAAS_CODES.NETWORK_ERROR:
      return "Erro de conexão. Verifique sua internet e tente novamente.";
    case ENSURE_ASAAS_CODES.INVOICE_NOT_FOUND:
      return "Fatura não encontrada.";
    default:
      return fallback;
  }
}

/**
 * Garante que a fatura exista no ASAAS (cria cobrança se ainda não existir).
 * Retorna a fatura atualizada com payment_link_pix e payment_link_boleto quando disponíveis.
 */
export async function ensureInvoiceInAsaas(invoiceId: string): Promise<EnsureAsaasResult> {
  const baseUrl = getUploadApiBaseUrl();
  const url = `${baseUrl}/invoices/${encodeURIComponent(String(invoiceId))}/ensure-asaas`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      return {
        success: false,
        error: data?.error ?? `Erro ${res.status}: ${res.statusText}`,
        code: data?.code,
      };
    }

    if (data?.success === true && data?.invoice) {
      return {
        success: true,
        invoice: data.invoice,
        message: data.message,
      };
    }

    return {
      success: false,
      error: data?.error ?? "Resposta inválida do servidor",
      code: data?.code,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro de conexão. Tente novamente.";
    return {
      success: false,
      error: message,
      code: "NETWORK_ERROR",
    };
  }
}

/**
 * Confirma pagamento manual (admin). Marca a fatura como paga no sistema.
 * Retorna a fatura atualizada.
 */
export async function confirmInvoicePayment(
  invoiceId: string
): Promise<{ success: true; invoice: Record<string, unknown> } | { success: false; error: string }> {
  const baseUrl = getUploadApiBaseUrl();
  const url = `${baseUrl}/invoices/${encodeURIComponent(String(invoiceId))}/confirm-payment`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      return {
        success: false,
        error: (data?.error as string) ?? `Erro ${res.status}`,
      };
    }

    if (data?.success === true && data?.invoice) {
      return { success: true, invoice: data.invoice };
    }

    return {
      success: false,
      error: (data?.error as string) ?? "Resposta inválida",
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Erro de conexão.",
    };
  }
}
