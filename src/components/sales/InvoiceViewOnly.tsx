import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { FileText, AlertCircle } from "lucide-react";
import { invoiceService } from "@/lib/supabase";
import InvoiceView, { type InvoiceViewData } from "@/components/sales/InvoiceView";
import { ensureInvoiceInAsaas, getEnsureAsaasErrorMessage } from "@/lib/invoice-asaas.client";

const InvoiceViewOnly: React.FC = () => {
  const { id: invoiceId } = useParams<{ id: string }>();
  const [invoice, setInvoice] = useState<InvoiceViewData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingMessage, setLoadingMessage] = useState("Carregando fatura...");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!invoiceId || String(invoiceId).trim() === "") {
      setError("ID da fatura não fornecido. Verifique o link de acesso.");
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    const loadInvoice = async () => {
      try {
        setIsLoading(true);
        setError(null);
        setLoadingMessage("Carregando fatura...");
        const data = await invoiceService.getById(invoiceId);
        if (cancelled) return;
        if (!data) {
          setError("Fatura não encontrada. O link pode estar incorreto ou a fatura não existe mais.");
          return;
        }
        const statusLower = String((data as any)?.status ?? "").toLowerCase();
        const isPaid = statusLower === "paid" || statusLower === "pago";
        if (isPaid) {
          setInvoice(data as InvoiceViewData);
          return;
        }
        setLoadingMessage("Preparando pagamento…");
        const r = await ensureInvoiceInAsaas(invoiceId);
        if (cancelled) return;
        if (r.success) {
          // Mesclar com dados já carregados para manter contrato e cliente
          setInvoice({ ...(data as object), ...(r.invoice as object) } as InvoiceViewData);
        } else {
          setError(getEnsureAsaasErrorMessage(r.code, r.error));
        }
      } catch (err) {
        if (!cancelled) {
          console.error("Erro ao carregar fatura:", err);
          const message =
            err instanceof Error ? err.message : "Erro ao carregar fatura. Tente novamente.";
          setError(message);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    loadInvoice();
    return () => {
      cancelled = true;
    };
  }, [invoiceId]);

  const handleDownloadInvoice = (inv: InvoiceViewData) => {
    try {
      const paymentLinkBoleto = inv.paymentLinkBoleto ?? inv.payment_link_boleto;
      const paymentLinkPix = inv.paymentLinkPix ?? inv.payment_link_pix;
      if (paymentLinkBoleto) {
        window.open(paymentLinkBoleto, "_blank");
        return;
      }
      if (paymentLinkPix) {
        window.open(paymentLinkPix, "_blank");
        return;
      }

      const invoiceNumber =
        inv.invoiceNumber ?? inv.invoice_code ?? `FAT-${inv.id}`;
      const contractNumber =
        inv.contractNumber ??
        inv.contracts?.contract_number ??
        inv.contract_number ??
        "N/A";
      const dueDate =
        inv.dueDate ??
        (inv.due_date
          ? new Date(inv.due_date).toLocaleDateString("pt-BR")
          : "N/A");
      const value = inv.value ?? inv.amount ?? 0;
      const status =
        inv.status === "paid" || inv.status === "Pago"
          ? "PAGO"
          : inv.status === "overdue" || inv.status === "Vencido"
            ? "VENCIDO"
            : "PENDENTE";
      const paymentDate = inv.paymentDate
        ?? (inv.paid_at
          ? new Date(inv.paid_at).toLocaleDateString("pt-BR")
          : "");
      const paymentMethod = inv.paymentMethod ?? inv.payment_method ?? "";
      const installmentNumber =
        inv.installmentNumber ?? inv.installment_number ?? "";

      const content = [
        `FATURA - ${invoiceNumber}`,
        `Contrato: ${contractNumber}`,
        `Data de Vencimento: ${dueDate}`,
        `Valor: R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
        `Status: ${status}`,
        paymentDate ? `Data de Pagamento: ${paymentDate}` : "",
        paymentMethod ? `Método de Pagamento: ${paymentMethod}` : "",
        installmentNumber ? `Parcela: ${installmentNumber}ª` : "",
      ]
        .filter(Boolean)
        .join("\n");

      const blob = new Blob([content], {
        type: "text/plain;charset=utf-8",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Fatura-${invoiceNumber}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Erro ao fazer download da fatura:", err);
      alert("Erro ao fazer download da fatura. Tente novamente.");
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto mb-4" />
          <p className="text-muted-foreground">{loadingMessage}</p>
        </div>
      </div>
    );
  }

  const handleRetry = () => {
    setError(null);
    setInvoice(null);
    setIsLoading(true);
    if (invoiceId) {
      invoiceService
        .getById(invoiceId)
        .then((data) => {
          setInvoice(data as InvoiceViewData);
          setError(null);
        })
        .catch((err) => {
          console.error("Erro ao carregar fatura:", err);
          setError(
            err instanceof Error ? err.message : "Erro ao carregar fatura. Tente novamente."
          );
        })
        .finally(() => setIsLoading(false));
    } else {
      setError("ID da fatura não fornecido");
      setIsLoading(false);
    }
  };

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center max-w-md space-y-4">
          <AlertCircle className="h-16 w-16 mx-auto text-red-500" />
          <h2 className="text-xl font-semibold">Erro ao Carregar Fatura</h2>
          <p className="text-muted-foreground text-sm">{error}</p>
          <div className="flex flex-col sm:flex-row gap-2 justify-center">
            <Button variant="outline" onClick={() => window.history.back()}>
              Voltar
            </Button>
            <Button onClick={handleRetry}>Tentar novamente</Button>
          </div>
        </div>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center max-w-md space-y-4">
          <FileText className="h-16 w-16 mx-auto text-muted-foreground" />
          <h2 className="text-xl font-semibold">Fatura Não Encontrada</h2>
          <p className="text-muted-foreground text-sm">
            A fatura solicitada não foi encontrada ou não está disponível.
          </p>
          <div className="flex flex-col sm:flex-row gap-2 justify-center">
            <Button variant="outline" onClick={() => window.history.back()}>
              Voltar
            </Button>
            <Button onClick={handleRetry}>Tentar novamente</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background invoice-view-only-page">
      <style>{`
        @media print {
          .invoice-view-only-page {
            background: #fff !important;
          }
          @page { size: A4; margin: 15mm; }
        }
      `}</style>
      <InvoiceView
        invoice={invoice}
        showCompanyHeader={true}
        onDownload={handleDownloadInvoice}
        hidePrintButton={false}
        compact={false}
      />
    </div>
  );
};

export default InvoiceViewOnly;
