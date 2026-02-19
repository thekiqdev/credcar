import React, { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  FileText,
  Download,
  Building,
  Phone,
  Mail,
  MapPin,
  CreditCard,
  ExternalLink,
  Loader2,
} from "lucide-react";
import { generalSettingsService } from "@/lib/supabase";
import { downloadInvoicePdf } from "@/lib/invoice-pdf.service";
import PixQrCodeDisplay from "@/components/sales/PixQrCodeDisplay";

export interface GeneralSettings {
  system_name: string;
  company_name: string;
  company_address: string;
  company_phone: string;
  company_email: string;
  company_cnpj: string;
  logo_url: string;
  logo_file_path: string;
}

/** Invoice data from API (invoiceService.getById) or formatted for display */
export interface InvoiceViewData {
  id: string | number;
  contract_id?: number | string;
  invoice_code?: string;
  invoiceNumber?: string;
  contract_number?: string;
  contractNumber?: string;
  due_date?: string;
  dueDate?: string;
  value?: number;
  amount?: number;
  status?: string;
  paid_at?: string;
  paymentDate?: string;
  payment_method?: string;
  paymentMethod?: string;
  payment_link_pix?: string;
  paymentLinkPix?: string;
  payment_link_boleto?: string;
  paymentLinkBoleto?: string;
  installment_number?: number;
  installmentNumber?: number;
  contracts?: {
    id?: number;
    contract_number?: string;
    contract_code?: string;
    clients?: {
      id?: number;
      full_name?: string;
      name?: string;
      email?: string;
      cpf_cnpj?: string;
    };
  };
  invoiceData?: Record<string, unknown>;
}

interface InvoiceViewProps {
  /** Invoice data (from API or formatted) */
  invoice: InvoiceViewData;
  /** Show company header with logo (default: true) */
  showCompanyHeader?: boolean;
  /** Callback when user clicks Download */
  onDownload?: (invoice: InvoiceViewData) => void;
  /** Hide print button (e.g. inside modal) */
  hidePrintButton?: boolean;
  /** Compact layout for modal */
  compact?: boolean;
  /** Show "Abrir em nova aba" link to public invoice page */
  showPublicLink?: boolean;
  /** Show "Download PDF" button (default: true when not compact) */
  showDownloadPdf?: boolean;
}

