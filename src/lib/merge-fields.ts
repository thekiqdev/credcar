export interface MergeData {
  client?: {
    full_name?: string;
    email?: string;
    phone?: string;
    cpf_cnpj?: string;
    address?: string;
    city?: string;
    state?: string;
    zip_code?: string;
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
    // Campos separados do endereço
    address_street?: string;
    address_number?: string;
    address_complement?: string;
    address_neighborhood?: string;
    address_city?: string;
    address_state?: string;
    address_zip?: string;
  };
  contract?: {
    value?: number;
    installments?: number;
    number?: string;
    date?: string;
    start_date?: string;
    end_date?: string;
    status?: string;
    // Novos campos de parcelas e grupo
    first_installment_value?: number;
    remaining_installments_value?: number;
    custom_installments?: string; // String formatada com as parcelas personalizadas
    group_name?: string;
  };
  representative?: {
    name?: string;
    email?: string;
    phone?: string;
  };
}

export interface MergeField {
  category: string;
  fields: {
    placeholder: string;
    label: string;
    example: string;
    description?: string;
  }[];
}

export const MERGE_FIELDS: MergeField[] = [
  {
    category: "Cliente",
    fields: [
      { 
        placeholder: "{client_name}", 
        label: "Nome Completo", 
        example: "João da Silva Santos",
        description: "Nome completo do cliente"
      },
      { 
        placeholder: "{client_email}", 
        label: "E-mail", 
        example: "joao.silva@email.com",
        description: "Endereço de e-mail do cliente"
      },
      { 
        placeholder: "{client_phone}", 
        label: "Telefone", 
        example: "(11) 98765-4321",
        description: "Número de telefone do cliente"
      },
      { 
        placeholder: "{client_cpf}", 
        label: "CPF/CNPJ", 
        example: "123.456.789-00",
        description: "CPF ou CNPJ do cliente"
      },
      { 
        placeholder: "{client_address}", 
        label: "Endereço Completo", 
        example: "Rua das Flores, 123",
        description: "Endereço residencial completo"
      },
      { 
        placeholder: "{client_city}", 
        label: "Cidade", 
        example: "São Paulo",
        description: "Cidade do cliente"
      },
      { 
        placeholder: "{client_state}", 
        label: "Estado", 
        example: "SP",
        description: "Estado (UF) do cliente"
      },
      { 
        placeholder: "{client_zip}", 
        label: "CEP", 
        example: "01234-567",
        description: "CEP do endereço"
      },
      // Novos campos de identificação
      { 
        placeholder: "{client_rg}", 
        label: "RG", 
        example: "12.345.678-9",
        description: "Registro Geral do cliente"
      },
      { 
        placeholder: "{client_birth_date}", 
        label: "Data de Nascimento", 
        example: "15/03/1985",
        description: "Data de nascimento do cliente"
      },
      { 
        placeholder: "{client_nationality}", 
        label: "Nacionalidade", 
        example: "Brasileira",
        description: "Nacionalidade do cliente"
      },
      { 
        placeholder: "{client_marital_status}", 
        label: "Estado Civil", 
        example: "Casado",
        description: "Estado civil do cliente"
      },
      { 
        placeholder: "{client_spouse_name}", 
        label: "Nome do Cônjuge", 
        example: "Maria da Silva Santos",
        description: "Nome completo do cônjuge"
      },
      { 
        placeholder: "{client_spouse_phone}", 
        label: "Telefone do Cônjuge", 
        example: "(11) 98765-4321",
        description: "Telefone de contato do cônjuge"
      },
      // Novos campos profissionais
      { 
        placeholder: "{client_company}", 
        label: "Empresa", 
        example: "Empresa ABC Ltda",
        description: "Empresa onde o cliente trabalha"
      },
      { 
        placeholder: "{client_position}", 
        label: "Cargo", 
        example: "Gerente de Vendas",
        description: "Cargo ou função do cliente"
      },
      { 
        placeholder: "{client_salary}", 
        label: "Salário", 
        example: "R$ 5.000,00",
        description: "Salário do cliente"
      },
      // Novos campos de referências pessoais
      { 
        placeholder: "{client_reference_name}", 
        label: "Nome da Referência", 
        example: "José da Silva",
        description: "Nome da pessoa de referência"
      },
      { 
        placeholder: "{client_reference_phone}", 
        label: "Telefone da Referência", 
        example: "(11) 91234-5678",
        description: "Telefone da pessoa de referência"
      },
      { 
        placeholder: "{client_reference_address}", 
        label: "Endereço da Referência", 
        example: "Rua das Palmeiras, 456",
        description: "Endereço da pessoa de referência"
      },
      // Campos separados do endereço
      { 
        placeholder: "{client_address_street}", 
        label: "Logradouro", 
        example: "Rua das Flores",
        description: "Nome da rua, avenida, etc."
      },
      { 
        placeholder: "{client_address_number}", 
        label: "Número", 
        example: "123",
        description: "Número do endereço"
      },
      { 
        placeholder: "{client_address_complement}", 
        label: "Complemento", 
        example: "Apto 45",
        description: "Complemento do endereço (opcional)"
      },
      { 
        placeholder: "{client_address_neighborhood}", 
        label: "Bairro", 
        example: "Centro",
        description: "Bairro do endereço"
      },
      { 
        placeholder: "{client_address_city}", 
        label: "Cidade do Endereço", 
        example: "São Paulo",
        description: "Cidade do endereço"
      },
      { 
        placeholder: "{client_address_state}", 
        label: "Estado do Endereço", 
        example: "SP",
        description: "Estado do endereço"
      },
      { 
        placeholder: "{client_address_zip}", 
        label: "CEP do Endereço", 
        example: "01234-567",
        description: "CEP do endereço"
      },
    ]
  },
  {
    category: "Contrato",
    fields: [
      { 
        placeholder: "{contract_value}", 
        label: "Valor do Crédito", 
        example: "R$ 20.000,00",
        description: "Valor total do crédito contratado"
      },
      { 
        placeholder: "{contract_installments}", 
        label: "Número de Parcelas", 
        example: "80",
        description: "Quantidade de parcelas"
      },
      { 
        placeholder: "{contract_number}", 
        label: "Número do Contrato", 
        example: "CONT-2025-001234",
        description: "Identificador único do contrato"
      },
      { 
        placeholder: "{contract_date}", 
        label: "Data do Contrato", 
        example: "09/10/2025",
        description: "Data de criação do contrato"
      },
      { 
        placeholder: "{contract_status}", 
        label: "Status do Contrato", 
        example: "Ativo",
        description: "Status atual do contrato"
      },
      { 
        placeholder: "{contract_first_installment}", 
        label: "Valor da Primeira Parcela", 
        example: "R$ 883,00",
        description: "Valor da primeira parcela do contrato"
      },
      { 
        placeholder: "{contract_remaining_installments}", 
        label: "Valor das Parcelas Restantes", 
        example: "R$ 350,00",
        description: "Valor das parcelas restantes (padrão)"
      },
      { 
        placeholder: "{contract_custom_installments}", 
        label: "Parcelas Personalizadas", 
        example: "2ª: R$ 883,00 | 3ª: R$ 883,00",
        description: "Lista formatada das parcelas com valores personalizados"
      },
      { 
        placeholder: "{group_name}", 
        label: "Nome do Grupo", 
        example: "Grupo ABC - Consórcio Imobiliário",
        description: "Nome do grupo de consórcio"
      },
    ]
  },
  {
    category: "Representante",
    fields: [
      { 
        placeholder: "{rep_name}", 
        label: "Nome do Representante", 
        example: "Maria Santos Silva",
        description: "Nome do representante responsável"
      },
      { 
        placeholder: "{rep_email}", 
        label: "E-mail do Representante", 
        example: "maria.santos@credcar.com",
        description: "E-mail de contato do representante"
      },
      { 
        placeholder: "{rep_phone}", 
        label: "Telefone do Representante", 
        example: "(11) 91234-5678",
        description: "Telefone de contato do representante"
      },
    ]
  },
  {
    category: "Sistema",
    fields: [
      { 
        placeholder: "{today}", 
        label: "Data Atual", 
        example: "09/10/2025",
        description: "Data atual do sistema"
      },
      { 
        placeholder: "{current_time}", 
        label: "Hora Atual", 
        example: "14:30",
        description: "Hora atual do sistema"
      },
    ]
  }
];

