import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ArrowLeft, Save, FileText, PenTool } from "lucide-react";
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import '../../styles/quill-tables.css';
import { quillModulesWithTable, quillFormatsWithTable, insertTable } from '../../lib/quill-config';
import { contractTemplateService } from "../../lib/supabase";
import SignatureCanvas from "@/components/ui/signature-canvas";
import { mergePlaceholders, MergeData } from "@/lib/merge-fields";
import MergeFieldsHelper from "./MergeFieldsHelper";

interface CommissionPlan {
  id: number;
  nome: string;
  descricao: string;
  ativo: boolean;
}

interface CreditRange {
  id: number;
  plano_id: number;
  valor_credito: number;
  valor_primeira_parcela: number;
  valor_parcelas_restantes: number;
  numero_total_parcelas: number;
}

interface Group {
  id: number;
  name: string;
  description: string;
}

interface Quota {
  id: number;
  group_id: number;
  quota_number: number;
  status: string;
}

interface ClientData {
  full_name: string;
  email: string;
  phone: string;
  cpf_cnpj: string;
  address: string;
}

interface ContractContentEditorProps {
  selectedPlan: CommissionPlan;
  selectedCreditRange: CreditRange;
  selectedQuota: Quota;
  selectedGroup: Group;
  clientData: ClientData;
  onContentSubmit: (content: string, signatureFields?: any[]) => void;
  onBack: () => void;
}