const InvoiceView: React.FC<InvoiceViewProps> = ({
  invoice,
  showCompanyHeader = true,
  onDownload,
  hidePrintButton = false,
  compact = false,
  showPublicLink = false,
  showDownloadPdf = true,
}) => {
  const [generalSettings, setGeneralSettings] = useState<GeneralSettings | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  useEffect(() => {
    let cancelled = false;
    generalSettingsService.getSettings().then((s) => {
      if (!cancelled) setGeneralSettings(s);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const getLogoUrl = () => {
    if (!generalSettings) return null;
    if (generalSettings.logo_url?.trim()) return `/${generalSettings.logo_url}`;
    if (generalSettings.logo_file_path?.trim()) return `/${generalSettings.logo_file_path}`;
    return null;
  };

  const invoiceNumber =
    invoice.invoiceNumber ?? invoice.invoice_code ?? `FAT-${invoice.id}`;
  const dueDate = invoice.dueDate ?? (invoice.due_date ? new Date(invoice.due_date).toLocaleDateString("pt-BR") : "N/A");
  const value = invoice.value ?? invoice.amount ?? 0;
  const status =
    invoice.status === "Pago" || invoice.status === "paid"
      ? "paid"
      : invoice.status === "overdue" || invoice.status === "Vencido"
        ? "overdue"
        : "pending";
  const paymentDate = invoice.paymentDate ?? (invoice.paid_at ? new Date(invoice.paid_at).toLocaleDateString("pt-BR") : undefined);
  const paymentMethod = invoice.paymentMethod ?? invoice.payment_method;
  const rawPix =
    invoice.paymentLinkPix ??
    invoice.payment_link_pix ??
    (invoice.invoiceData as Record<string, unknown> | undefined)?.payment_link_pix;
  // ASAAS pode retornar PIX como string (copia e cola) ou objeto { payload, copyPaste, ... }
  const paymentLinkPix =
    typeof rawPix === "string"
      ? rawPix
      : rawPix && typeof rawPix === "object"
        ? (rawPix as Record<string, unknown>)?.payload ??
          (rawPix as Record<string, unknown>)?.copyPaste ??
          (rawPix as Record<string, unknown>)?.copyAndPaste ??
          ""
        : "";
  const paymentLinkBoleto = invoice.paymentLinkBoleto ?? invoice.payment_link_boleto;
  const installmentNumber = invoice.installmentNumber ?? invoice.installment_number;

  /** PIX copia e cola (EMV): string longa que não é URL (mín. 30 caracteres típico do payload) */
  const isPixCopiaECola = (s: string | undefined): boolean =>
    typeof s === "string" && s.trim().length >= 30 && !s.toLowerCase().startsWith("http");
  const pixAsCopiaECola = paymentLinkPix && isPixCopiaECola(paymentLinkPix) ? paymentLinkPix : null;
  const pixAsUrl = paymentLinkPix && !isPixCopiaECola(paymentLinkPix) ? paymentLinkPix : null;
  // Contrato pode vir como relation (contracts/contract) ou campo direto; Supabase pode retornar objeto ou array
  const invAny = invoice as Record<string, unknown>;
  const contractRelation = invoice.contracts ?? invAny.contract;
  const contractObj = Array.isArray(contractRelation) ? contractRelation[0] : contractRelation;
  const contractRecord = contractObj && typeof contractObj === "object" ? (contractObj as Record<string, unknown>) : null;
  const client = contractRecord?.clients ?? (invoice as any).contracts?.clients ?? invAny.contract?.clients;
  const clientName = client?.full_name ?? client?.name ?? (client as any)?.full_name ?? "—";
  const contractIdRaw = invoice.contract_id ?? invAny.contract_id;
  const contractNumber =
    invoice.contractNumber ??
    invAny.contractNumber ??
    contractRecord?.contract_number ??
    contractRecord?.contract_code ??
    invoice.contracts?.contract_number ??
    (invoice.contracts as any)?.contract_code ??
    invoice.contract_number ??
    invoice.contract_code ??
    (invAny.contract_number ?? invAny.contract_code) ??
    (contractIdRaw != null && contractIdRaw !== "" ? String(contractIdRaw) : "N/A");

  const statusLabel =
    status === "paid" ? "PAGO" : status === "overdue" ? "VENCIDO" : "PENDENTE";

  const handleDownloadPdf = async () => {
    try {
      setIsGeneratingPdf(true);
      const logoPath = getLogoUrl();
      const company = generalSettings
        ? {
            company_name: generalSettings.company_name,
            company_cnpj: generalSettings.company_cnpj,
            company_address: generalSettings.company_address,
            company_phone: generalSettings.company_phone,
            company_email: generalSettings.company_email,
            logo_url:
              typeof window !== "undefined" && logoPath
                ? `${window.location.origin}${logoPath.startsWith("/") ? "" : "/"}${logoPath}`
                : undefined,
          }
        : null;
      await downloadInvoicePdf(invoice, company);
    } catch (err) {
      console.error("Erro ao gerar PDF da fatura:", err);
      alert("Erro ao gerar PDF. Tente novamente.");
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const statusClassName =
    status === "paid"
      ? "bg-green-500 text-white hover:bg-green-600 border-green-500"
      : status === "overdue"
        ? "bg-red-500 text-white hover:bg-red-600 border-red-500"
        : "bg-yellow-500 text-white hover:bg-yellow-600 border-yellow-500";

  return (
    <div
      id="invoice-print-area"
      className={`invoice-view-root ${compact ? "space-y-4" : "min-h-screen bg-background"}`}
    >
      {/* Estilos de impressão: mesmo conteúdo do PDF (cabeçalho + fatura); só esta área é impressa */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #invoice-print-area,
          #invoice-print-area * {
            visibility: visible;
          }
          #invoice-print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            background: #fff;
          }
          .invoice-view-root {
            background: #fff !important;
          }
          .invoice-view-root .print\\:hidden {
            display: none !important;
          }
          .invoice-view-root * {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .invoice-view-root .card,
          .invoice-view-root [class*="Card"] {
            box-shadow: none !important;
            border: 1px solid #e5e7eb !important;
          }
          @page {
            size: A4;
            margin: 15mm;
          }
          body {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
        }
      `}</style>
      {showCompanyHeader && generalSettings && (
        <div className="bg-white border-b print:border-b-2 print:border-gray-300">
          <div
            className={
              compact
                ? "max-w-2xl mx-auto px-4 py-4"
                : "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 print:py-4 print:px-0"
            }
          >
            <div className="flex items-center justify-center gap-6 sm:gap-12 print:gap-4 print:justify-between">
              <div className="flex-shrink-0">
                {getLogoUrl() ? (
                  <img
                    src={getLogoUrl()!}
                    alt="Logo"
                    className="h-12 sm:h-16 lg:h-20 object-contain"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                ) : (
                  <div className="h-12 sm:h-16 rounded-md bg-red-600 flex items-center justify-center">
                    <Building className="h-6 sm:h-8 text-white" />
                  </div>
                )}
              </div>
              <div className="text-left text-xs sm:text-sm text-gray-600 space-y-1">
                <p className="font-semibold text-gray-900">{generalSettings.company_name}</p>
                <p>CNPJ: {generalSettings.company_cnpj}</p>
                <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3 flex-shrink-0" />
                  {generalSettings.company_address}
                </span>
                <span className="flex items-center gap-1">
                  <Phone className="h-3 w-3 flex-shrink-0" />
                  {generalSettings.company_phone}
                </span>
                <span className="flex items-center gap-1">
                  <Mail className="h-3 w-3 flex-shrink-0" />
                  {generalSettings.company_email}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className={compact ? "max-w-2xl mx-auto px-4 pb-4" : "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8"}>
        <Card className="print:border-0 print:shadow-none">
          <CardHeader className={compact ? "pb-2" : ""}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-lg sm:text-xl">
                  Fatura {invoiceNumber}
                </CardTitle>
                <CardDescription>
                  {installmentNumber != null && installmentNumber > 0
                    ? `${installmentNumber}ª parcela`
                    : "Parcela única"}
                  {dueDate !== "N/A" && ` • Vencimento: ${dueDate}`}
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className={statusClassName}>
                  {statusLabel}
                </Badge>
                {!hidePrintButton && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.print()}
                    className="print:hidden"
                  >
                    <FileText className="mr-2 h-4 w-4" />
                    Imprimir
                  </Button>
                )}
                {onDownload && (
                  <Button
                    size="sm"
                    onClick={() => onDownload(invoice)}
                    className="print:hidden bg-red-600 hover:bg-red-700"
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Download
                  </Button>
                )}
                {showDownloadPdf && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="print:hidden"
                    onClick={handleDownloadPdf}
                    disabled={isGeneratingPdf}
                    title="Baixar fatura em PDF"
                  >
                    {isGeneratingPdf ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <FileText className="mr-2 h-4 w-4" />
                    )}
                    {isGeneratingPdf ? "Gerando…" : "PDF"}
                  </Button>
                )}
                {showPublicLink && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="print:hidden"
                    onClick={() => {
                      const base = typeof window !== "undefined" ? window.location.origin : "";
                      window.open(`${base}/invoice/${invoice.id}`, "_blank");
                    }}
                    title="Abrir fatura em nova aba (link público)"
                  >
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Abrir em nova aba
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground font-medium">Contrato</p>
                <p className="font-medium">{contractNumber}</p>
              </div>
              <div>
                <p className="text-muted-foreground font-medium">Cliente</p>
                <p className="font-medium">{clientName}</p>
                {client?.email && (
                  <p className="text-xs text-muted-foreground">{client.email}</p>
                )}
              </div>
              <div>
                <p className="text-muted-foreground font-medium">Valor</p>
                <p className="text-lg font-bold text-green-600">
                  {new Intl.NumberFormat("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  }).format(value)}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground font-medium">Vencimento</p>
                <p className="font-medium">{dueDate}</p>
              </div>
              {paymentDate && (
                <div>
                  <p className="text-muted-foreground font-medium">Data de pagamento</p>
                  <p className="font-medium">{paymentDate}</p>
                </div>
              )}
              {paymentMethod && (
                <div>
                  <p className="text-muted-foreground font-medium">Método de pagamento</p>
                  <p className="font-medium">{paymentMethod}</p>
                </div>
              )}
            </div>

            {status === "paid" && (
              <div className="border-t pt-4">
                <p className="text-sm font-medium text-muted-foreground">Pagamento</p>
                <p className="text-sm text-green-600 font-medium mt-1">Esta fatura já foi paga.</p>
                {paymentDate && (
                  <p className="text-xs text-muted-foreground mt-1">Data do pagamento: {paymentDate}</p>
                )}
              </div>
            )}
            {status !== "paid" && (pixAsCopiaECola || pixAsUrl || paymentLinkBoleto) && (
              <div className="border-t pt-4 space-y-4">
                <p className="text-sm font-medium text-muted-foreground">Pagamento</p>
                {pixAsCopiaECola && (
                  <PixQrCodeDisplay pixCopiaECola={pixAsCopiaECola} size={200} />
                )}
                <div className="flex flex-wrap gap-2 print:hidden">
                  {pixAsUrl && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(pixAsUrl, "_blank")}
                    >
                      <CreditCard className="mr-2 h-4 w-4" />
                      Pagar com PIX
                    </Button>
                  )}
                  {paymentLinkBoleto && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(paymentLinkBoleto, "_blank")}
                    >
                      <FileText className="mr-2 h-4 w-4" />
                      Ver Boleto
                    </Button>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default InvoiceView;
