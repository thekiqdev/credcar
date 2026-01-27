/**
 * Componente de Notificação de Documentos
 * Mostra status dos documentos e botão para enviar
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { 
  FileText, 
  Upload, 
  CheckCircle, 
  Clock, 
  AlertCircle
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import DocumentUploadModal from './DocumentUploadModal';

interface DocumentStatus {
  id: number;
  document_type: string;
  status: 'Pendente' | 'Aprovado' | 'Reprovado';
  uploaded_at?: string;
  approved_at?: string;
  rejection_reason?: string;
}

interface DocumentNotificationProps {
  representativeId: string;
  representativeName?: string;
  representativeCpfCnpj?: string;
  documentsApproved?: boolean | null; // Campo documents_approved da tabela profiles
  onClose?: () => void;
}

export const DocumentNotification: React.FC<DocumentNotificationProps> = ({
  representativeId,
  representativeName = 'Representante',
  representativeCpfCnpj = '',
  documentsApproved = false,
  onClose
}) => {
  const navigate = useNavigate();
  const [documents, setDocuments] = useState<DocumentStatus[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDismissed, setIsDismissed] = useState(false); // Sempre false - notificação fixa
  const [showUploadModal, setShowUploadModal] = useState(false);

  useEffect(() => {
    loadDocumentStatus();
    
    // Removido polling automático para evitar piscar do modal
    // const interval = setInterval(loadDocumentStatus, 30000);
    // return () => clearInterval(interval);
  }, [representativeId]);

  const loadDocumentStatus = async () => {
    try {
      setIsLoading(true);
      
      const { data, error } = await supabase
        .from('representative_documents')
        .select('*')
        .eq('representative_id', representativeId)
        .order('document_type');

      if (error) {
        console.error('Error loading documents:', error);
        return;
      }

      setDocuments(data || []);

      // REMOVIDO: Aprovação automática de documentos
      // A aprovação do representante deve ser feita manualmente pelo admin através do botão "Aprovar Representante"
    } catch (error) {
      console.error('Error loading document status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getDocumentProgress = () => {
    if (documents.length === 0) return 0;
    
    const approved = documents.filter(doc => doc.status === 'Aprovado').length;
    return (approved / documents.length) * 100;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Aprovado':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'Reprovado':
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      default:
        return <Clock className="h-4 w-4 text-yellow-600" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'Aprovado':
        return 'Aprovado';
      case 'Reprovado':
        return 'Reprovado';
      default:
        return 'Pendente';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Aprovado':
        return 'text-green-600';
      case 'Reprovado':
        return 'text-red-600';
      default:
        return 'text-yellow-600';
    }
  };

  const handleUploadDocuments = () => {
    setShowUploadModal(true);
  };

  const handleUploadComplete = () => {
    // Recarregar status dos documentos apenas uma vez
    loadDocumentStatus();
  };

  // Não mostrar apenas se:
  // 1. O campo documents_approved da tabela profiles for true E
  // 2. Todos os documentos individuais estão aprovados
  // Isso garante que mesmo que todos os documentos estejam aprovados individualmente,
  // a notificação ainda aparecerá se o admin não tiver aprovado o representante
  const allDocumentsApproved = getDocumentProgress() === 100;
  const profileDocumentsApproved = documentsApproved === true;
  
  // Só ocultar se ambos forem true (perfil aprovado E todos documentos aprovados)
  if (profileDocumentsApproved && allDocumentsApproved) {
    return null;
  }

  if (isLoading) {
    return (
      <Card className="mb-6 border-yellow-200 bg-yellow-50">
        <CardContent className="p-4">
          <div className="flex items-center space-x-2">
            <FileText className="h-5 w-5 text-yellow-600" />
            <span className="text-sm text-yellow-800">Carregando status dos documentos...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="mb-6 border-yellow-200 bg-yellow-50">
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-3 flex-1">
              <FileText className="h-5 w-5 text-yellow-600 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-yellow-800 mb-2">
                  📋 Documentação Obrigatória
                </h3>
                
                <p className="text-sm text-yellow-700 mb-3">
                  <strong>ATENÇÃO:</strong> Para ativar seu perfil, você DEVE enviar TODOS os documentos obrigatórios. 
                  Esta notificação permanecerá até que todos os documentos sejam enviados e aprovados.
                </p>

                {/* Progress Bar */}
                <div className="mb-3">
                  <div className="flex justify-between text-xs text-yellow-700 mb-1">
                    <span>Progresso dos Documentos</span>
                    <span>{Math.round(getDocumentProgress())}%</span>
                  </div>
                  <Progress 
                    value={getDocumentProgress()} 
                    className="h-2 bg-yellow-100"
                  />
                </div>


                {/* Action Button - Apenas Enviar Documentos */}
                <div className="flex justify-start">
                  <Button
                    onClick={handleUploadDocuments}
                    size="sm"
                    className="bg-yellow-600 hover:bg-yellow-700 text-white"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Enviar Documentos
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Upload Modal */}
      {showUploadModal && (
        <DocumentUploadModal
          representativeId={representativeId}
          representativeName={representativeName}
          representativeCpfCnpj={representativeCpfCnpj}
          onClose={() => setShowUploadModal(false)}
          onUploadComplete={handleUploadComplete}
        />
      )}
    </>
  );
};

export default DocumentNotification;