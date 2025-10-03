/**
 * AsaasIntegrationService - Service to integrate Asaas with our system
 * Connects AsaasService with SystemConfigService for seamless configuration management
 */

import { systemConfigService } from './system-config.service';
import { createAsaasClient, AsaasClient } from './asaas-client';
import { AsaasConfig, AsaasCustomer, AsaasInvoice } from './asaas.service';

interface IntegrationStatus {
  isConfigured: boolean;
  apiKeyPresent: boolean;
  webhookUrlPresent: boolean;
  environment: 'sandbox' | 'production';
  lastTestResult?: {
    status: string;
    message: string;
    timestamp: Date;
  };
}

class AsaasIntegrationService {
  private client: AsaasClient | null = null;
  private lastConfig: AsaasConfig | null = null;

  /**
   * Initialize the service with current configuration
   */
  async initialize(): Promise<IntegrationStatus> {
    try {
      console.log('[AsaasIntegrationService] Initializing...');
      
      const config = await systemConfigService.getAsaasConfig();
      this.lastConfig = config;
      
      // Create client with current configuration
      this.client = createAsaasClient(config, {
        timeout: 30000,
        retryAttempts: 3,
        enableLogging: true,
      });

      const status: IntegrationStatus = {
        isConfigured: !!config.apiKey,
        apiKeyPresent: !!config.apiKey,
        webhookUrlPresent: !!config.webhookUrl,
        environment: config.environment,
      };

      console.log('[AsaasIntegrationService] Initialized successfully', status);
      return status;
    } catch (error) {
      console.error('[AsaasIntegrationService] Initialization failed:', error);
      return {
        isConfigured: false,
        apiKeyPresent: false,
        webhookUrlPresent: false,
        environment: 'sandbox',
      };
    }
  }

