import React, { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  ArrowRight,
  ArrowLeft,
  User,
  Mail,
  Phone,
  FileText,
  MapPin,
} from "lucide-react";

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

interface ClientData {
  full_name: string;
  email: string;
  phone: string;
  cpf_cnpj: string;
  address: string;
  address_street?: string;
  address_number?: string;
  address_complement?: string;
  address_neighborhood?: string;
  address_city?: string;
  address_state?: string;
  address_zip?: string;
  // Novos campos de identificação
  rg?: string;
  birth_date?: string;
  nationality?: string;
  marital_status?: string;
  spouse_name?: string;
  spouse_phone?: string;
  // Novos campos profissionais
  company?: string;
  salary?: string;
  position?: string;
  // Novos campos de referências pessoais
  reference_name?: string;
  reference_address?: string;
  reference_phone?: string;
}

interface ClientRegistrationProps {
  selectedPlan: CommissionPlan;
  selectedCreditRange: CreditRange;
  selectedQuota: Quota;
  selectedGroup: Group;
  onClientSubmit: (clientData: ClientData) => void;
  onBack: () => void;
}

const ClientRegistration: React.FC<ClientRegistrationProps> = ({
  selectedPlan,
  selectedCreditRange,
  selectedQuota,
  selectedGroup,
  onClientSubmit,
  onBack,
}) => {
  const [clientData, setClientData] = useState<ClientData>({
    full_name: "",
    email: "",
    phone: "",
    cpf_cnpj: "",
    address: "",
    // Novos campos de identificação
    rg: "",
    birth_date: "",
    nationality: "",
    marital_status: "",
    spouse_name: "",
    spouse_phone: "",
    // Novos campos profissionais
    company: "",
    salary: "",
    position: "",
    // Novos campos de referências pessoais
    reference_name: "",
    reference_address: "",
    reference_phone: "",
  });

  // Separate state for address components for UI
  const [addressComponents, setAddressComponents] = useState({
    street: "",
    number: "",
    complement: "",
    neighborhood: "",
    city: "",
    state: "",
    zip: "",
  });

  const [errors, setErrors] = useState<
    Partial<ClientData> & {
      address_street?: string;
      address_number?: string;
      address_complement?: string;
      address_neighborhood?: string;
      address_city?: string;
      address_state?: string;
      address_zip?: string;
    }
  >({});
  const [submitting, setSubmitting] = useState(false);

  const handleInputChange = (field: keyof ClientData, value: string) => {
    setClientData((prev) => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const handleAddressChange = (
    field: keyof typeof addressComponents,
    value: string,
  ) => {
    setAddressComponents((prev) => ({ ...prev, [field]: value }));

    // Update the full address string
    const updated = { ...addressComponents, [field]: value };
    const fullAddress = `${updated.street}, ${updated.number}${updated.complement ? ", " + updated.complement : ""}, ${updated.neighborhood}, ${updated.city} - ${updated.state}, ${updated.zip}`;
    setClientData((prev) => ({ ...prev, address: fullAddress }));
  };

  const formatCpfCnpj = (value: string) => {
    const numbers = value.replace(/\D/g, "");
    if (numbers.length <= 11) {
      // CPF format: 000.000.000-00
      return numbers.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
    } else {
      // CNPJ format: 00.000.000/0000-00
      return numbers.replace(
        /(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/,
        "$1.$2.$3/$4-$5",
      );
    }
  };

  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, "");
    if (numbers.length <= 10) {
      return numbers.replace(/(\d{2})(\d{4})(\d{4})/, "($1) $2-$3");
    } else {
      return numbers.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
    }
  };

  const formatZip = (value: string) => {
    const numbers = value.replace(/\D/g, "");
    return numbers.replace(/(\d{5})(\d{3})/, "$1-$2");
  };

  const formatRg = (value: string) => {
    const numbers = value.replace(/\D/g, "");
    return numbers.replace(/(\d{2})(\d{3})(\d{3})(\d{1})/, "$1.$2.$3-$4");
  };

  const formatSalary = (value: string) => {
    const numbers = value.replace(/\D/g, "");
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(parseInt(numbers) / 100);
  };

  const validateForm = (): boolean => {
    const newErrors: any = {};

    if (!clientData.full_name.trim())
      newErrors.full_name = "Nome é obrigatório";
    if (!clientData.email.trim()) newErrors.email = "Email é obrigatório";
    else if (!/\S+@\S+\.\S+/.test(clientData.email))
      newErrors.email = "Email inválido";
    if (!clientData.phone.trim()) newErrors.phone = "Telefone é obrigatório";
    if (!clientData.cpf_cnpj.trim())
      newErrors.cpf_cnpj = "CPF/CNPJ é obrigatório";
    if (!addressComponents.street.trim())
      newErrors.address_street = "Endereço é obrigatório";
    if (!addressComponents.number.trim())
      newErrors.address_number = "Número é obrigatório";
    if (!addressComponents.neighborhood.trim())
      newErrors.address_neighborhood = "Bairro é obrigatório";
    if (!addressComponents.city.trim())
      newErrors.address_city = "Cidade é obrigatória";
    if (!addressComponents.state.trim())
      newErrors.address_state = "Estado é obrigatório";
    if (!addressComponents.zip.trim())
      newErrors.address_zip = "CEP é obrigatório";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setSubmitting(true);
    try {
      await onClientSubmit(clientData);
    } catch (error) {
      console.error("Error submitting client data:", error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-white p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Cadastro do Cliente
              </h1>
              <p className="text-gray-600">
                Preencha os dados do cliente para finalizar o contrato
              </p>
            </div>
            <div className="flex gap-2">
              <Badge variant="outline" className="bg-red-100 text-red-700">
                {selectedPlan.nome}
              </Badge>
              <Badge variant="outline" className="bg-green-100 text-green-700">
                {new Intl.NumberFormat("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                }).format(selectedCreditRange.valor_credito)}
              </Badge>
              <Badge variant="outline" className="bg-blue-100 text-blue-700">
                {selectedGroup.name} - Cota #{selectedQuota.quota_number}
              </Badge>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Personal Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <User className="mr-2 h-5 w-5" />
                Dados Pessoais
              </CardTitle>
              <CardDescription>Informações básicas do cliente</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="full_name">Nome Completo *</Label>
                  <Input
                    id="full_name"
                    value={clientData.full_name}
                    onChange={(e) =>
                      handleInputChange("full_name", e.target.value)
                    }
                    placeholder="Digite o nome completo"
                    className={errors.full_name ? "border-red-500" : ""}
                  />
                  {errors.full_name && (
                    <p className="text-sm text-red-500 mt-1">
                      {errors.full_name}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="cpf_cnpj">CPF/CNPJ *</Label>
                  <Input
                    id="cpf_cnpj"
                    value={clientData.cpf_cnpj}
                    onChange={(e) =>
                      handleInputChange(
                        "cpf_cnpj",
                        formatCpfCnpj(e.target.value),
                      )
                    }
                    placeholder="000.000.000-00 ou 00.000.000/0000-00"
                    className={errors.cpf_cnpj ? "border-red-500" : ""}
                  />
                  {errors.cpf_cnpj && (
                    <p className="text-sm text-red-500 mt-1">
                      {errors.cpf_cnpj}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Identificação */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <FileText className="mr-2 h-5 w-5" />
                Identificação
              </CardTitle>
              <CardDescription>Documentos e informações pessoais</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="rg">RG</Label>
                  <Input
                    id="rg"
                    value={clientData.rg || ""}
                    onChange={(e) =>
                      handleInputChange("rg", formatRg(e.target.value))
                    }
                    placeholder="00.000.000-0"
                  />
                </div>

                <div>
                  <Label htmlFor="birth_date">Data de Nascimento</Label>
                  <Input
                    id="birth_date"
                    type="date"
                    value={clientData.birth_date || ""}
                    onChange={(e) =>
                      handleInputChange("birth_date", e.target.value)
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="nationality">Nacionalidade</Label>
                  <Input
                    id="nationality"
                    value={clientData.nationality || ""}
                    onChange={(e) =>
                      handleInputChange("nationality", e.target.value)
                    }
                    placeholder="Brasileira"
                  />
                </div>

                <div>
                  <Label htmlFor="marital_status">Estado Civil</Label>
                  <Input
                    id="marital_status"
                    value={clientData.marital_status || ""}
                    onChange={(e) =>
                      handleInputChange("marital_status", e.target.value)
                    }
                    placeholder="Solteiro, Casado, etc."
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="spouse_name">Nome do Cônjuge</Label>
                  <Input
                    id="spouse_name"
                    value={clientData.spouse_name || ""}
                    onChange={(e) =>
                      handleInputChange("spouse_name", e.target.value)
                    }
                    placeholder="Nome completo do cônjuge"
                  />
                </div>

                <div>
                  <Label htmlFor="spouse_phone">Celular do Cônjuge</Label>
                  <Input
                    id="spouse_phone"
                    value={clientData.spouse_phone || ""}
                    onChange={(e) =>
                      handleInputChange("spouse_phone", formatPhone(e.target.value))
                    }
                    placeholder="(11) 99999-9999"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Contact Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Mail className="mr-2 h-5 w-5" />
                Contato
              </CardTitle>
              <CardDescription>
                Informações de contato do cliente
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={clientData.email}
                    onChange={(e) => handleInputChange("email", e.target.value)}
                    placeholder="cliente@email.com"
                    className={errors.email ? "border-red-500" : ""}
                  />
                  {errors.email && (
                    <p className="text-sm text-red-500 mt-1">{errors.email}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="phone">Telefone *</Label>
                  <Input
                    id="phone"
                    value={clientData.phone}
                    onChange={(e) =>
                      handleInputChange("phone", formatPhone(e.target.value))
                    }
                    placeholder="(11) 99999-9999"
                    className={errors.phone ? "border-red-500" : ""}
                  />
                  {errors.phone && (
                    <p className="text-sm text-red-500 mt-1">{errors.phone}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Dados Profissionais */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <User className="mr-2 h-5 w-5" />
                Dados Profissionais
              </CardTitle>
              <CardDescription>Informações sobre trabalho e renda</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="company">Empresa onde Trabalha</Label>
                  <Input
                    id="company"
                    value={clientData.company || ""}
                    onChange={(e) =>
                      handleInputChange("company", e.target.value)
                    }
                    placeholder="Nome da empresa"
                  />
                </div>

                <div>
                  <Label htmlFor="position">Cargo</Label>
                  <Input
                    id="position"
                    value={clientData.position || ""}
                    onChange={(e) =>
                      handleInputChange("position", e.target.value)
                    }
                    placeholder="Cargo ou função"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
                <div>
                  <Label htmlFor="salary">Salário</Label>
                  <Input
                    id="salary"
                    value={clientData.salary || ""}
                    onChange={(e) =>
                      handleInputChange("salary", formatSalary(e.target.value))
                    }
                    placeholder="R$ 0,00"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Address Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <MapPin className="mr-2 h-5 w-5" />
                Endereço
              </CardTitle>
              <CardDescription>Endereço completo do cliente</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <Label htmlFor="address_street">Logradouro *</Label>
                  <Input
                    id="address_street"
                    value={addressComponents.street}
                    onChange={(e) =>
                      handleAddressChange("street", e.target.value)
                    }
                    placeholder="Rua, Avenida, etc."
                    className={errors.address_street ? "border-red-500" : ""}
                  />
                  {errors.address_street && (
                    <p className="text-sm text-red-500 mt-1">
                      {errors.address_street}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="address_number">Número *</Label>
                  <Input
                    id="address_number"
                    value={addressComponents.number}
                    onChange={(e) =>
                      handleAddressChange("number", e.target.value)
                    }
                    placeholder="123"
                    className={errors.address_number ? "border-red-500" : ""}
                  />
                  {errors.address_number && (
                    <p className="text-sm text-red-500 mt-1">
                      {errors.address_number}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="address_complement">Complemento</Label>
                  <Input
                    id="address_complement"
                    value={addressComponents.complement}
                    onChange={(e) =>
                      handleAddressChange("complement", e.target.value)
                    }
                    placeholder="Apto, Bloco, etc. (opcional)"
                  />
                </div>

                <div>
                  <Label htmlFor="address_neighborhood">Bairro *</Label>
                  <Input
                    id="address_neighborhood"
                    value={addressComponents.neighborhood}
                    onChange={(e) =>
                      handleAddressChange("neighborhood", e.target.value)
                    }
                    placeholder="Nome do bairro"
                    className={
                      errors.address_neighborhood ? "border-red-500" : ""
                    }
                  />
                  {errors.address_neighborhood && (
                    <p className="text-sm text-red-500 mt-1">
                      {errors.address_neighborhood}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="address_city">Cidade *</Label>
                  <Input
                    id="address_city"
                    value={addressComponents.city}
                    onChange={(e) =>
                      handleAddressChange("city", e.target.value)
                    }
                    placeholder="Nome da cidade"
                    className={errors.address_city ? "border-red-500" : ""}
                  />
                  {errors.address_city && (
                    <p className="text-sm text-red-500 mt-1">
                      {errors.address_city}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="address_state">Estado *</Label>
                  <Input
                    id="address_state"
                    value={addressComponents.state}
                    onChange={(e) =>
                      handleAddressChange("state", e.target.value.toUpperCase())
                    }
                    placeholder="SP"
                    maxLength={2}
                    className={errors.address_state ? "border-red-500" : ""}
                  />
                  {errors.address_state && (
                    <p className="text-sm text-red-500 mt-1">
                      {errors.address_state}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="address_zip">CEP *</Label>
                  <Input
                    id="address_zip"
                    value={addressComponents.zip}
                    onChange={(e) =>
                      handleAddressChange("zip", formatZip(e.target.value))
                    }
                    placeholder="00000-000"
                    className={errors.address_zip ? "border-red-500" : ""}
                  />
                  {errors.address_zip && (
                    <p className="text-sm text-red-500 mt-1">
                      {errors.address_zip}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Referências Pessoais */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <User className="mr-2 h-5 w-5" />
                Referências Pessoais
              </CardTitle>
              <CardDescription>Pessoa de referência para contato</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="reference_name">Nome da Referência</Label>
                  <Input
                    id="reference_name"
                    value={clientData.reference_name || ""}
                    onChange={(e) =>
                      handleInputChange("reference_name", e.target.value)
                    }
                    placeholder="Nome completo da pessoa de referência"
                  />
                </div>

                <div>
                  <Label htmlFor="reference_phone">Telefone da Referência</Label>
                  <Input
                    id="reference_phone"
                    value={clientData.reference_phone || ""}
                    onChange={(e) =>
                      handleInputChange("reference_phone", formatPhone(e.target.value))
                    }
                    placeholder="(11) 99999-9999"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
                <div>
                  <Label htmlFor="reference_address">Endereço da Referência</Label>
                  <Input
                    id="reference_address"
                    value={clientData.reference_address || ""}
                    onChange={(e) =>
                      handleInputChange("reference_address", e.target.value)
                    }
                    placeholder="Endereço completo da pessoa de referência"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-between">
            <Button type="button" onClick={onBack} variant="outline" size="lg">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar
            </Button>

            <Button
              type="submit"
              disabled={submitting}
              className="bg-red-600 hover:bg-red-700 px-8"
              size="lg"
            >
              {submitting ? "Finalizando..." : "Finalizar Contrato"}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ClientRegistration;
