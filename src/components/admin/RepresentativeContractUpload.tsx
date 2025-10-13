import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload, FileText, CheckCircle, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface RepresentativeContractUploadProps {
  representativeId: string;
  representativeName: string;
  onUploadComplete?: () => void;
}

const RepresentativeContractUpload: React.FC<RepresentativeContractUploadProps> = ({
  representativeId,
  representativeName,
  onUploadComplete
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validar tipo de arquivo (PDF, DOC, DOCX)
      const allowedTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ];
      
      if (!allowedTypes.includes(file.type)) {
        setMessage('Por favor, selecione um arquivo PDF ou Word (.pdf, .doc, .docx)');
        setUploadStatus('error');
        return;
      }

      // Validar tamanho (máximo 10MB)
      if (file.size > 10 * 1024 * 1024) {
        setMessage('Arquivo muito grande. Tamanho máximo: 10MB');
        setUploadStatus('error');
        return;
      }

      setSelectedFile(file);
      setUploadStatus('idle');
      setMessage('');
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setMessage('Por favor, selecione um arquivo');
      setUploadStatus('error');
      return;
    }

    setIsUploading(true);
    setUploadStatus('idle');
    setMessage('');

    try {
      const formData = new FormData();
      formData.append('contract', selectedFile);
      formData.append('representativeId', representativeId);

      const response = await fetch('http://localhost:3001/api/upload-representative-contract', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (result.success) {
        setUploadStatus('success');
        setMessage(`Contrato enviado com sucesso para ${representativeName}`);
        setSelectedFile(null);
        
        // Limpar input de arquivo
        const fileInput = document.getElementById('contract-file') as HTMLInputElement;
        if (fileInput) {
          fileInput.value = '';
        }

        // Callback para atualizar dados
        if (onUploadComplete) {
          onUploadComplete();
        }
      } else {
        setUploadStatus('error');
        setMessage(result.message || 'Erro ao enviar contrato');
      }
    } catch (error) {
      console.error('Erro no upload:', error);
      setUploadStatus('error');
      setMessage('Erro de conexão. Tente novamente.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Upload de Contrato de Representação
        </CardTitle>
        <CardDescription>
          Envie o contrato de representação comercial para {representativeName}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="contract-file">Arquivo do Contrato</Label>
          <Input
            id="contract-file"
            type="file"
            accept=".pdf,.doc,.docx"
            onChange={handleFileSelect}
            disabled={isUploading}
          />
          <p className="text-sm text-muted-foreground">
            Formatos aceitos: PDF, DOC, DOCX (máximo 10MB)
          </p>
        </div>

        {selectedFile && (
          <div className="p-3 bg-muted rounded-lg">
            <p className="text-sm font-medium">Arquivo selecionado:</p>
            <p className="text-sm text-muted-foreground">
              {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
            </p>
          </div>
        )}

        {message && (
          <Alert variant={uploadStatus === 'success' ? 'default' : 'destructive'}>
            {uploadStatus === 'success' ? (
              <CheckCircle className="h-4 w-4" />
            ) : (
              <AlertCircle className="h-4 w-4" />
            )}
            <AlertDescription>{message}</AlertDescription>
          </Alert>
        )}

        <Button
          onClick={handleUpload}
          disabled={!selectedFile || isUploading}
          className="w-full"
        >
          {isUploading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Enviando...
            </>
          ) : (
            <>
              <Upload className="mr-2 h-4 w-4" />
              Enviar Contrato
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};

export default RepresentativeContractUpload;
