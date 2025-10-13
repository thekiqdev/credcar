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
  AlertCircle 
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

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
      // Create folder structure: documentos/cpf/contrato-representante/
      const folderPath = `documentos/${representativeCpfCnpj}/contrato-representante`;
      
      // Generate unique filename
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const fileExtension = file.name.split('.').pop();
      const fileName = `contrato-representante-${timestamp}.${fileExtension}`;
      const filePath = `${folderPath}/${fileName}`;

      console.log('📁 Uploading contract to:', filePath);

      // Upload file to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        console.error('❌ Upload error:', uploadError);
        throw new Error(`Erro no upload: ${uploadError.message}`);
      }

      console.log('✅ File uploaded successfully:', uploadData);

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('documents')
        .getPublicUrl(filePath);

      const downloadLink = urlData.publicUrl;
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

  const handleDeleteContract = async () => {
    if (!contractProfile) return;

    try {
      // Extract file path from URL
      const url = new URL(contractProfile);
      const pathParts = url.pathname.split('/');
      const filePath = pathParts.slice(pathParts.indexOf('documents') + 1).join('/');

      console.log('🗑️ Deleting contract file:', filePath);

      // Delete file from storage
      const { error: deleteError } = await supabase.storage
        .from('documents')
        .remove([filePath]);

      if (deleteError) {
        console.error('❌ Delete error:', deleteError);
        throw new Error(`Erro ao deletar arquivo: ${deleteError.message}`);
      }

      // Remove contract_profile from database
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ contract_profile: null })
        .eq('id', representativeId);

      if (updateError) {
        console.error('❌ Database update error:', updateError);
        throw new Error(`Erro ao atualizar perfil: ${updateError.message}`);
      }

      console.log('✅ Contract deleted successfully');
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
                onClick={() => window.open(contractProfile, '_blank')}
                className="flex-1"
              >
                <Download className="h-4 w-4 mr-2" />
                Baixar Contrato
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDeleteContract}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Remover
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
