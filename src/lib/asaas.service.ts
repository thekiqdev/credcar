/**
 * AsaasService - Service for integration with Asaas API
 * Handles customer creation, invoices and payments
 */

interface AsaasConfig {
  apiKey: string;
  environment: 'sandbox' | 'production';
  baseUrl: string;
  webhookSecret: string;
  webhookUrl: string;
}

interface AsaasCustomer {
  id?: string;
  name: string;
  email: string;
  phone?: string;
  mobilePhone?: string;
  cpfCnpj: string;
  postalCode?: string;
  address?: string;
  addressNumber?: string;
  complement?: string;
  province?: string;
  city?: string;
  state?: string;
  country?: string;
  externalReference?: string;
  notificationDisabled?: boolean;
}

interface AsaasInvoice {
  id?: string;
  customer: string;
  billingType: 'BOLETO' | 'CREDIT_CARD' | 'PIX' | 'UNDEFINED';
  dueDate: string;
  value: number;
  description?: string;
  externalReference?: string;
  invoiceUrl?: string;
  bankSlipUrl?: string;
  pixTransaction?: string;
  pixQrCodeId?: string;
  status?: 'PENDING' | 'RECEIVED' | 'RECEIved_IN_CASH' | 'OVERDUE' | 'REFUNDED' | 'CONFIRMED';
}

interface AsaasWebhook {
  event: string;
  payment?: {
    id: string;
    status: string;
    value: number;
    dueDate: string;
    description?: string;
    externalReference?: string;
  };
  customer?: {
    id: string;
    name: string;
    email: string;
  };
}

interface AsaasApiResponse<T> {
  object: string;
  hasMore?: boolean;
  totalCount?: number;
  data?: T[];
  [key: string]: any;
}

interface AsaasError {
  errors: Array<{
    code: string;
    description: string;
  }>;
}

class AsaasService {
  private config: AsaasConfig;
  private baseUrl: string;

  constructor(config: AsaasConfig) {
    this.config = config;
    this.baseUrl = this.buildBaseUrl();
  }

  private buildBaseUrl(): string {
    if (this.config.baseUrl) {
      return this.config.baseUrl;
    }
    
    switch (this.config.environment) {
      case 'sandbox':
        return 'https://sandbox.asaas.com/api/v3';
      case 'production':
        return 'https://www.asaas.com/api/v3';
      default:
        return 'https://sandbox.asaas.com/api/v3';
    }
  }

  private async makeRequest<T>(
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
    data?: any
  ): Promise<T> {
    const url = `${this.baseUrl}/${endpoint}`;
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'access_token': this.config.apiKey,
    };

    const options: RequestInit = {
      method,
      headers,
    };

    if (data && method !== 'GET') {
      options.body = JSON.stringify(data);
    }

