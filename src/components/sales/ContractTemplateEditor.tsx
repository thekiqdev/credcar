import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArrowLeft, Save, Upload, FileText, Users, Lock } from "lucide-react";
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import '../../styles/quill-tables.css';
import { insertTable } from '../../lib/quill-table-helper';
import mammoth from "mammoth";
import MergeFieldsHelper from "./MergeFieldsHelper";

interface ContractTemplate {
  id: number;
  name: string;
  description: string | null;
  content: string;
  visibility: "admin" | "all";
  created_by: string | null;
  created_at: string | null;
  updated_at: string | null;
}

interface ContractTemplateEditorProps {
  template: ContractTemplate;
  onSave: (
    content: string,
    metadata: {
      name: string;
      description: string;
      visibility: "admin" | "all";
    },
  ) => void;
  onCancel: () => void;
}

const ContractTemplateEditor: React.FC<ContractTemplateEditorProps> = ({
  template,
  onSave,
  onCancel,
}) => {
  const editorRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [metadata, setMetadata] = useState({
    name: template.name,
    description: template.description || "",
    visibility: template.visibility,
  });
  const [alert, setAlert] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [showMergeFields, setShowMergeFields] = useState(false);

  useEffect(() => {
    if (alert) {
      const timer = setTimeout(() => setAlert(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [alert]);

  const handleSave = () => {
    if (!metadata.name.trim()) {
      setAlert({ type: "error", message: "Nome do modelo é obrigatório" });
      return;
    }

    if (editorRef.current) {
      const quill = editorRef.current.getEditor();
      const editorContent = quill.root.innerHTML;
      if (!editorContent.trim()) {
        setAlert({
          type: "error",
          message: "Conteúdo do modelo é obrigatório",
        });
        return;
      }
      onSave(editorContent, metadata);
    }
  };

  const handleInsertField = (placeholder: string) => {
    if (editorRef.current) {
      const quill = editorRef.current.getEditor();
      const range = quill.getSelection();
      if (range) {
        quill.insertText(range.index, placeholder);
        quill.setSelection(range.index + placeholder.length);
      } else {
        quill.insertText(quill.getLength(), placeholder);
      }
    }
  };

  const handleWordUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith(".docx")) {
      setAlert({
        type: "error",
        message: "Por favor, selecione um arquivo .docx",
      });
      return;
    }

    setIsUploading(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.convertToHtml({ arrayBuffer });

      if (result.value) {
        // Insert the converted HTML into the editor
        if (editorRef.current) {
          const quill = editorRef.current.getEditor();
          quill.clipboard.dangerouslyPasteHTML(result.value);
        }
        setAlert({
          type: "success",
          message: "Documento Word convertido com sucesso!",
        });
      }

      if (result.messages.length > 0) {
        console.warn("Mammoth conversion warnings:", result.messages);
      }
    } catch (error) {
      console.error("Error converting Word document:", error);
      setAlert({ type: "error", message: "Erro ao converter documento Word" });
    } finally {
      setIsUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Top Bar */}
      <div className="bg-gray-50 border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-6">
            <Button
              variant="outline"
              onClick={onCancel}
              className="flex items-center space-x-2"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Voltar</span>
            </Button>

            <div className="flex items-center space-x-8">
              <div>
                <span className="text-sm font-medium text-gray-500">
                  Modelo:
                </span>
                <span className="ml-2 text-sm text-gray-900">
                  {metadata.name}
                </span>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-500">
                  Visibilidade:
                </span>
                <span className="ml-2 text-sm text-gray-900 flex items-center">
                  {metadata.visibility === "all" ? (
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
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <input
              ref={fileInputRef}
              type="file"
              accept=".docx"
              onChange={handleWordUpload}
              className="hidden"
            />
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="flex items-center space-x-2"
            >
              <Upload className="w-4 h-4" />
              <span>{isUploading ? "Convertendo..." : "Importar Word"}</span>
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowMergeFields(!showMergeFields)}
              className="flex items-center space-x-2"
            >
              <FileText className="w-4 h-4" />
              <span>Campos de Mesclagem</span>
            </Button>
            <Button
              onClick={handleSave}
              className="bg-red-600 hover:bg-red-700 text-white flex items-center space-x-2"
            >
              <Save className="w-4 h-4" />
              <span>Salvar Modelo</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Metadata Section */}
      <div className="bg-white border-b px-6 py-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label htmlFor="template-name">Nome do Modelo *</Label>
            <Input
              id="template-name"
              value={metadata.name}
              onChange={(e) =>
                setMetadata({ ...metadata, name: e.target.value })
              }
              placeholder="Nome do modelo"
            />
          </div>
          <div>
            <Label htmlFor="template-description">Descrição</Label>
            <Input
              id="template-description"
              value={metadata.description}
              onChange={(e) =>
                setMetadata({ ...metadata, description: e.target.value })
              }
              placeholder="Descrição do modelo"
            />
          </div>
          <div>
            <Label htmlFor="template-visibility">Visibilidade</Label>
            <Select
              value={metadata.visibility}
              onValueChange={(value: "admin" | "all") =>
                setMetadata({ ...metadata, visibility: value })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">
                  <div className="flex items-center">
                    <Lock className="mr-2 h-4 w-4" />
                    Apenas Administradores
                  </div>
                </SelectItem>
                <SelectItem value="all">
                  <div className="flex items-center">
                    <Users className="mr-2 h-4 w-4" />
                    Todos os Usuários
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Alert */}
      {alert && (
        <div className="px-6 py-2">
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
        </div>
      )}

      {/* Editor */}
      <div className="h-[calc(100vh-200px)] p-6">
        {/* Table Insert Section */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
          <h4 className="text-sm font-medium text-blue-800 mb-3">
            Inserir Tabela
          </h4>
          <Button
            variant="outline"
            onClick={() => {
              if (editorRef.current) {
                insertTable(editorRef.current.getEditor(), 3, 3);
              }
            }}
            className="bg-blue-600 text-white hover:bg-blue-700"
          >
            <FileText className="mr-2 h-4 w-4" />
            Inserir Tabela 3x3
          </Button>
          <p className="text-xs text-blue-600 mt-2">
            Clique para inserir uma tabela HTML. Para editar: clique dentro da célula e digite normalmente.
          </p>
        </div>

        <div className="flex gap-4 h-full">
          <div className={showMergeFields ? "flex-1" : "w-full"}>
            <ReactQuill
              ref={editorRef}
              value={template.content}
              theme="snow"
              style={{ height: 'calc(100vh - 360px)', marginBottom: '50px' }}
              modules={{
                toolbar: {
                  container: [
                    [{ 'size': ['small', false, 'large', 'huge'] }],
                    [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
                    ['bold', 'italic', 'underline', 'strike'],
                    [{ 'color': [] }, { 'background': [] }],
                    [{ 'align': [] }],
                    [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                    ['blockquote', 'code-block'],
                    ['link', 'image'],
                    ['clean']
                  ]
                },
                clipboard: {
                  matchVisual: false,
                }
              }}
              formats={[
                'header', 'size',
                'bold', 'italic', 'underline', 'strike',
                'color', 'background',
                'list', 'bullet',
                'align',
                'blockquote', 'code-block',
                'link', 'image'
              ]}
            />
          </div>
          
          {/* Painel Lateral de Campos de Mesclagem */}
          {showMergeFields && (
            <div className="w-80 flex-shrink-0">
              <MergeFieldsHelper onInsertField={handleInsertField} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ContractTemplateEditor;