/**
 * Substitui placeholders em um template pelos dados reais
 * @param template - Template com placeholders (ex: {client_name})
 * @param data - Dados para substituir os placeholders
 * @returns Template com placeholders substituídos
 */
export function mergePlaceholders(template: string, data: MergeData): string {
  let content = template;
  
  // Cliente
  if (data.client) {
    // Campos básicos
    content = content.replace(/{client_name}/g, data.client.full_name || '');
    content = content.replace(/{client_email}/g, data.client.email || '');
    content = content.replace(/{client_phone}/g, data.client.phone || '');
    content = content.replace(/{client_cpf}/g, data.client.cpf_cnpj || '');
    content = content.replace(/{client_address}/g, data.client.address || '');
    content = content.replace(/{client_city}/g, data.client.city || '');
    content = content.replace(/{client_state}/g, data.client.state || '');
    content = content.replace(/{client_zip}/g, data.client.zip_code || '');
    
    // Novos campos de identificação
    content = content.replace(/{client_rg}/g, data.client.rg || '');
    content = content.replace(/{client_birth_date}/g, data.client.birth_date || '');
    content = content.replace(/{client_nationality}/g, data.client.nationality || '');
    content = content.replace(/{client_marital_status}/g, data.client.marital_status || '');
    content = content.replace(/{client_spouse_name}/g, data.client.spouse_name || '');
    content = content.replace(/{client_spouse_phone}/g, data.client.spouse_phone || '');
    
    // Novos campos profissionais
    content = content.replace(/{client_company}/g, data.client.company || '');
    content = content.replace(/{client_position}/g, data.client.position || '');
    content = content.replace(/{client_salary}/g, data.client.salary || '');
    
    // Novos campos de referências pessoais
    content = content.replace(/{client_reference_name}/g, data.client.reference_name || '');
    content = content.replace(/{client_reference_phone}/g, data.client.reference_phone || '');
    content = content.replace(/{client_reference_address}/g, data.client.reference_address || '');
    
    // Campos separados do endereço
    content = content.replace(/{client_address_street}/g, data.client.address_street || '');
    content = content.replace(/{client_address_number}/g, data.client.address_number || '');
    content = content.replace(/{client_address_complement}/g, data.client.address_complement || '');
    content = content.replace(/{client_address_neighborhood}/g, data.client.address_neighborhood || '');
    content = content.replace(/{client_address_city}/g, data.client.address_city || '');
    content = content.replace(/{client_address_state}/g, data.client.address_state || '');
    content = content.replace(/{client_address_zip}/g, data.client.address_zip || '');
  }
  
  // Contrato
  if (data.contract) {
    // Formatar valor monetário
    const formattedValue = data.contract.value 
      ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(data.contract.value)
      : '';
    content = content.replace(/{contract_value}/g, formattedValue);
    content = content.replace(/{contract_installments}/g, data.contract.installments?.toString() || '');
    content = content.replace(/{contract_number}/g, data.contract.number || '');
    content = content.replace(/{contract_date}/g, data.contract.date || '');
    content = content.replace(/{contract_status}/g, data.contract.status || '');
    
    // Novos campos de parcelas e grupo
    const formattedFirstInstallment = data.contract.first_installment_value 
      ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(data.contract.first_installment_value)
      : '';
    content = content.replace(/{contract_first_installment}/g, formattedFirstInstallment);
    
    const formattedRemainingInstallments = data.contract.remaining_installments_value 
      ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(data.contract.remaining_installments_value)
      : '';
    content = content.replace(/{contract_remaining_installments}/g, formattedRemainingInstallments);
    
    content = content.replace(/{contract_custom_installments}/g, data.contract.custom_installments || '');
    content = content.replace(/{group_name}/g, data.contract.group_name || '');
  }
  
  // Representante
  if (data.representative) {
    content = content.replace(/{rep_name}/g, data.representative.name || '');
    content = content.replace(/{rep_email}/g, data.representative.email || '');
    content = content.replace(/{rep_phone}/g, data.representative.phone || '');
  }
  
  // Sistema - valores dinâmicos
  const today = new Date().toLocaleDateString('pt-BR');
  const currentTime = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  content = content.replace(/{today}/g, today);
  content = content.replace(/{current_time}/g, currentTime);
  
  return content;
}

