import React, { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/button";
import { Copy, Check } from "lucide-react";

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
 */
const PixQrCodeDisplay: React.FC<PixQrCodeDisplayProps> = ({
  pixCopiaECola,
  size = 200,
  className = "",
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(pixCopiaECola);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback: select + execCommand
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
    <div className={`pix-qr-code-display rounded-lg border bg-muted/30 p-4 ${className}`}>
      <p className="text-sm font-medium text-muted-foreground mb-3">
        Código PIX copia e cola
      </p>
      <div className="flex flex-col sm:flex-row items-center gap-4">
        <div
          className="flex-shrink-0 rounded-md border border-border bg-white p-2 print:border-gray-300"
          aria-hidden
        >
          <QRCodeSVG
            value={pixCopiaECola}
            size={size}
            level="M"
            bgColor="#ffffff"
            fgColor="#000000"
            includeMargin={false}
          />
        </div>
        <div className="flex-1 min-w-0 space-y-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleCopy}
            className="print:hidden"
          >
            {copied ? (
              <>
                <Check className="mr-2 h-4 w-4 text-green-600" />
                Copiado!
              </>
            ) : (
              <>
                <Copy className="mr-2 h-4 w-4" />
                Copiar código PIX
              </>
            )}
          </Button>
          <p className="text-xs text-muted-foreground">
            Escaneie o QR Code ou copie o código e cole no app do seu banco para pagar com PIX.
          </p>
        </div>
      </div>
    </div>
  );
};

export default PixQrCodeDisplay;
