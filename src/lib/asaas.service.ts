/**
 * AsaasService - Service for integrating with Asaas payment gateway
 * Handles API communication, customer management, and payment processing
 */

import { systemConfigService } from './system-config.service';

// Type definitions for Asaas API
export interface AsaasCustomer {
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
  externalReference?: string;
  notificationDisabled?: boolean;
  additionalEmails?: string;
}

export interface AsaasPaymentLink {
  id: string;
  url: string;
  billingType: string;
  dueDate: string;
  value: number;
  description: string;
  customer: string;
  status: string;
  pixTransaction?: {
    qrCode: string;
    payload: string;
    copyAndPaste: string;
  };
  bankSlipUrl?: string;
}

export interface AsaasInvoice {
  id: string;
  customer: string;
  paymentLink: string;
  dueDate: string;
  value: number;
  description: string;
  status: string;
  billingType: string;
  pixTransaction?: {
    qrCode: string;
    payload: string;
    copyAndPaste: string;
  };
  bankSlipUrl?: string;
}

export interface AsaasPayment {
  id: string;
  customer: string;
  paymentLink: string;
  dueDate: string;
  value: number;
  description: string;
  status: string;
  billingType: string;
  paymentDate?: string;
  originalDueDate: string;
  clientPaymentDate?: string;
  installmentNumber?: number;
  invoiceUrl?: string;
  bankSlipUrl?: string;
  invoiceNumber?: string;
  discount?: {
    value: number;
    dueDateLimitDays: number;
    type: string;
  };
  fine?: {
    value: number;
    type: string;
  };
  interest?: {
    value: number;
    type: string;
  };
}

export interface AsaasConfig {
  apiKey: string;
  environment: 'sandbox' | 'production';
  baseUrl: string;
  webhookSecret: string;
  webhookUrl: string;
}

// HTTP Client class
class AsaasHttpClient {
  private apiKey: string = '';
  private baseUrl: string = 'https://www.asaas.com/api/v3';
  private environment: 'sandbox' | 'production' = 'sandbox';

  constructor() {
    this.updateConfig();
  }

  async updateConfig(): Promise<void> {
    try {
      const config = await systemConfigService.getAsaasConfig();
      this.apiKey = config.apiKey;
      this.environment = config.environment;
      
      // Automatically set base URL based on environment
      if (this.environment === 'sandbox') {
        this.baseUrl = 'https://sandbox.asaas.com/api/v3';
      } else {
        this.baseUrl = 'https://www.asaas.com/api/v3';
      }
      
      console.log(`AsaasHttpClient updated: Environment=${this.environment}, BaseUrl=${this.baseUrl}`);
    } catch (error) {
      console.error('Error updating AsaasHttpClient config:', error);
    }
  }

  private getHeaders(): HeadersInit {
    return {
      'access_token': this.apiKey,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
  }

  async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    // Usar proxy local para evitar CORS - detectar ambiente baseado no hostname
    const hostname = window.location.hostname;
    const proxyUrl = hostname === 'localhost' || hostname === '127.0.0.1' 
      ? 'http://localhost:3001/api/proxy/asaas'
      : `${window.location.protocol}//${hostname}/api/proxy/asaas`;
    
    console.log(`AsaasHttpClient request: hostname=${hostname}, proxyUrl=${proxyUrl}`);
    
    try {
      const response = await fetch(proxyUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: endpoint.startsWith('/') ? endpoint.slice(1) : endpoint,
          key: this.apiKey,
          env: this.environment,
          method: options.method || 'GET',
          body: options.body ? JSON.parse(options.body as string) : undefined
        }),
      });

      const proxyResult = await response.json();

      if (!proxyResult.ok) {
        console.error('Asaas API Error:', {
          status: proxyResult.status,
          statusText: proxyResult.statusText,
          data: proxyResult.data,
        });
        
        // Extract error message from ASAAS response
        let errorMessage = `${proxyResult.status} ${proxyResult.statusText}`;
        if (proxyResult.data && proxyResult.data.errors && proxyResult.data.errors.length > 0) {
          errorMessage = proxyResult.data.errors[0].description;
        }
        
        throw new Error(errorMessage);
      }

      console.log('Asaas API Proxy Response:', proxyResult.data);
      return proxyResult.data;
    } catch (error) {
      console.error('Asaas HTTP Request Error:', error);
      throw error;
    }
  }

  async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  async post<T>(endpoint: string, data: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async put<T>(endpoint: string, data: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }
}

