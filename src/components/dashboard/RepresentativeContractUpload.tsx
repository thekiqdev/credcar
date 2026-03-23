import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  Upload, 
  FileText, 
  Download, 
  Trash2, 
  CheckCircle,
  AlertCircle,
  Eye 
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { getUploadServerBaseUrl } from '@/lib/invoice-asaas.client';

interface RepresentativeContractUploadProps {
  representativeId: string;
  representativeCpfCnpj: string;
  contractProfile?: string;
  onContractUploaded: (downloadLink: string) => void;
}

const RepresentativeContractUpload: React.FC<RepresentativeContractUploadProps> = ({
  representativeId,
  representativeCpfCnpj,
  contractProfile,
  onContractUploaded
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!allowedTypes.includes(file.type)) {
      setUploadError('Apenas arquivos PDF e Word são permitidos.');
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setUploadError('Arquivo muito grande. Tamanho máximo: 10MB.');
      return;
    }

    setIsUploading(true);
    setUploadError(null);
    setUploadSuccess(false);

    try {
      // Create FormData for upload
      const formData = new FormData();
      formData.append('file', file);
      formData.append('representativeId', representativeId);
      formData.append('cpfCnpj', representativeCpfCnpj);

      console.log('📁 Uploading contract to local server...');

      // Determine base URL based on environment
      const baseUrl = getUploadServerBaseUrl();

      const uploadUrl = `${baseUrl}/api/upload-representative-contract`;
      console.log('🌐 Upload URL:', uploadUrl);
      console.log('🏠 Hostname:', window.location.hostname);
      console.log('📦 FormData keys:', Array.from(formData.keys()));

      // Upload file to local server
      const response = await fetch(uploadUrl, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        let errorMessage = 'Erro no upload';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch (e) {
          // Se não conseguir parsear JSON, usar a mensagem de status
          errorMessage = `Erro ${response.status}: ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }

      const result = await response.json();
      console.log('✅ File uploaded successfully:', result);

      const downloadLink = result.data.downloadUrl;
      console.log('🔗 Download link:', downloadLink);

      // Update profiles table with contract_profile
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ contract_profile: downloadLink })
        .eq('id', representativeId);

      if (updateError) {
        console.error('❌ Database update error:', updateError);
        throw new Error(`Erro ao atualizar perfil: ${updateError.message}`);
      }

      console.log('✅ Profile updated with contract link');
      
      setUploadSuccess(true);
      onContractUploaded(downloadLink);
      
      // Reset file input
      event.target.value = '';

    } catch (error) {
      console.error('❌ Contract upload error:', error);
      setUploadError(error instanceof Error ? error.message : 'Erro desconhecido');
    } finally {
      setIsUploading(false);
    }
  };

  const handleViewContract = () => {
    if (!contractProfile) return;

    // Extract relative path from the full URL
    let relativePath = contractProfile;
    
    // If it's a full URL, extract the path parameter
    if (contractProfile.includes('?path=')) {
      const urlParams = new URLSearchParams(contractProfile.split('?')[1]);
      relativePath = urlParams.get('path') || '';
    } else if (contractProfile.includes('/documentos/')) {
      // Extract path after /documentos/
      relativePath = contractProfile.split('/documentos/')[1];
    }

    // Decode the path
    relativePath = decodeURIComponent(relativePath);

    // Replace backslashes with forward slashes
    relativePath = relativePath.replace(/\\/g, '/');

    console.log('👁️ Viewing contract:', relativePath);

    // Determine base URL based on environment
    const baseUrl = getUploadServerBaseUrl();

    // Check file type
    const fileExtension = relativePath.split('.').pop()?.toLowerCase();
    const viewableTypes = ['pdf'];

    if (viewableTypes.includes(fileExtension || '')) {
      // Open viewable files in new tab
      const viewUrl = `${baseUrl}/api/view-file?path=${encodeURIComponent(relativePath)}`;
      window.open(viewUrl, '_blank');
    } else {
      // For non-viewable files (DOC, DOCX), download them
      const downloadUrl = `${baseUrl}/api/download-file?path=${encodeURIComponent(relativePath)}`;
      window.open(downloadUrl, '_blank');
    }
  };

  const handleDeleteContract = async () => {
    if (!contractProfile) return;

    try {
      console.log('🗑️ Deleting contract from local server...');

      // Determine base URL based on environment
      const baseUrl = getUploadServerBaseUrl();

      // Delete file from local server
      const response = await fetch(`${baseUrl}/api/delete-representative-contract`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          representativeId: representativeId,
          cpfCnpj: representativeCpfCnpj
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao deletar arquivo');
      }

      const result = await response.json();
      console.log('✅ Contract deleted successfully:', result);

      // Remove contract_profile from database
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ contract_profile: null })
        .eq('id', representativeId);

      if (updateError) {
        console.error('❌ Database update error:', updateError);
        throw new Error(`Erro ao atualizar perfil: ${updateError.message}`);
      }

      console.log('✅ Profile updated - contract removed');
      onContractUploaded('');

    } catch (error) {
      console.error('❌ Contract deletion error:', error);
      setUploadError(error instanceof Error ? error.message : 'Erro ao deletar contrato');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Contrato Representante
        </CardTitle>
        <CardDescription>
          Upload do contrato firmado com o representante
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {contractProfile ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <div className="flex-1">
                <p className="text-sm font-medium text-green-800">
                  Contrato enviado com sucesso
                </p>
                <p className="text-xs text-green-600">
                  Arquivo disponível para download
                </p>
              </div>
              <Badge variant="secondary" className="bg-green-100 text-green-800">
                Disponível
              </Badge>
            </div>
            
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleViewContract}
                className="flex-1"
              >
                <Eye className="h-4 w-4 mr-2" />
                Visualizar
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(contractProfile, '_blank')}
                className="flex-1"
              >
                <Download className="h-4 w-4 mr-2" />
                Baixar
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDeleteContract}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
              <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-600 mb-2">
                Nenhum contrato enviado
              </p>
              <p className="text-xs text-gray-500">
                Faça upload do contrato do representante (PDF ou Word)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="contract-upload">
                Selecionar Arquivo
              </Label>
              <Input
                id="contract-upload"
                type="file"
                accept=".pdf,.doc,.docx"
                onChange={handleFileUpload}
                disabled={isUploading}
                className="cursor-pointer"
              />
              <p className="text-xs text-gray-500">
                Formatos aceitos: PDF, DOC, DOCX • Tamanho máximo: 10MB
              </p>
            </div>
          </div>
        )}

        {isUploading && (
          <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
            <p className="text-sm text-blue-800">
              Enviando contrato...
            </p>
          </div>
        )}

        {uploadSuccess && (
          <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <p className="text-sm text-green-800">
              Contrato enviado com sucesso!
            </p>
          </div>
        )}

        {uploadError && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <p className="text-sm text-red-800">
              {uploadError}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default RepresentativeContractUpload;
