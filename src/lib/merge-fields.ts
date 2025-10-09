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
  };
  contract?: {
    value?: number;
    installments?: number;
    number?: string;
    date?: string;
    start_date?: string;
    end_date?: string;
    status?: string;
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
    content = content.replace(/{client_name}/g, data.client.full_name || '');
    content = content.replace(/{client_email}/g, data.client.email || '');
    content = content.replace(/{client_phone}/g, data.client.phone || '');
    content = content.replace(/{client_cpf}/g, data.client.cpf_cnpj || '');
    content = content.replace(/{client_address}/g, data.client.address || '');
    content = content.replace(/{client_city}/g, data.client.city || '');
    content = content.replace(/{client_state}/g, data.client.state || '');
    content = content.replace(/{client_zip}/g, data.client.zip_code || '');
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