// Main AsaasService class
class AsaasService {
  private client: AsaasHttpClient;

  constructor() {
    this.client = new AsaasHttpClient();
  }

  /**
   * Update configuration from database
   */
  async updateConfig(): Promise<void> {
    await this.client.updateConfig();
  }

  /**
   * Test connection to Asaas API
   */
  async testConnection(): Promise<{
    success: boolean;
    message: string;
    environment: string;
    apiKeyConfigured: boolean;
  }> {
    try {
      await this.updateConfig();
      
      const config = await systemConfigService.getAsaasConfig();
      
      if (!config.apiKey) {
        return {
          success: false,
          message: 'API Key não configurada',
          environment: config.environment,
          apiKeyConfigured: false,
        };
      }

      // Try to fetch resource to test connection
      // Use a simple endpoint that doesn't expect data
      try {
        // Test with 'myAccount' endpoint which is perfect for authentication test
        await this.client.get('/myAccount');
        return {
          success: true,
          message: 'Conexão com Asaas bem-sucedida',
          environment: config.environment,
          apiKeyConfigured: true,
        };
      } catch (error: any) {
        if (error.message.includes('401') || error.message.includes('403')) {
          return {
            success: false,
            message: 'API Key inválida ou sem permissão',
            environment: config.environment,
            apiKeyConfigured: true,
          };
        }
        throw error;
      }
    } catch (error) {
      console.error('Error testing Asaas connection:', error);
      return {
        success: false,
        message: `Erro de conexão: ${error.message}`,
        environment: 'unknown',
        apiKeyConfigured: false,
      };
    }
  }

  /**
   * Create new customer in ASAAS
   */
  async createCustomer(customerData: {
    name: string;
    email: string;
    cpfCnpj: string;
    phone?: string;
    mobilePhone?: string;
    postalCode?: string;
    address?: string;
    addressNumber?: string;
    complement?: string;
    province?: string;
    city?: string;
    state?: string;
    externalReference?: string;
  }): Promise<AsaasCustomer> {
    await this.updateConfig();
    
    try {
      console.log('Creating customer in ASAAS:', customerData);
      
      // Validate required fields
      if (!customerData.name || !customerData.email || !customerData.cpfCnpj) {
        throw new Error('Nome, email e CPF/CNPJ são obrigatórios');
      }

      const customer = await this.client.post<AsaasCustomer>('/customers', customerData);
      console.log('Customer created successfully:', customer);
      return customer;
    } catch (error) {
      console.error('Error creating customer:', error);
      throw error;
    }
  }

  /**
   * Find customer by CPF/CNPJ
   */
  async findCustomerByCpfCnpj(cpfCnpj: string): Promise<AsaasCustomer | null> {
    await this.updateConfig();
    
    try {
      console.log('Searching customer by CPF/CNPJ:', cpfCnpj);
      
      // Remove any non-numeric characters from CPF/CNPJ
      const cleanCpfCnpj = cpfCnpj.replace(/\D/g, '');
      
      const customers = await this.client.get<{ data: AsaasCustomer[] }>(`/customers?cpfCnpj=${cleanCpfCnpj}`);
      
      if (customers?.data && customers.data.length > 0) {
        console.log('Customer found:', customers.data[0]);
        return customers.data[0];
      }
      
      console.log('No customer found with CPF/CNPJ:', cleanCpfCnpj);
      return null;
    } catch (error) {
      console.error('Error searching customer:', error);
      return null;
    }
  }