  /**
   * Test connection to Asaas API
   */
  async testConnection(): Promise<IntegrationStatus['lastTestResult']> {
    if (!this.client) {
      await this.initialize();
    }

    if (!this.client) {
      return {
        status: 'error',
        message: 'Cliente Asaas não inicializado',
        timestamp: new Date(),
      };
    }

    try {
      const result = await this.client.testConnection();
      
      const testResult = {
        status: result.status,
        message: result.message,
        timestamp: new Date(),
      };

      // Update status in memory
      console.log('[AsaasIntegrationService] Connection test completed:', testResult);
      return testResult;
    } catch (error) {
      console.error('[AsaasIntegrationService] Connection test failed:', error);
      
      return {
        status: 'error',
        message: `Erro na conexão: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
        timestamp: new Date(),
      };
    }
  }

  /**
   * Create customer in Asaas
   */
  async createCustomer(customerData: {
    name: string;
    email: string;
    phone?: string;
    cpfCnpj: string;
    address?: string;
    city?: string;
    state?: string;
    postalCode?: string;
  }): Promise<AsaasCustomer> {
    if (!this.client) {
      await this.initialize();
    }

    if (!this.client) {
      throw new Error('Cliente Asaas não inicializado');
    }

    // Map our customer data to Asaas format
    const asaasCustomer: Partial<AsaasCustomer> = {
      name: customerData.name,
      email: customerData.email,
      cpfCnpj: customerData.cpfCnpj.replace(/\D/g, ''), // Remove formatting
      externalReference: `credcar_${Date.now()}`,
      notificationDisabled: false,
    };

    // Add optional fields if provided
    if (customerData.phone) {
      asaasCustomer.mobilePhone = customerData.phone;
    }
    if (customerData.address) {
      asaasCustomer.address = customerData.address;
    }
    if (customerData.city) {
      asaasCustomer.city = customerData.city;
    }
    if (customerData.state) {
      asaasCustomer.state = customerData.state;
    }
    if (customerData.postalCode) {
      asaasCustomer.postalCode = customerData.postalCode.replace(/\D/g, '');
    }

    console.log('[AsaasIntegrationService] Creating customer:', asaasCustomer);
    return await this.client.createCustomer(asaasCustomer);
  }

  /**
   * Create invoice/payment in Asaas
   */
  async createInvoice(invoiceData: {
    customerId: string;
    amount: number;
    dueDate: string;
    description?: string;
    paymentMethod: 'PIX' | 'BOLETO' | 'CREDIT_CARD';
    externalReference?: string;
  }): Promise<AsaasInvoice> {
    if (!this.client) {
      await this.initialize();
    }

    if (!this.client) {
      throw new Error('Cliente Asaas não inicializado');
    }

    // Get payment configuration
    const paymentConfig = await systemConfigService.getPaymentConfig();

    // Map our invoice data to Asaas format
    const asaasInvoice: Partial<AsaasInvoice> = {
      customer: invoiceData.customerId,
      billingType: invoiceData.paymentMethod,
      dueDate: invoiceData.dueDate,
      value: invoiceData.amount,
      description: invoiceData.description || `Fatura CredCar - ${invoiceData.externalReference}`,
      externalReference: invoiceData.externalReference || `invoice_${Date.now()}`,
    };

    console.log('[AsaasIntegrationService] Creating invoice:', asaasInvoice);
    return await this.client.createInvoice(asaasInvoice);
  }

  /**
   * Get PIX QR Code for payment
   */
  async getPixQrCode(invoiceId: string): Promise<{ payload: string; qrCode: string }> {
    if (!this.client) {
      await this.initialize();
    }

    if (!this.client) {
      throw new Error('Cliente Asaas não inicializado');
    }

    return await this.client.getPixQrCode(invoiceId);
  }

  /**
   * Get invoice status
   */
  async getInvoiceStatus(invoiceId: string): Promise<AsaasInvoice> {
    if (!this.client) {
      await this.initialize();
    }

    if (!this.client) {
      throw new Error('Cliente Asaas não inicializado');
    }

    return await this.client.getInvoice(invoiceId);
  }

  /**
   * Setup webhook for payment notifications
   */
  async setupWebhook(): Promise<{ webhookUrl: string; webhookId: string }> {
    if (!this.client) {
      await this.initialize();
    }

    if (!this.client) {
      throw new Error('Cliente Asaas não inicializado');
    }

    // Get webhook configuration
    const config = await systemConfigService.getAsaasConfig();
    
    if (!config.webhookUrl) {
      throw new Error('Webhook URL não configurada no sistema');
    }

    return await this.client.createWebhook();
  }

  /**
   * Get current configuration status
   */
  async getStatus(): Promise<IntegrationStatus> {
    try {
      const config = await systemConfigService.getAsaasConfig();
      
      const status: IntegrationStatus = {
        isConfigured: !!(config.apiKey && config.webhookUrl),
        apiKeyPresent: !!config.apiKey,
        webhookUrlPresent: !!config.webhookUrl,
        environment: config.environment,
      };

      return status;
    } catch (error) {
      console.error('[AsaasIntegrationService] Error getting status:', error);
      return {
        isConfigured: false,
        apiKeyPresent: false,
        webhookUrlPresent: false,
        environment: 'sandbox',
      };
    }
  }

  /**
   * Get request statistics and logs
   */
  getRequestLogs() {
    if (!this.client) {
      return [];
    }
    
    return this.client.getRequestLogs();
  }

  /**
   * Get performance statistics
   */
  getStatistics() {
    if (!this.client) {
      return {
        totalRequests: 0,
        avgResponseTime: 0,
        errorRate: 0,
        last24Hours: 0,
      };
    }
    
    return this.client.getStatistics();
  }

  /**
   * Clear request logs
   */
  clearLogs(): void {
    if (this.client) {
      this.client.clearLogs();
    }
  }
}

// Export singleton instance
export const asaasIntegrationService = new AsaasIntegrationService();

// Export the class for direct instantiation if needed
export default AsaasIntegrationService;
