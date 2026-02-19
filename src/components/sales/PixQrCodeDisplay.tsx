import React, { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/button";
import { Copy, Check, Smartphone } from "lucide-react";

interface PixQrCodeDisplayProps {
  /** String PIX copia e cola (EMV) */
  pixCopiaECola: string;
  /** Tamanho do QR em pixels */
  size?: number;
  /** Classe CSS do container */
  className?: string;
}

/**
 * Exibe QR Code e botão Copiar para pagamento PIX (código copia e cola).
 * Design profissional para uso em faturas (admin, cliente, página avulsa).
 */
const PixQrCodeDisplay: React.FC<PixQrCodeDisplayProps> = ({
  pixCopiaECola,
  size = 220,
  className = "",
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(pixCopiaECola);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = pixCopiaECola;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand("copy");
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } finally {
        document.body.removeChild(ta);
      }
    }
  };

  return (
    <div
      className={`
        pix-qr-code-display
        rounded-xl border border-border/80 bg-gradient-to-b from-muted/40 to-muted/20
        shadow-sm overflow-hidden
        ${className}
      `}
    >
      <div className="px-4 pt-4 pb-1">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-600">
            <Smartphone className="h-4 w-4" />
          </span>
          Pagamento via PIX
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Escaneie o QR Code no app do seu banco ou copie o código abaixo
        </p>
      </div>

      <div className="p-4 pt-2 flex flex-col sm:flex-row items-center gap-6">
        <div
          className="flex-shrink-0 rounded-xl border-2 border-white bg-white p-3 shadow-md print:border-gray-200"
          aria-hidden
        >
          <QRCodeSVG
            value={pixCopiaECola}
            size={size}
            level="M"
            bgColor="#ffffff"
            fgColor="#0f172a"
            includeMargin={false}
          />
        </div>

        <div className="flex-1 min-w-0 w-full sm:w-auto space-y-3">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Código PIX copia e cola
          </p>
          <Button
            type="button"
            variant="outline"
            size="default"
            onClick={handleCopy}
            className="w-full sm:w-auto print:hidden border-emerald-200 bg-white hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-700"
          >
            {copied ? (
              <>
                <Check className="mr-2 h-4 w-4 text-emerald-600" />
                Copiado! Cole no app do banco
              </>
            ) : (
              <>
                <Copy className="mr-2 h-4 w-4" />
                Copiar código PIX
              </>
            )}
          </Button>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Após copiar, abra o app do seu banco, escolha Pagar com PIX e cole o código na opção &quot;Copia e cola&quot;.
          </p>
        </div>
      </div>
    </div>
  );
};

export default PixQrCodeDisplay;