  /**
   * Update existing customer
   */
  async updateCustomer(customerId: string, customerData: Partial<AsaasCustomer>): Promise<AsaasCustomer> {
    await this.updateConfig();
    
    try {
      console.log('Updating customer:', customerId, customerData);
      
      const customer = await this.client.put<AsaasCustomer>(`/customers/${customerId}`, customerData);
      console.log('Customer updated successfully:', customer);
      return customer;
    } catch (error) {
      console.error('Error updating customer:', error);
      throw error;
    }
  }

  /**
   * Delete customer
   */
  async deleteCustomer(customerId: string): Promise<boolean> {
    await this.updateConfig();
    
    try {
      console.log('Deleting customer:', customerId);
      
      await this.client.delete(`/customers/${customerId}`);
      console.log('Customer deleted successfully');
      return true;
    } catch (error) {
      console.error('Error deleting customer:', error);
      throw error;
    }
  }

  /**
   * Get customer by ID
   */
  async getCustomerById(customerId: string): Promise<AsaasCustomer | null> {
    await this.updateConfig();
    
    try {
      console.log('Getting customer by ID:', customerId);
      
      const customer = await this.client.get<AsaasCustomer>(`/customers/${customerId}`);
      console.log('Customer retrieved:', customer);
      return customer;
    } catch (error) {
      console.error('Error getting customer by ID:', error);
      return null;
    }
  }

  /**
   * Create customer or return existing one if-found by CPF/CNPJ
   */
  async createOrFindCustomer(customerData: {
    name: string;
    email: string;
    cpfCnpj: string;
    phone?: string;
    mobilePhone?: string;
    postalCode?: string;
    address?: string;
    addressNumber?: string;
    complement?: string;
    province?: string;
    city?: string;
    state?: string;
    externalReference?: string;
  }): Promise<AsaasCustomer> {
    try {
      // First, try to find existing customer
      const existingCustomer = await this.findCustomerByCpfCnpj(customerData.cpfCnpj);
      
      if (existingCustomer) {
        console.log('Customer already exists, returning existing:', existingCustomer.id);
        return existingCustomer;
      }
      
      // If not found, create new customer
      console.log('Customer not found, creating new one...');
      const newCustomer = await this.createCustomer(customerData);
      return newCustomer;
      
    } catch (error) {
      console.error('Error in createOrFindCustomer:', error);
      throw error;
    }
  }

  /**
   * Sync local client with ASAAS customer
   * Creates ASAAS customer if needed and updates local database
   */
  async syncClientWithAsaas(localClient: {
    id: string;
    full_name: string;
    email: string;
    phone: string;
    cpf_cnpj: string;
    address?: string;
  }): Promise<{
    success: boolean;
    asaasCustomer?: AsaasCustomer;
    error?: string;
  }> {
    try {
      console.log('🔄 Sincronizando cliente local com ASAAS:', localClient.id);

      // Prepare client data for ASAAS
      const asaasCustomerData = {
        name: localClient.full_name,
        email: localClient.email,
        cpfCnpj: localClient.cpf_cnpj,
        phone: localClient.phone || undefined,
        address: localClient.address || undefined,
        externalReference: `credcar-client-${localClient.id}`
      };

      // Create or find customer in ASAAS
      const asaasCustomer = await this.createOrFindCustomer(asaasCustomerData);
      
      console.log('✅ Cliente sincron successfully:', {
        localId: localClient.id,
        asaasId: asaasCustomer.id,
        name: asaasCustomer.name
      });

      return {
        success: true,
        asaasCustomer
      };

    } catch (error) {
      console.error('❌ Error syncing client with ASAAS:', error);
      return {
        success: false,
        error: error.message || 'Unknown error during sync'
      };
    }
  }

  /**
   * Delete customer
   */
  async deleteCustomer(customerId: string): Promise<boolean> {
    await this.updateConfig();
    
    try {
      await this.client.delete(`/customers/${customerId}`);
      console.log('Customer deleted successfully');
      return true;
    } catch (error) {
      console.error('Error deleting customer:', error);
      return false;
    }
  }

