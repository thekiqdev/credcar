import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { authService } from "../../lib/supabase";
import { storageService } from "../../lib/storage";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Upload,
  FileText,
  CheckCircle,
  AlertCircle,
  Clock,
  X,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface DocumentUploadProps {
  representativeName?: string;
  onComplete?: () => void;
  isStatusPage?: boolean;
}

const DocumentUpload: React.FC<DocumentUploadProps> = ({
  representativeName = "Representante",
  onComplete = () => {},
  isStatusPage = false,
}) => {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(authService.getCurrentUser());
  const [registrationStatus, setRegistrationStatus] = useState<string>(
    "Pendente de Aprovação",
  );

  useEffect(() => {
    const checkUserStatus = async () => {
      const user = authService.getCurrentUser();
      if (user) {
        // Check if documents are approved in the database
        const documentsApproved = await authService.checkDocumentsApproved(
          user.id,
        );

        if (documentsApproved) {
          // Documents are approved, redirect to dashboard
          navigate("/representante");
          return;
        }

        setCurrentUser(user);
        setRegistrationStatus(user.status);
      } else if (isStatusPage) {
        // If no user is logged in and this is the status page, redirect to login
        navigate("/");
      }
    };

    checkUserStatus();
  }, [navigate, isStatusPage]);
  const [documents, setDocuments] = useState([
    {
      id: 1,
      name: "Cartão do CNPJ",
      description: "Documento oficial do CNPJ da empresa",
      required: true,
      status: "pending", // pending, uploaded, approved, rejected
      file: null,
      rejectionReason: "",
    },
    {
      id: 2,
      name: "Comprovante de Endereço",
      description: "Comprovante de endereço da empresa (máximo 3 meses)",
      required: true,
      status: "pending",
      file: null,
      rejectionReason: "",
    },
    {
      id: 3,
      name: "Certidão de Antecedente Criminal",
      description: "Certidão negativa de antecedentes criminais do responsável",
      required: true,
      status: "pending",
      file: null,
      rejectionReason: "",
    },
    {
      id: 4,
      name: "Certidão Negativa Civil",
      description: "Certidão negativa de débitos civis do responsável",
      required: true,
      status: "pending",
      file: null,
      rejectionReason: "",
    },
  ]);

  const [isUploading, setIsUploading] = useState(false);

  const handleFileUpload = async (documentId: number, file: File) => {
    setIsUploading(true);

    try {
      if (!currentUser) {
        throw new Error("Usuário não autenticado");
      }

      // Find the document to get its name
      const document = documents.find((doc) => doc.id === documentId);
      if (!document) {
        throw new Error("Documento não encontrado");
      }

      // Upload file to storage
      const fileUrl = await storageService.uploadRepresentativeDocument(
        currentUser.id,
        document.name,
        file,
      );

      console.log(`Document ${documentId} uploaded successfully:`, fileUrl);

      setDocuments((prev) =>
        prev.map((doc) =>
          doc.id === documentId ? { ...doc, file, status: "uploaded" } : doc,
        ),
      );

      // TODO: Save document info to database
      // This should create a record in representative_documents table
    } catch (error) {
      console.error("Upload error:", error);
      alert(
        `Erro ao fazer upload: ${error instanceof Error ? error.message : "Erro desconhecido"}`,
      );
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileRemove = (documentId: number) => {
    setDocuments((prev) =>
      prev.map((doc) =>
        doc.id === documentId ? { ...doc, file: null, status: "pending" } : doc,
      ),
    );
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <Badge variant="outline" className="bg-gray-100 text-gray-800">
            <Clock className="w-3 h-3 mr-1" />
            Pendente
          </Badge>
        );
      case "uploaded":
        return (
          <Badge variant="outline" className="bg-blue-100 text-blue-800">
            <Upload className="w-3 h-3 mr-1" />
            Enviado
          </Badge>
        );
      case "approved":
        return (
          <Badge variant="outline" className="bg-green-100 text-green-800">
            <CheckCircle className="w-3 h-3 mr-1" />
            Aprovado
          </Badge>
        );
      case "rejected":
        return (
          <Badge variant="outline" className="bg-red-100 text-red-800">
            <AlertCircle className="w-3 h-3 mr-1" />
            Rejeitado
          </Badge>
        );
      default:
        return <Badge variant="outline">Desconhecido</Badge>;
    }
  };

  const uploadedCount = documents.filter(
    (doc) => doc.status === "uploaded" || doc.status === "approved",
  ).length;
  const totalRequired = documents.filter((doc) => doc.required).length;
  const progress = (uploadedCount / totalRequired) * 100;
  const allDocumentsUploaded = uploadedCount === totalRequired;

  const handleContinue = async () => {
    if (allDocumentsUploaded) {
      // Check if documents are approved in database
      if (currentUser) {
        const documentsApproved = await authService.checkDocumentsApproved(
          currentUser.id,
        );
        if (documentsApproved) {
          // Refresh user data and navigate to dashboard
          await authService.refreshUserData(currentUser.id);
          onComplete();
          navigate("/representante");
          return;
        }
      }

      // Documents not yet approved, show message
      alert(
        "Documentos enviados! Aguarde a aprovação do administrador para acessar o sistema.",
      );
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4">
      <Card className="w-full max-w-4xl bg-white shadow-lg">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center mb-4">
            <div className="h-8 w-8 rounded-md bg-red-600 mr-2"></div>
            <h1 className="text-3xl font-bold text-red-600">CredCar</h1>
          </div>
          <CardTitle className="text-2xl font-bold">
            {registrationStatus === "Pendente de Aprovação"
              ? `Status do Cadastro - ${currentUser?.name || representativeName}`
              : `Bem-vindo, ${currentUser?.name || representativeName}!`}
          </CardTitle>
          <CardDescription>
            {registrationStatus === "Pendente de Aprovação"
              ? "Seu cadastro foi realizado com sucesso! Acompanhe o status da sua solicitação e acelere o processo enviando os documentos necessários."
              : "Sua conta foi aprovada! Para liberar o acesso completo ao sistema, é necessário enviar os documentos abaixo."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Status Section */}
          {registrationStatus === "Pendente de Aprovação" && (
            <div className="mb-8 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="h-5 w-5 text-yellow-600" />
                <h3 className="text-lg font-semibold text-yellow-800">
                  Status: Aguardando Aprovação
                </h3>
              </div>
              <p className="text-sm text-yellow-700 mb-3">
                Sua solicitação de cadastro está sendo analisada pelo nosso
                time. Para acelerar o processo, você pode enviar os documentos
                necessários abaixo.
              </p>
              <div className="text-xs text-yellow-600">
                <strong>Próximos passos:</strong>
                <br />
                1. Envie os documentos obrigatórios (opcional, mas acelera o
                processo)
                <br />
                2. Aguarde a aprovação do administrador
                <br />
                3. Receba acesso completo ao sistema
              </div>
            </div>
          )}

          {/* Progress Section */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-semibold">
                {registrationStatus === "Pendente de Aprovação"
                  ? "Documentos (Opcional - Acelera Aprovação)"
                  : "Progresso do Envio"}
              </h3>
              <span className="text-sm text-muted-foreground">
                {uploadedCount} de {totalRequired} documentos enviados
              </span>
            </div>
            <Progress value={progress} className="mb-2" />
            <p className="text-sm text-muted-foreground">
              {registrationStatus === "Pendente de Aprovação"
                ? allDocumentsUploaded
                  ? "Todos os documentos foram enviados! Isso pode acelerar sua aprovação."
                  : "Envie os documentos para acelerar o processo de aprovação (opcional)."
                : allDocumentsUploaded
                  ? "Todos os documentos foram enviados! Aguarde a aprovação para acesso completo."
                  : "Envie todos os documentos obrigatórios para liberar o acesso ao sistema."}
            </p>
          </div>

          {/* Documents List */}
          <div className="space-y-6">
            <h3 className="text-lg font-semibold mb-4">
              {registrationStatus === "Pendente de Aprovação"
                ? "Documentos Necessários"
                : "Documentos Obrigatórios"}
            </h3>

            {documents.map((doc) => (
              <Card
                key={doc.id}
                className="border-2 border-dashed border-gray-200"
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <FileText className="h-5 w-5 text-gray-600" />
                        <h4 className="font-semibold">{doc.name}</h4>
                        {doc.required && (
                          <Badge
                            variant="outline"
                            className={
                              registrationStatus === "Pendente de Aprovação"
                                ? "bg-blue-50 text-blue-700 text-xs"
                                : "bg-red-50 text-red-700 text-xs"
                            }
                          >
                            {registrationStatus === "Pendente de Aprovação"
                              ? "Recomendado"
                              : "Obrigatório"}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">
                        {doc.description}
                      </p>
                      {getStatusBadge(doc.status)}
                    </div>
                  </div>

                  {doc.status === "pending" && (
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                      <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-600 mb-4">
                        Clique para selecionar o arquivo ou arraste e solte aqui
                      </p>
                      <input
                        type="file"
                        id={`file-${doc.id}`}
                        className="hidden"
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            handleFileUpload(doc.id, file);
                          }
                        }}
                        disabled={isUploading}
                      />
                      <Button
                        variant="outline"
                        onClick={() => {
                          const fileInput = document.getElementById(
                            `file-${doc.id}`,
                          ) as HTMLInputElement;
                          if (fileInput) {
                            fileInput.click();
                          }
                        }}
                        disabled={isUploading}
                      >
                        {isUploading ? "Enviando..." : "Selecionar Arquivo"}
                      </Button>
                      <p className="text-xs text-gray-500 mt-2">
                        Formatos aceitos: PDF, JPG, PNG (máx. 5MB)
                      </p>
                    </div>
                  )}

                  {(doc.status === "uploaded" || doc.status === "approved") &&
                    doc.file && (
                      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <CheckCircle className="h-5 w-5 text-green-600" />
                            <span className="text-sm font-medium text-green-800">
                              {doc.file.name}
                            </span>
                            <span className="text-xs text-green-600">
                              ({(doc.file.size / 1024 / 1024).toFixed(2)} MB)
                            </span>
                          </div>
                          {doc.status === "uploaded" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleFileRemove(doc.id)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                        {doc.status === "uploaded" && (
                          <p className="text-xs text-green-600 mt-1">
                            Documento enviado com sucesso! Aguardando aprovação.
                          </p>
                        )}
                        {doc.status === "approved" && (
                          <p className="text-xs text-green-600 mt-1">
                            Documento aprovado!
                          </p>
                        )}
                      </div>
                    )}

                  {doc.status === "rejected" && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertCircle className="h-5 w-5 text-red-600" />
                        <span className="text-sm font-medium text-red-800">
                          Documento rejeitado
                        </span>
                      </div>
                      <p className="text-sm text-red-700 mb-3">
                        Motivo:{" "}
                        {doc.rejectionReason ||
                          "Documento não atende aos requisitos."}
                      </p>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setDocuments((prev) =>
                            prev.map((document) =>
                              document.id === doc.id
                                ? { ...document, status: "pending", file: null }
                                : document,
                            ),
                          );
                        }}
                      >
                        Enviar Novamente
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Action Buttons */}
          <div className="flex justify-between items-center mt-8 pt-6 border-t">
            <Button
              variant="outline"
              onClick={async () => {
                console.log("🔓 Document upload logout clicked");
                await authService.logout();
                console.log("✅ Logout complete, navigating to home");
                navigate("/", { replace: true });
              }}
            >
              Sair do Sistema
            </Button>

            <div className="flex gap-4">
              {registrationStatus === "Pendente de Aprovação" ? (
                <div className="flex flex-col items-end gap-2">
                  <p className="text-sm text-gray-600">
                    {allDocumentsUploaded
                      ? "Documentos enviados! Aguarde a aprovação do administrador."
                      : "Aguardando aprovação do administrador..."}
                  </p>
                  <Button
                    onClick={() => window.location.reload()}
                    variant="outline"
                    className="text-red-600 border-red-600 hover:bg-red-50"
                  >
                    Atualizar Status
                  </Button>
                </div>
              ) : (
                <>
                  {!allDocumentsUploaded && (
                    <Alert className="max-w-md">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        Envie todos os documentos obrigatórios para continuar.
                      </AlertDescription>
                    </Alert>
                  )}

                  <Button
                    onClick={handleContinue}
                    disabled={!allDocumentsUploaded}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    {allDocumentsUploaded
                      ? "Continuar para o Sistema"
                      : "Aguardando Documentos"}
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DocumentUpload;