const ContractContentEditor: React.FC<ContractContentEditorProps> = ({
  selectedPlan,
  selectedCreditRange,
  selectedQuota,
  selectedGroup,
  clientData,
  onContentSubmit,
  onBack,
}) => {
  const editorRef = useRef<any>(null);
  const [templates, setTemplates] = useState<any[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(true);
  const [showMergeFields, setShowMergeFields] = useState(false);

  // Signature modal states
  const [isSignatureModalOpen, setIsSignatureModalOpen] = useState(false);
  const [currentSignatureId, setCurrentSignatureId] = useState<string | null>(
    null,
  );
  const [signerName, setSignerName] = useState("");
  const [signerCPF, setSignerCPF] = useState("");
  const [signatureBlocks, setSignatureBlocks] = useState<
    Map<
      string,
      { name: string; cpf: string; signed: boolean; imageUrl?: string }
    >
  >(new Map());
  const getDefaultContent = () =>
    `
<h1>CONTRATO DE CONSÓRCIO</h1>

<h2>DADOS DO CLIENTE</h2>
<p><strong>Nome:</strong> ${clientData.full_name}</p>
<p><strong>Email:</strong> ${clientData.email}</p>
<p><strong>Telefone:</strong> ${clientData.phone}</p>
<p><strong>CPF/CNPJ:</strong> ${clientData.cpf_cnpj}</p>
<p><strong>Endereço:</strong> ${clientData.address}</p>

<h2>DADOS DO GRUPO</h2>
<p><strong>Grupo:</strong> ${selectedGroup.name}</p>
<p><strong>Descrição:</strong> ${selectedGroup.description}</p>
<p><strong>Cota:</strong> ${selectedQuota.quota_number}</p>

<h2>PLANO DE COMISSÃO</h2>
<p><strong>Plano:</strong> ${selectedPlan.nome}</p>
<p><strong>Descrição:</strong> ${selectedPlan.descricao}</p>

<h2>VALOR DO CRÉDITO</h2>
<p><strong>Valor do Crédito:</strong> R$ ${selectedCreditRange.valor_credito.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
<p><strong>Primeira Parcela:</strong> R$ ${selectedCreditRange.valor_primeira_parcela.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
<p><strong>Parcelas Restantes:</strong> R$ ${selectedCreditRange.valor_parcelas_restantes.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
<p><strong>Total de Parcelas:</strong> ${selectedCreditRange.numero_total_parcelas}</p>

<h2>TERMOS E CONDIÇÕES</h2>
<p>Este contrato estabelece os termos e condições para participação no consórcio...</p>

<h3>CLÁUSULA 1 - DO OBJETO</h3>
<p>O presente contrato tem por objeto a participação do cliente no grupo de consórcio...</p>

<h3>CLÁUSULA 2 - DAS OBRIGAÇÕES</h3>
<p>São obrigações do consorciado:</p>
<ul>
  <li>Efetuar o pagamento das parcelas mensais;</li>
  <li>Manter seus dados atualizados;</li>
  <li>Cumprir as normas do grupo;</li>
</ul>

<h3>CLÁUSULA 3 - DA CONTEMPLAÇÃO</h3>
<p>A contemplação poderá ocorrer por sorteio ou lance...</p>

<p><strong>Data:</strong> ${new Date().toLocaleDateString("pt-BR")}</p>
<p><strong>Assinatura do Cliente:</strong> _________________________</p>
<p><strong>Assinatura do Representante:</strong> _________________________</p>
  `.trim();

  const handleSubmit = async () => {
    if (editorRef.current) {
      const content = editorRef.current.getContent();
      if (content.trim()) {
        onContentSubmit(content);
      } else {
        alert("Por favor, insira o conteúdo do contrato.");
      }
    }
  };

  // Generate unique signature ID
  const generateSignatureId = () => {
    return `signature-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  };

  // Insert signature block into editor
  const insertSignatureBlock = () => {
    if (!signerName.trim() || !signerCPF.trim()) {
      alert("Por favor, preencha o nome e CPF do signatário.");
      return;
    }

    const signatureId = generateSignatureId();
    const formattedCPF = signerCPF
      .replace(/\D/g, "")
      .replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");

    // Create signature block HTML
    const signatureBlockHtml = `
      <div class="signature-field-pending" data-signature-id="${signatureId}" data-signer-name="${signerName}" data-signer-cpf="${signerCPF.replace(/\D/g, "")}" style="border: 2px dashed #ef4444; padding: 20px; margin: 20px 0; background-color: #fef2f2; text-align: center; border-radius: 8px; cursor: pointer;" onclick="window.openSignatureModal('${signatureId}')">
        <div style="margin-bottom: 15px;">
          <div style="margin-bottom: 10px;">
            <strong style="color: #dc2626; font-size: 16px;">✍️ Campo de Assinatura</strong>
          </div>
          <div style="border: 2px dashed #ef4444; padding: 20px; background-color: white; display: inline-block; border-radius: 8px; min-width: 300px; min-height: 80px; display: flex; align-items: center; justify-content: center;">
            <span style="color: #ef4444; font-weight: bold;">CLIQUE PARA ASSINAR</span>
          </div>
        </div>
        <div style="font-size: 14px; margin-top: 15px; background-color: rgba(239, 68, 68, 0.1); padding: 10px; border-radius: 6px;">
          <div style="margin-bottom: 5px;"><strong>👤 Nome:</strong> ${signerName}</div>
          <div style="margin-bottom: 5px;"><strong>🆔 CPF:</strong> ${formattedCPF}</div>
          <div style="margin-top: 8px; font-size: 12px; color: #dc2626; font-weight: 500;">⚠️ Clique para assinar</div>
        </div>
      </div>
    `;

    // Insert into editor
    if (editorRef.current) {
      editorRef.current.insertContent(signatureBlockHtml);
    }

    // Store signature block info
    setSignatureBlocks(
      (prev) =>
        new Map(
          prev.set(signatureId, {
            name: signerName,
            cpf: signerCPF.replace(/\D/g, ""),
            signed: false,
          }),
        ),
    );

    // Clear form and close modal
    setSignerName("");
    setSignerCPF("");
    setIsSignatureModalOpen(false);
  };

  // Open signature modal for signing
  const openSignatureModal = (signatureId: string) => {
    const blockInfo = signatureBlocks.get(signatureId);
    if (blockInfo && !blockInfo.signed) {
      setCurrentSignatureId(signatureId);
      setIsSignatureModalOpen(true);
    }
  };

  // Handle signature confirmation
  const handleSignatureConfirm = (signatureDataUrl: string) => {
    if (!currentSignatureId) return;

    const blockInfo = signatureBlocks.get(currentSignatureId);
    if (!blockInfo) return;

    // Update signature block in editor
    const signedBlockHtml = `
      <div class="signature-field-completed" data-signature-id="${currentSignatureId}" data-signer-name="${blockInfo.name}" data-signer-cpf="${blockInfo.cpf}" style="border: 2px solid #10b981; padding: 20px; margin: 20px 0; background-color: #f0fdf4; text-align: center; border-radius: 8px;">
        <div style="margin-bottom: 15px;">
          <div style="margin-bottom: 10px;">
            <strong style="color: #059669; font-size: 16px;">✅ Assinatura Confirmada</strong>
          </div>
          <div style="border: 2px solid #10b981; padding: 10px; background-color: white; display: inline-block; border-radius: 8px;">
            <img src="${signatureDataUrl}" alt="Assinatura" style="max-width: 300px; max-height: 80px; display: block;" />
          </div>
        </div>
        <div style="font-size: 14px; margin-top: 15px; background-color: rgba(16, 185, 129, 0.1); padding: 10px; border-radius: 6px;">
          <div style="margin-bottom: 5px;"><strong>👤 Nome:</strong> ${blockInfo.name}</div>
          <div style="margin-bottom: 5px;"><strong>🆔 CPF:</strong> ${blockInfo.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4")}</div>
          <div style="margin-top: 8px; font-size: 12px; color: #059669; font-weight: 500;">✅ Assinado em ${new Date().toLocaleString("pt-BR")}</div>
        </div>
      </div>
    `;

    // Replace the pending signature block with the signed one
    if (editorRef.current) {
      const content = editorRef.current.getContent();
      const updatedContent = content.replace(
        new RegExp(
          `<div class="signature-field-pending"[^>]*data-signature-id="${currentSignatureId}"[^>]*>[\\s\\S]*?</div>`,
          "g",
        ),
        signedBlockHtml,
      );
      editorRef.current.setContent(updatedContent);
    }

    // Update signature blocks state
    setSignatureBlocks(
      (prev) =>
        new Map(
          prev.set(currentSignatureId, {
            ...blockInfo,
            signed: true,
            imageUrl: signatureDataUrl,
          }),
        ),
    );

    // Reset modal state
    setCurrentSignatureId(null);
    setIsSignatureModalOpen(false);
  };

  // Setup global function for signature modal
  useEffect(() => {
    (window as any).openSignatureModal = openSignatureModal;
    return () => {
      delete (window as any).openSignatureModal;
    };
  }, [signatureBlocks]);

  // Removido o handleEditorChange para evitar re-renderizações desnecessárias
  // O TinyMCE gerencia seu próprio estado interno

  // Load available templates
  useEffect(() => {
    const loadTemplates = async () => {
      try {
        setIsLoadingTemplates(true);
        const data = await contractTemplateService.getAll(true); // Load all templates including admin ones
        console.log("Loaded templates:", data);
        setTemplates(data);
      } catch (error) {
        console.error("Error loading templates:", error);
      } finally {
        setIsLoadingTemplates(false);
      }
    };

    loadTemplates();
  }, []);

  // Função para inserir campos de mesclagem
  const handleInsertField = (placeholder: string) => {
    if (editorRef.current) {
      editorRef.current.insertContent(placeholder);
    }
  };

  // Handle template selection
  const handleTemplateSelect = async (templateId: string) => {
    if (
      !templateId ||
      templateId === "blank" ||
      templateId === "no-templates"
    ) {
      if (templateId === "blank" && editorRef.current) {
        // Reset to default content for blank template
        editorRef.current.setContent(getDefaultContent());
      }
      return;
    }

    try {
      console.log("Loading template with ID:", templateId);
      const template = await contractTemplateService.getById(
        parseInt(templateId),
      );
      console.log("Loaded template:", template);

      if (template && editorRef.current) {
        // **NOVO SISTEMA DE MESCLAGEM DE CAMPOS**
        // Preparar dados para mesclagem
        const mergeData: MergeData = {
          client: {
            full_name: clientData.full_name,
            email: clientData.email,
            phone: clientData.phone,
            cpf_cnpj: clientData.cpf_cnpj,
            address: clientData.address,
            city: clientData.city,
            state: clientData.state,
            zip_code: clientData.zip_code,
          },
          contract: {
            value: selectedCreditRange.valor_credito,
            installments: selectedCreditRange.numero_total_parcelas,
            number: `CONT-${Date.now()}`, // Gerar número único
            date: new Date().toLocaleDateString('pt-BR'),
          },
        };
        
        // Aplicar mesclagem usando novo sistema
        let content = mergePlaceholders(template.content, mergeData);
        
        // **MANTER COMPATIBILIDADE COM SISTEMA ANTIGO**
        // Replace old-style variables {{VAR}} (para templates antigos)
        content = content.replace(/{{CLIENTE_NOME}}/g, clientData.full_name);
        content = content.replace(/{{CLIENTE_EMAIL}}/g, clientData.email);
        content = content.replace(/{{CLIENTE_TELEFONE}}/g, clientData.phone);
        content = content.replace(/{{CLIENTE_CPF_CNPJ}}/g, clientData.cpf_cnpj);
        content = content.replace(/{{CLIENTE_ENDERECO}}/g, clientData.address);

        // Replace group variables
        content = content.replace(/{{GRUPO_NOME}}/g, selectedGroup.name);
        content = content.replace(
          /{{GRUPO_DESCRICAO}}/g,
          selectedGroup.description,
        );

        // Replace quota variables
        content = content.replace(
          /{{COTA_NUMERO}}/g,
          selectedQuota.quota_number.toString(),
        );

        // Replace commission plan variables
        content = content.replace(/{{PLANO_NOME}}/g, selectedPlan.nome);
        content = content.replace(
          /{{PLANO_DESCRICAO}}/g,
          selectedPlan.descricao,
        );

        // Replace credit range variables
        content = content.replace(
          /{{VALOR_CREDITO}}/g,
          selectedCreditRange.valor_credito.toLocaleString("pt-BR", {
            minimumFractionDigits: 2,
          }),
        );
        content = content.replace(
          /{{PRIMEIRA_PARCELA}}/g,
          selectedCreditRange.valor_primeira_parcela.toLocaleString("pt-BR", {
            minimumFractionDigits: 2,
          }),
        );
        content = content.replace(
          /{{PARCELAS_RESTANTES}}/g,
          selectedCreditRange.valor_parcelas_restantes.toLocaleString("pt-BR", {
            minimumFractionDigits: 2,
          }),
        );
        content = content.replace(
          /{{TOTAL_PARCELAS}}/g,
          selectedCreditRange.numero_total_parcelas.toString(),
        );

        // Replace date variables
        content = content.replace(
          /{{DATA_ATUAL}}/g,
          new Date().toLocaleDateString("pt-BR"),
        );

        console.log("Setting template content in editor");
        editorRef.current.setContent(content);
      }
    } catch (error) {
      console.error("Error loading template:", error);
      alert("Erro ao carregar modelo. Tente novamente.");
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Template Selection Bar */}
      <div className="bg-white border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <FileText className="h-4 w-4 text-gray-500" />
              <Label htmlFor="template-select" className="text-sm font-medium">
                Modelo de Contrato:
              </Label>
            </div>
            <Select
              value={selectedTemplateId}
              onValueChange={(value) => {
                setSelectedTemplateId(value);
                handleTemplateSelect(value);
              }}
              disabled={isLoadingTemplates}
            >
              <SelectTrigger className="w-64">
                <SelectValue
                  placeholder={
                    isLoadingTemplates
                      ? "Carregando modelos..."
                      : "Selecione um modelo"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="blank">
                  <span className="text-gray-500">Modelo em branco</span>
                </SelectItem>
                {templates.length > 0 ? (
                  templates.map((template) => (
                    <SelectItem
                      key={template.id}
                      value={template.id.toString()}
                    >
                      <div className="flex items-center space-x-2">
                        <span>{template.name}</span>
                        {template.description && (
                          <span className="text-xs text-gray-500">
                            - {template.description}
                          </span>
                        )}
                      </div>
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="no-templates" disabled>
                    <span className="text-gray-400">
                      Nenhum modelo disponível
                    </span>
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Top Information Bar */}
      <div className="bg-gray-50 border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-6">
            <Button
              variant="outline"
              onClick={onBack}
              className="flex items-center space-x-2"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Voltar</span>
            </Button>

            <div className="flex items-center space-x-8">
              <div>
                <span className="text-sm font-medium text-gray-500">
                  Cliente:
                </span>
                <span className="ml-2 text-sm text-gray-900">
                  {clientData.full_name}
                </span>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-500">
                  Grupo:
                </span>
                <span className="ml-2 text-sm text-gray-900">
                  {selectedGroup.name}
                </span>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-500">Cota:</span>
                <span className="ml-2 text-sm text-gray-900">
                  {selectedQuota.quota_number}
                </span>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-500">
                  Plano:
                </span>
                <span className="ml-2 text-sm text-gray-900">
                  {selectedPlan.nome}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <Button
              variant="outline"
              onClick={() => setShowMergeFields(!showMergeFields)}
              className="flex items-center space-x-2"
            >
              <FileText className="w-4 h-4" />
              <span>Campos de Mesclagem</span>
            </Button>
          <Button
            onClick={handleSubmit}
            className="bg-red-600 hover:bg-red-700 text-white flex items-center space-x-2"
          >
            <Save className="w-4 h-4" />
            <span>Salvar e Continuar</span>
          </Button>
          </div>
        </div>
      </div>

      {/* Full Screen Editor */}
      <div className="h-[calc(100vh-140px)] p-6">
        {/* Botão Inserir Tabela */}
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
            Clique para inserir uma tabela HTML. Para editar: clique dentro da célula e digite normalmente. Para adicionar/remover linhas ou colunas, edite o HTML diretamente no código fonte.
          </p>
        </div>

        <div className="flex gap-4 h-full">
          <div className={showMergeFields ? "flex-1" : "w-full"}>
            <ReactQuill
              ref={editorRef}
              value={getDefaultContent()}
              theme="snow"
              style={{ height: 'calc(100vh - 400px)', marginBottom: '50px' }}
              modules={quillModulesWithTable}
              formats={quillFormatsWithTable}
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

      {/* Signature Modal */}
      <Dialog
        open={isSignatureModalOpen}
        onOpenChange={setIsSignatureModalOpen}
      >
        <DialogContent
          className="sm:max-w-md bg-white"
          onPointerDownOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PenTool className="h-5 w-5" />
              {currentSignatureId
                ? "Assinar Documento"
                : "Inserir Campo de Assinatura"}
            </DialogTitle>
            <DialogDescription>
              {currentSignatureId
                ? "Desenhe sua assinatura no campo abaixo para confirmar."
                : "Preencha os dados do signatário para criar um campo de assinatura."}
            </DialogDescription>
          </DialogHeader>

          {!currentSignatureId ? (
            // Form for creating signature block
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="signer-name">Nome do Signatário</Label>
                <Input
                  id="signer-name"
                  value={signerName}
                  onChange={(e) => setSignerName(e.target.value)}
                  placeholder="Digite o nome completo"
                  className="w-full"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="signer-cpf">CPF do Signatário</Label>
                <Input
                  id="signer-cpf"
                  value={signerCPF}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, "");
                    if (value.length <= 11) {
                      const formatted = value.replace(
                        /(\d{3})(\d{3})(\d{3})(\d{2})/,
                        "$1.$2.$3-$4",
                      );
                      setSignerCPF(formatted);
                    }
                  }}
                  placeholder="000.000.000-00"
                  className="w-full"
                  maxLength={14}
                />
              </div>
            </div>
          ) : null}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsSignatureModalOpen(false);
                setCurrentSignatureId(null);
                setSignerName("");
                setSignerCPF("");
              }}
            >
              Cancelar
            </Button>
            {!currentSignatureId ? (
              <Button
                type="button"
                onClick={insertSignatureBlock}
                disabled={!signerName.trim() || !signerCPF.trim()}
                className="bg-red-600 hover:bg-red-700"
              >
                Inserir Campo
              </Button>
            ) : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Signature Canvas Modal */}
      {currentSignatureId && (
        <SignatureCanvas
          isOpen={isSignatureModalOpen && !!currentSignatureId}
          onClose={() => {
            setIsSignatureModalOpen(false);
            setCurrentSignatureId(null);
          }}
          onConfirm={handleSignatureConfirm}
          title="Desenhe sua assinatura"
        />
      )}
    </div>
  );
};

export default ContractContentEditor;