  /**
   * Create payment link
   */
  async createPaymentLink(paymentData: {
    customer: string;
    billingType: 'PIX' | 'BOLETO' | 'CREDIT_CARD';
    dueDate: string;
    value: number;
    description: string;
    externalReference?: string;
  }): Promise<AsaasPaymentLink> {
    await this.updateConfig();
    
    try {
      const paymentLink = await this.client.post<AsaasPaymentLink>('/payments', paymentData);
      console.log('Payment link created successfully:', paymentLink);
      return paymentLink;
    } catch (error) {
      console.error('Error creating payment link:', error);
      throw error;
    }
  }

  /**
   * Create invoice with multiple installments
   */
  async createInvoice(invoiceData: {
    customer: string;
    billingType: 'PIX' | 'BOLETO';
    dueDate: string;
    value: number;
    description: string;
    installments?: number;
    installmentValue?: number;
    externalReference?: string;
  }): Promise<AsaasInvoice[]> {
    await this.updateConfig();
    
    try {
      if (invoiceData.installments && invoiceData.installments > 1) {
        // Create multiple installments
        const invoices: AsaasInvoice[] = [];
        
        for (let i = 1; i <= invoiceData.installments; i++) {
          const dueDate = new Date(invoiceData.dueDate);
          dueDate.setMonth(dueDate.getMonth() + (i - 1));
          
          const installmentData = {
            ...invoiceData,
            installmentNumber: i,
            installmentValue: invoiceData.installmentValue || (invoiceData.value / invoiceData.installments),
            dueDate: dueDate.toISOString().split('T')[0],
            description: `${invoiceData.description} - Parcela ${i}/${invoiceData.installments}`,
          };
          
          const invoice = await this.client.post<AsaasInvoice>('/payments', installmentData);
          invoices.push(invoice);
        }
        
        console.log(`Created ${invoices.length} installments successfully`);
        return invoices;
      } else {
        // Create single payment
        const invoice = await this.client.post<AsaasInvoice>('/payments', invoiceData);
        console.log('Single invoice created successfully:', invoice);
        return [invoice];
      }
    } catch (error) {
      console.error('Error creating invoice:', error);
      throw error;
    }
  }

  /**
   * Get payment by ID
   */
  async getPayment(paymentId: string): Promise<AsaasPayment | null> {
    await this.updateConfig();
    
    try {
      const payment = await this.client.get<AsaasPayment>(`/payments/${paymentId}`);
      return payment;
    } catch (error) {
      console.error('Error getting payment:', error);
      return null;
    }
  }

  /**
   * Get payments by customer
   */
  async getCustomerPayments(customerId: string): Promise<AsaasPayment[]> {
    await this.updateConfig();
    
    try {
      const payments = await this.client.get<{ data: AsaasPayment[] }>(`/payments?customerId=${customerId}&limit=100`);
      return payments.data || [];
    } catch (error) {
      console.error('Error getting customer payments:', error);
      return [];
    }
  }

  /**
   * Update payment
   */
  async updatePayment(paymentId: string, paymentData: Partial<AsaasPayment>): Promise<AsaasPayment> {
    await this.updateConfig();
    
    try {
      const payment = await this.client.put<AsaasPayment>(`/payments/${paymentId}`, paymentData);
      console.log('Payment updated successfully:', payment);
      return payment;
    } catch (error) {
      console.error('Error updating payment:', error);
      throw error;
    }
  }

  /**
   * Delete payment
   */
  async deletePayment(paymentId: string): Promise<boolean> {
    await this.updateConfig();
    
    try {
      await this.client.delete(`/payments/${paymentId}`);
      console.log('Payment deleted successfully');
      return true;
    } catch (error) {
      console.error('Error deleting payment:', error);
      return false;
    }
  }

  /**
   * Process webhook notification
   */
  async processWebhook(webhookData: any, signature: string): Promise<boolean> {
    try {
      // TODO: Implement webhook signature validation
      // For now, just log the webhook data
      console.log('Webhook received:', webhookData);
      
      // Here you would validate the signature using the webhook secret
      // and process the notification (payment confirmation, etc.)
      
      return true;
    } catch (error) {
      console.error('Error processing webhook:', error);
      return false;
    }
  }
}

// Export singleton instance
export const asaasService = new AsaasService();

// Default export
export default asaasService;
