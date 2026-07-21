import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  PlusCircle,
  Edit,
  Trash2,
  MoreHorizontal,
  Eye,
  Copy,
  FileText,
  Users,
  Lock,
  Star,
  StarOff,
} from "lucide-react";
import { contractTemplateService } from "../../lib/supabase";
import ContractTemplateEditor from "./ContractTemplateEditor";

interface ContractTemplate {
  id: number;
  name: string;
  description: string | null;
  content: string;
  visibility: "admin" | "all";
  is_default?: boolean;
  created_by: string | null;
  created_at: string | null;
  updated_at: string | null;
}

interface ContractTemplateManagementProps {
  currentUserId?: string;
  isAdmin?: boolean;
}

const ContractTemplateManagement: React.FC<ContractTemplateManagementProps> = ({
  currentUserId = "admin",
  isAdmin = true,
}) => {
  const [templates, setTemplates] = useState<ContractTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] =
    useState<ContractTemplate | null>(null);
  const [alert, setAlert] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const [newTemplate, setNewTemplate] = useState({
    name: "",
    description: "",
    visibility: "admin" as "admin" | "all",
  });

  useEffect(() => {
    loadTemplates();
  }, []);

  useEffect(() => {
    if (alert) {
      const timer = setTimeout(() => setAlert(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [alert]);

  const loadTemplates = async () => {
    try {
      setIsLoading(true);
      const data = await contractTemplateService.getAll(isAdmin);
      setTemplates(data);
    } catch (error) {
      console.error("Error loading templates:", error);
      setAlert({
        type: "error",
        message: "Erro ao carregar modelos de contrato",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateTemplate = async () => {
    if (!newTemplate.name.trim()) {
      setAlert({ type: "error", message: "Nome do modelo é obrigatório" });
      return;
    }

    try {
      console.log("Creating template with data:", {
        ...newTemplate,
        content: "<h1>Novo Modelo de Contrato</h1><p>Conteúdo do modelo...</p>",
        created_by: currentUserId,
      });

      const result = await contractTemplateService.create({
        ...newTemplate,
        content: "<h1>Novo Modelo de Contrato</h1><p>Conteúdo do modelo...</p>",
        created_by: currentUserId, // This will be set to null in the service to avoid FK issues
      });

      console.log("Template created successfully:", result);
      setAlert({ type: "success", message: "Modelo criado com sucesso!" });
      setIsCreateDialogOpen(false);
      setNewTemplate({ name: "", description: "", visibility: "admin" });
      loadTemplates();
    } catch (error) {
      console.error("Error creating template - Full error object:", error);
      console.error("Error type:", typeof error);
      console.error("Error constructor:", error?.constructor?.name);

      // Extract more detailed error information
      let errorMessage = "Erro ao criar modelo";

      // Handle Error instances
      if (error instanceof Error) {
        console.error("Error message:", error.message);
        console.error("Error stack:", error.stack);

        // Check for specific Supabase errors in the message
        if (error.message.includes("duplicate key")) {
          errorMessage = "Já existe um modelo com este nome";
        } else if (error.message.includes("violates foreign key")) {
          errorMessage = "Erro de referência no banco de dados";
        } else if (error.message.includes("violates not-null")) {
          errorMessage = "Campos obrigatórios não preenchidos";
        } else if (error.message.includes("permission denied")) {
          errorMessage = "Sem permissão para criar modelo";
        } else if (
          error.message.includes("relation") &&
          error.message.includes("does not exist")
        ) {
          errorMessage = "Tabela não encontrada no banco de dados";
        } else if (error.message.includes("JWT")) {
          errorMessage = "Erro de autenticação - faça login novamente";
        } else if (
          error.message.includes("network") ||
          error.message.includes("fetch")
        ) {
          errorMessage = "Erro de conexão - verifique sua internet";
        } else {
          errorMessage = `Erro: ${error.message}`;
        }
      }

      // Handle Supabase error objects
      if (
        typeof error === "object" &&
        error !== null &&
        !Array.isArray(error)
      ) {
        const supabaseError = error as any;

        console.error(
          "Supabase error object keys:",
          Object.keys(supabaseError),
        );

        if (supabaseError.code) {
          console.error("Supabase error code:", supabaseError.code);
          console.error("Supabase error message:", supabaseError.message);
          console.error("Supabase error details:", supabaseError.details);
          console.error("Supabase error hint:", supabaseError.hint);

          // Map common Supabase error codes to user-friendly messages
          switch (supabaseError.code) {
            case "23505":
              errorMessage = "Já existe um modelo com este nome";
              break;
            case "23503":
              errorMessage = "Erro de referência no banco de dados";
              break;
            case "23502":
              errorMessage = "Campos obrigatórios não preenchidos";
              break;
            case "42501":
              errorMessage = "Sem permissão para criar modelo";
              break;
            case "42P01":
              errorMessage = "Tabela não encontrada no banco de dados";
              break;
            case "PGRST301":
              errorMessage = "Erro de autenticação - faça login novamente";
              break;
            default:
              errorMessage = `Erro do banco (${supabaseError.code}): ${supabaseError.message || "Erro desconhecido"}`;
          }
        } else if (supabaseError.message) {
          errorMessage = `Erro: ${supabaseError.message}`;
        } else {
          // Try to extract meaningful information from the error object
          const errorString = JSON.stringify(supabaseError, null, 2);
          console.error("Full error object as JSON:", errorString);
          errorMessage = `Erro detalhado: ${errorString.substring(0, 200)}...`;
        }
      }

      // Handle string errors
      if (typeof error === "string") {
        errorMessage = `Erro: ${error}`;
      }

      // Handle unknown error types
      if (
        typeof error !== "object" &&
        typeof error !== "string" &&
        !(error instanceof Error)
      ) {
        errorMessage = `Erro desconhecido (tipo: ${typeof error}): ${String(error)}`;
      }

      console.error("Final error message to display:", errorMessage);
      setAlert({ type: "error", message: errorMessage });
    }
  };

  const handleEditTemplate = (template: ContractTemplate) => {
    setSelectedTemplate(template);
    setIsEditorOpen(true);
  };

  const handleDeleteTemplate = async () => {
    if (!selectedTemplate) return;

    try {
      await contractTemplateService.delete(selectedTemplate.id);
      setAlert({ type: "success", message: "Modelo excluído com sucesso!" });
      setIsDeleteDialogOpen(false);
      setSelectedTemplate(null);
      loadTemplates();
    } catch (error) {
      console.error("Error deleting template:", error);
      setAlert({ type: "error", message: "Erro ao excluir modelo" });
    }
  };

  const handleToggleDefault = async (template: ContractTemplate) => {
    try {
      if (template.is_default) {
        await contractTemplateService.removeDefault(template.id);
        setAlert({
          type: "success",
          message: `"${template.name}" não é mais o modelo padrão.`,
        });
      } else {
        await contractTemplateService.setAsDefault(template.id);
        setAlert({
          type: "success",
          message: `"${template.name}" definido como modelo padrão! Ele será carregado automaticamente ao criar novos contratos.`,
        });
      }
      loadTemplates();
    } catch (error) {
      console.error("Error toggling default template:", error);
      setAlert({
        type: "error",
        message:
          "Erro ao alterar modelo padrão. Verifique se a migração do banco foi aplicada.",
      });
    }
  };

  const handleDuplicateTemplate = async (template: ContractTemplate) => {
    try {
      await contractTemplateService.create({
        name: `${template.name} (Cópia)`,
        description: template.description,
        content: template.content,
        visibility: template.visibility,
        created_by: currentUserId,
      });

      setAlert({ type: "success", message: "Modelo duplicado com sucesso!" });
      loadTemplates();
    } catch (error) {
      console.error("Error duplicating template:", error);
      setAlert({ type: "error", message: "Erro ao duplicar modelo" });
    }
  };

  const handleEditorSave = async (
    content: string,
    metadata: {
      name: string;
      description: string;
      visibility: "admin" | "all";
    },
  ) => {
    if (!selectedTemplate) return;

    try {
      await contractTemplateService.update(selectedTemplate.id, {
        name: metadata.name,
        description: metadata.description,
        content,
        visibility: metadata.visibility,
      });

      setAlert({ type: "success", message: "Modelo salvo com sucesso!" });
      setIsEditorOpen(false);
      setSelectedTemplate(null);
      loadTemplates();
    } catch (error) {
      console.error("Error saving template:", error);
      setAlert({ type: "error", message: "Erro ao salvar modelo" });
    }
  };

  if (isEditorOpen && selectedTemplate) {
    return (
      <ContractTemplateEditor
        template={selectedTemplate}
        onSave={handleEditorSave}
        onCancel={() => {
          setIsEditorOpen(false);
          setSelectedTemplate(null);
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-white p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Lista de Modelos
            </h1>
            <p className="text-muted-foreground">
              {templates.length} modelo{templates.length !== 1 ? "s" : ""}{" "}
              disponível{templates.length !== 1 ? "eis" : ""}
            </p>
          </div>
          {isAdmin && (
            <Dialog
              open={isCreateDialogOpen}
              onOpenChange={setIsCreateDialogOpen}
            >
              <DialogTrigger asChild>
                <Button className="bg-red-600 hover:bg-red-700">
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Novo Modelo
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Criar Novo Modelo</DialogTitle>
                  <DialogDescription>
                    Crie um novo modelo de contrato que poderá ser usado na
                    criação de contratos.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div>
                    <Label htmlFor="name">Nome do Modelo *</Label>
                    <Input
                      id="name"
                      value={newTemplate.name}
                      onChange={(e) =>
                        setNewTemplate({ ...newTemplate, name: e.target.value })
                      }
                      placeholder="Ex: Contrato Padrão de Consórcio"
                    />
                  </div>
                  <div>
                    <Label htmlFor="description">Descrição</Label>
                    <Textarea
                      id="description"
                      value={newTemplate.description}
                      onChange={(e) =>
                        setNewTemplate({
                          ...newTemplate,
                          description: e.target.value,
                        })
                      }
                      placeholder="Descrição do modelo..."
                      rows={3}
                    />
                  </div>
                  <div>
                    <Label htmlFor="visibility">Visibilidade</Label>
                    <Select
                      value={newTemplate.visibility}
                      onValueChange={(value: "admin" | "all") =>
                        setNewTemplate({ ...newTemplate, visibility: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">
                          Apenas Administradores
                        </SelectItem>
                        <SelectItem value="all">Todos os Usuários</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setIsCreateDialogOpen(false)}
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleCreateTemplate}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    Criar Modelo
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* Alert */}
        {alert && (
          <Alert
            className={
              alert.type === "error"
                ? "border-red-200 bg-red-50"
                : "border-green-200 bg-green-50"
            }
          >
            <AlertDescription
              className={
                alert.type === "error" ? "text-red-800" : "text-green-800"
              }
            >
              {alert.message}
            </AlertDescription>
          </Alert>
        )}

        {/* Templates Table */}
        <Card>
          <CardHeader>
            <CardTitle>Modelos Disponíveis</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
              </div>
            ) : templates.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                <p className="text-lg font-medium mb-2">
                  Nenhum modelo encontrado
                </p>
                <p className="text-muted-foreground mb-4">
                  {isAdmin
                    ? "Comece criando seu primeiro modelo de contrato."
                    : "Nenhum modelo disponível no momento."}
                </p>
                {isAdmin && (
                  <Button
                    onClick={() => setIsCreateDialogOpen(true)}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Criar Primeiro Modelo
                  </Button>
                )}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Visibilidade</TableHead>
                    <TableHead>Criado em</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {templates.map((template) => (
                    <TableRow key={template.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {template.name}
                          {template.is_default && (
                            <Badge className="bg-amber-500 hover:bg-amber-600 text-white">
                              <Star className="mr-1 h-3 w-3" />
                              Padrão
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="max-w-xs truncate">
                        {template.description || "-"}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            template.visibility === "all"
                              ? "default"
                              : "secondary"
                          }
                        >
                          {template.visibility === "all" ? (
                            <>
                              <Users className="mr-1 h-3 w-3" />
                              Todos
                            </>
                          ) : (
                            <>
                              <Lock className="mr-1 h-3 w-3" />
                              Admin
                            </>
                          )}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {template.created_at
                          ? new Date(template.created_at).toLocaleDateString(
                              "pt-BR",
                            )
                          : "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => handleEditTemplate(template)}
                            >
                              <Edit className="mr-2 h-4 w-4" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDuplicateTemplate(template)}
                            >
                              <Copy className="mr-2 h-4 w-4" />
                              Duplicar
                            </DropdownMenuItem>
                            {isAdmin && (
                              <DropdownMenuItem
                                onClick={() => handleToggleDefault(template)}
                              >
                                {template.is_default ? (
                                  <>
                                    <StarOff className="mr-2 h-4 w-4" />
                                    Remover padrão
                                  </>
                                ) : (
                                  <>
                                    <Star className="mr-2 h-4 w-4" />
                                    Definir como padrão
                                  </>
                                )}
                              </DropdownMenuItem>
                            )}
                            {isAdmin && (
                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedTemplate(template);
                                  setIsDeleteDialogOpen(true);
                                }}
                                className="text-red-600"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Excluir
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Delete Confirmation Dialog */}
        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirmar Exclusão</DialogTitle>
              <DialogDescription>
                Tem certeza que deseja excluir o modelo "
                {selectedTemplate?.name}"? Esta ação não pode ser desfeita.
                {selectedTemplate?.is_default && (
                  <>
                    <br />
                    <br />
                    <strong className="text-red-600">
                      Atenção: este é o modelo padrão. Ao excluí-lo, nenhum
                      modelo será carregado automaticamente na criação de
                      contratos até que outro seja definido como padrão.
                    </strong>
                  </>
                )}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsDeleteDialogOpen(false)}
              >
                Cancelar
              </Button>
              <Button variant="destructive" onClick={handleDeleteTemplate}>
                Excluir
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default ContractTemplateManagement;