    try {
      console.log(`[AsaasService] ${method} ${url}`, data ? { data } : '');
      
      const response = await fetch(url, options);
      const jsonResponse = await response.json();

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${JSON.stringify(jsonResponse)}`);
      }

      console.log(`[AsaasService] Response:`, jsonResponse);
      return jsonResponse;
    } catch (error) {
      console.error(`[AsaasService] Error on ${method} ${url}:`, error);
      throw error;
    }
  }

  // CLIENT MANAGEMENT
  async createCustomer(customer: AsaasCustomer): Promise<AsaasCustomer> {
    return this.makeRequest<AsaasCustomer>('customers', 'POST', customer);
  }

  async getCustomer(customerId: string): Promise<AsaasCustomer> {
    return this.makeRequest<AsaasCustomer>(`customers/${customerId}`);
  }

  async updateCustomer(customerId: string, updateData: Partial<AsaasCustomer>): Promise<AsaasCustomer> {
    return this.makeRequest<AsaasCustomer>(`customers/${customerId}`, 'PUT', updateData);
  }

  async deleteCustomer(customerId: string): Promise<void> {
    await this.makeRequest(`customers/${customerId}`, 'DELETE');
  }

  async listCustomers(): Promise<AsaasApiResponse<AsaasCustomer>> {
    return this.makeRequest<AsaasApiResponse<AsaasCustomer>>('customers');
  }

  // INVOICE MANAGEMENT
  async createInvoice(invoice: AsaasInvoice): Promise<AsaasInvoice> {
    return this.makeRequest<AsaasInvoice>('payments', 'POST', invoice);
  }

  async getInvoice(invoiceId: string): Promise<AsaasInvoice> {
    return this.makeRequest<AsaasInvoice>(`payments/${invoiceId}`);
  }

  async updateInvoice(invoiceId: string, updateData: Partial<AsaasInvoice>): Promise<AsaasInvoice> {
    return this.makeRequest<AsaasInvoice>(`payments/${invoiceId}`, 'PUT', updateData);
  }

  async cancelInvoice(invoiceId: string): Promise<AsaasInvoice> {
    return this.makeRequest<AsaasInvoice>(`payments/${invoiceId}/refunding`, 'POST');
  }

  async listInvoices(): Promise<AsaasApiResponse<AsaasInvoice>> {
    return this.makeRequest<AsaasApiResponse<AsaasInvoice>>('payments');
  }

  // PIX MANAGEMENT
  async getPixQrCode(invoiceId: string): Promise<{ payload: string; qrCode: string }> {
    return this.makeRequest<{ payload: string; qrCode: string }>(`payments/${invoiceId}/pixQrCode`);
  }

  // WEBHOOK MANAGEMENT
  async createWebhook(): Promise<{ webhookUrl: string; webhookId: string }> {
    const webhookData = {
      url: this.config.webhookUrl,
      email: 'notifications@credcar.com.br',
      enabled: true,
      apiVersion: 3,
      events: [
        'PAYMENT_CREATED',
        'PAYMENT_PAYMENT_CASH',
        'PAYMENT_CONFIRMED',
        'PAYMENT_RECEIVED_IN_CASH',
        'PAYMENT_OVERDUE',
        'PAYMENT_DELETED',
        'PAYMENT_SUBSCRIPTION_RESTARTED',
        'PAYMENT_SUBSCRIPTION_CHARGEBACK',
        'PAYMENT_SUBSCRIPTION_CHARGEBACK_LOST',
        'PAYMENT_SUBSCRIPTION_CHARGEBACK_RECEIVED',
        'PAYMENT_SUBSCRIPTION_REFUNDED',
        'PAYMENT_SUBSCRIPTION_UPDATED',
        'PAYMENT_SUBSCRIPTION_UPDATED_STATUS',
        'PAYMENT_SUBSCRIPTION_WILL_UPDATE_STATUS',
        'PAYMENT_UPDATE_STATUS',
      ]
    };

    return this.makeRequest<{ webhookUrl: string; webhookId: string }>('webhooks', 'POST', webhookData);
  }

  // HEALTH CHECK / CONNECTION TEST
  async testConnection(): Promise<{ status: string; message: string; environment: string }> {
    try {
      // Tentar buscar uma lista básica para testar conexão
      const response = await this.makeRequest<AsaasApiResponse<any>>('customers?limit=1');
      
      return {
        status: 'success',
        message: 'Conexão com Asaas estabelecida com sucesso',
        environment: this.config.environment,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      
      return {
        status: 'error',
        message: `Falha na conexão: ${errorMessage}`,
        environment: this.config.environment,
      };
    }
  }

  // REPORTS AND ANALYTICS
  async getReports(startDate: string, endDate: string): Promise<any> {
    return this.makeRequest(`billings?startDate=${startDate}&endDate=${endDate}`);
  }

  // CONFIGURATION MANAGEMENT
  getConfig(): AsaasConfig {
    return { ...this.config };
  }

  updateConfig(newConfig: Partial<AsaasConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.baseUrl = this.buildBaseUrl();
  }

  getBaseUrl(): string {
    return this.baseUrl;
  }
}

// Factory function to create AsaasService instance
export function createAsaasService(config: AsaasConfig): AsaasService {
  return new AsaasService(config);
}

// Default export
export default AsaasService;

// Export all interfaces and types
export {
  AsaasConfig,
  AsaasCustomer,
  AsaasInvoice,
  AsaasWebhook,
  AsaasApiResponse,
  AsaasError,
};
