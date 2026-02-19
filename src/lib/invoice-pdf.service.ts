/**
 * Serviço de geração de PDF de faturas
 * Usa jsPDF para criar um PDF profissional com dados da fatura e da empresa.
 */

import { jsPDF } from "jspdf";
import type { InvoiceViewData } from "@/components/sales/InvoiceView";

export interface CompanyInfoForPdf {
  company_name: string;
  company_cnpj: string;
  company_address: string;
  company_phone: string;
  company_email: string;
}

const FONT_SIZE_TITLE = 16;
const FONT_SIZE_HEADER = 11;
const FONT_SIZE_SMALL = 9;
const MARGIN = 20;
const LINE_HEIGHT = 6;
const PAGE_WIDTH = 210; // A4
const PAGE_HEIGHT = 297;

function getInvoiceDisplayValues(inv: InvoiceViewData) {
  const invoiceNumber = inv.invoiceNumber ?? inv.invoice_code ?? `FAT-${inv.id}`;
  const contractNumber =
    inv.contractNumber ??
    inv.contracts?.contract_number ??
    inv.contract_number ??
    "N/A";
  const dueDate =
    inv.dueDate ??
    (inv.due_date ? new Date(inv.due_date).toLocaleDateString("pt-BR") : "N/A");
  const value = inv.value ?? inv.amount ?? 0;
  const status =
    inv.status === "Pago" || inv.status === "paid"
      ? "PAGO"
      : inv.status === "overdue" || inv.status === "Vencido"
        ? "VENCIDO"
        : "PENDENTE";
  const paymentDate = inv.paymentDate
    ?? (inv.paid_at ? new Date(inv.paid_at).toLocaleDateString("pt-BR") : "");
  const paymentMethod = inv.paymentMethod ?? inv.payment_method ?? "";
  const installmentNumber = inv.installmentNumber ?? inv.installment_number;
  const client = inv.contracts?.clients;
  const clientName = client?.full_name ?? client?.name ?? "—";
  const clientEmail = client?.email ?? "";
  const clientCpf = (client as { cpf_cnpj?: string })?.cpf_cnpj ?? "";

  return {
    invoiceNumber,
    contractNumber,
    dueDate,
    value,
    status,
    paymentDate,
    paymentMethod,
    installmentNumber,
    clientName,
    clientEmail,
    clientCpf,
  };
}

/**
 * Gera um PDF da fatura e retorna o blob para download.
 */
export async function generateInvoicePdf(
  invoice: InvoiceViewData,
  company?: CompanyInfoForPdf | null
): Promise<Blob> {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  let y = MARGIN;

  const companyName = company?.company_name ?? "CredCar Soluções Financeiras";
  const companyCnpj = company?.company_cnpj ?? "";
  const companyAddress = company?.company_address ?? "";
  const companyPhone = company?.company_phone ?? "";
  const companyEmail = company?.company_email ?? "";

  // --- Cabeçalho da empresa ---
  doc.setFontSize(FONT_SIZE_TITLE);
  doc.setFont("helvetica", "bold");
  doc.text(companyName, MARGIN, y);
  y += LINE_HEIGHT + 2;

  doc.setFontSize(FONT_SIZE_SMALL);
  doc.setFont("helvetica", "normal");
  if (companyCnpj) {
    doc.text(`CNPJ: ${companyCnpj}`, MARGIN, y);
    y += LINE_HEIGHT;
  }
  if (companyAddress) {
    doc.text(companyAddress, MARGIN, y);
    y += LINE_HEIGHT;
  }
  if (companyPhone || companyEmail) {
    doc.text([companyPhone, companyEmail].filter(Boolean).join(" | "), MARGIN, y);
    y += LINE_HEIGHT;
  }
  y += 8;

  // Linha separadora
  doc.setDrawColor(200, 200, 200);
  doc.line(MARGIN, y, PAGE_WIDTH - MARGIN, y);
  y += 10;

  // --- Título ---
  doc.setFontSize(FONT_SIZE_TITLE);
  doc.setFont("helvetica", "bold");
  doc.text("FATURA", MARGIN, y);
  y += LINE_HEIGHT + 4;

  const d = getInvoiceDisplayValues(invoice);

  doc.setFontSize(FONT_SIZE_HEADER);
  doc.setFont("helvetica", "normal");

  const col1 = MARGIN;
  const col2 = MARGIN + 70;
  const labelW = 45;

  const row = (label: string, value: string, indent = 0) => {
    const x = col1 + indent;
    doc.setFont("helvetica", "bold");
    doc.text(label, x, y);
    doc.setFont("helvetica", "normal");
    doc.text(value, x + labelW, y);
    y += LINE_HEIGHT;
  };

  row("Número:", d.invoiceNumber);
  row("Contrato:", d.contractNumber);
  row("Cliente:", d.clientName);
  if (d.clientEmail) row("E-mail:", d.clientEmail);
  if (d.clientCpf) row("CPF/CNPJ:", d.clientCpf);
  if (d.installmentNumber != null && d.installmentNumber > 0) {
    row("Parcela:", `${d.installmentNumber}ª`);
  }
  row("Vencimento:", d.dueDate);
  row(
    "Valor:",
    new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(d.value)
  );
  row("Status:", d.status);
  if (d.paymentDate) row("Data pagamento:", d.paymentDate);
  if (d.paymentMethod) row("Método de pagamento:", d.paymentMethod);

  y += 8;

  // Instruções de pagamento (se pendente)
  const paymentLinkPix = invoice.paymentLinkPix ?? invoice.payment_link_pix;
  const paymentLinkBoleto = invoice.paymentLinkBoleto ?? invoice.payment_link_boleto;
  if (
    (d.status === "PENDENTE" || d.status === "VENCIDO") &&
    (paymentLinkPix || paymentLinkBoleto)
  ) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(FONT_SIZE_SMALL);
    doc.text("Pagamento:", MARGIN, y);
    y += LINE_HEIGHT;
    doc.setFont("helvetica", "normal");
    if (paymentLinkPix) doc.text("• PIX: utilize o link enviado por e-mail ou no painel.", MARGIN, y), (y += LINE_HEIGHT);
    if (paymentLinkBoleto) doc.text("• Boleto: utilize o link enviado por e-mail ou no painel.", MARGIN, y), (y += LINE_HEIGHT);
    y += 4;
  }

  // Rodapé
  y = PAGE_HEIGHT - MARGIN - 10;
  doc.setDrawColor(200, 200, 200);
  doc.line(MARGIN, y, PAGE_WIDTH - MARGIN, y);
  y += LINE_HEIGHT;
  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  doc.text(
    `Documento gerado em ${new Date().toLocaleString("pt-BR")} - ${companyName}`,
    MARGIN,
    y
  );
  doc.setTextColor(0, 0, 0);

  const blob = doc.output("blob");
  return blob;
}

/**
 * Gera o PDF e dispara o download no navegador.
 */
export async function downloadInvoicePdf(
  invoice: InvoiceViewData,
  company?: CompanyInfoForPdf | null,
  filename?: string
): Promise<void> {
  const blob = await generateInvoicePdf(invoice, company);
  const invoiceNumber =
    invoice.invoiceNumber ?? invoice.invoice_code ?? `FAT-${invoice.id}`;
  const name = filename ?? `Fatura-${invoiceNumber}.pdf`;
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
