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
      
      // Atualizar URL baseada no ambiente automaticamente
      if (config.environment === 'sandbox') {
        this.baseUrl = 'https://sandbox.asaas.com/api/v3';
      } else {
        this.baseUrl = 'https://www.asaas.com/api/v3';
      }
      
      console.log('AsaasHttpClient configurado:', {
        environment: this.environment,
        baseUrl: this.baseUrl,
        apiKeyConfigured: !!this.apiKey
      });
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
    const url = `${this.baseUrl}${endpoint}`;
    
    const config: RequestInit = {
      ...options,
      headers: {
        ...this.getHeaders(),
        ...options.headers,
      },
    };

    console.log(`Asaas API Request: ${config.method || 'GET'} ${url}`);

    try {
      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        console.error('Asaas API Error:', {
          status: response.status,
          statusText: response.statusText,
          data: data,
        });
        throw new Error(`Asaas API Error: ${response.status} ${response.statusText}`);
      }

      console.log('Asaas API Response:', data);
      return data;
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
      // Asaas typically returns customer list if auth is valid
      try {
        await this.client.get('/customers?limit=1');
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
   * Create or update customer
   */
  async createCustomer(customerData: Partial<AsaasCustomer>): Promise<AsaasCustomer> {
    await this.updateConfig();
    
    try {
      const customer = await this.client.post<AsaasCustomer>('/customers', customerData);
      console.log('Customer created/updated successfully:', customer);
      return customer;
    } catch (error) {
      console.error('Error creating/updating customer:', error);
      throw error;
    }
  }

  /**
   * Get customer by ID or CPF/CNPJ
   */
  async getCustomer(identifier: string): Promise<AsaasCustomer | null> {
    await this.updateConfig();
    
    try {
      const customer = await this.client.get<AsaasCustomer | null>(`/customers?${identifier}`);
      return customer;
    } catch (error) {
      console.error('Error getting customer:', error);
      return null;
    }
  }

  /**
   * Update customer
   */
  async updateCustomer(customerId: string, customerData: Partial<AsaasCustomer>): Promise<AsaasCustomer> {
    await this.updateConfig();
    
    try {
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
